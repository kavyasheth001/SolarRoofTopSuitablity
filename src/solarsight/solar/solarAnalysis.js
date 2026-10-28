// Rooftop sunlight analysis on plain GeoJSON (no ArcGIS geometryEngine).
// Same model as the ArcGIS Solar Suitability tool: for each hour 6–18 (solar time) every taller neighbour
// within 200 m casts a shadow = convex hull of its footprint and the footprint shifted by
// (height difference / tan(sun altitude)) away from the sun. The roof's shaded share is measured by
// sampling the roof on a fine grid instead of polygon union/intersect, which also gives sun-hours per
// roof cell (drawn as a heatmap) and tells which neighbour blocks how much.
// Scoring and money figures come from the shared, SDK-free src/utils/solarEngine.js so both maps agree.
import { getSolarPosition, computeScore, computeFinancials, floorsStringToHeight, METERS_PER_FLOOR } from '../../utils/solarEngine.js';
import { computeShadeFactor } from '../../utils/solarCalculations.js';

export const ANALYSIS_HOURS = Array.from({ length: 13 }, (_, i) => i + 6);
export const NEIGHBOUR_RADIUS_M = 200;
export { METERS_PER_FLOOR };

const M_PER_DEG_LON = 111320; // same degree→metre factors as the ArcGIS tool
const M_PER_DEG_LAT = 110540;
const MAX_SAMPLES = 1500;
const MIN_ALTITUDE_DEG = 5;

export function featureHeight(props = {}) {
  const h = Number(props.height);
  if (h > 0) return h;
  return floorsStringToHeight(props.no_floors) ?? 6;
}

// Polygon / MultiPolygon → array of polygons, each an array of rings of [lon, lat].
export function polygonsOf(geometry) {
  if (!geometry) return [];
  return geometry.type === 'MultiPolygon' ? geometry.coordinates : [geometry.coordinates];
}

export function ringArea(ring) {
  let a = 0;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) a += (ring[j][0] + ring[i][0]) * (ring[j][1] - ring[i][1]);
  return a / 2;
}

function ringCentroid(ring) {
  let a = 0, cx = 0, cy = 0;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const f = ring[j][0] * ring[i][1] - ring[i][0] * ring[j][1];
    a += f; cx += (ring[j][0] + ring[i][0]) * f; cy += (ring[j][1] + ring[i][1]) * f;
  }
  if (Math.abs(a) < 1e-18) return [ring.reduce((s, v) => s + v[0], 0) / ring.length, ring.reduce((s, v) => s + v[1], 0) / ring.length];
  return [cx / (3 * a), cy / (3 * a)];
}

// Centroid of the largest part, in lon/lat.
export function geometryCentroid(geometry) {
  const parts = polygonsOf(geometry);
  const largest = parts.reduce((best, p) => (Math.abs(ringArea(p[0])) > Math.abs(ringArea(best[0])) ? p : best), parts[0]);
  return ringCentroid(largest[0]);
}

// Local metric plane around a point (east = x, north = y), accurate to well under 1 % over a few hundred metres.
export function localFrame([lon0, lat0]) {
  const kx = M_PER_DEG_LON * Math.cos((lat0 * Math.PI) / 180);
  return {
    toXY: ([lon, lat]) => [(lon - lon0) * kx, (lat - lat0) * M_PER_DEG_LAT],
    toLonLat: ([x, y]) => [lon0 + x / kx, lat0 + y / M_PER_DEG_LAT],
  };
}

export function bboxOf(points) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const [x, y] of points) {
    if (x < minX) minX = x; if (x > maxX) maxX = x;
    if (y < minY) minY = y; if (y > maxY) maxY = y;
  }
  return { minX, minY, maxX, maxY };
}

const overlaps = (a, b) => a.minX <= b.maxX && a.maxX >= b.minX && a.minY <= b.maxY && a.maxY >= b.minY;

export function inRing(x, y, ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i]; const [xj, yj] = ring[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

export const inPolygon = (x, y, rings) => inRing(x, y, rings[0]) && !rings.slice(1).some((h) => inRing(x, y, h));

// Andrew's monotone chain; returns the hull counter-clockwise.
export function convexHull(points) {
  const pts = points.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  if (pts.length <= 2) return pts;
  const cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lower = [];
  for (const p of pts) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) lower.pop();
    lower.push(p);
  }
  const upper = [];
  for (let i = pts.length - 1; i >= 0; i--) {
    const p = pts[i];
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) upper.pop();
    upper.push(p);
  }
  return lower.slice(0, -1).concat(upper.slice(0, -1));
}

export function inConvex(x, y, hull) {
  for (let i = 0, j = hull.length - 1; i < hull.length; j = i++) {
    if ((hull[i][0] - hull[j][0]) * (y - hull[j][1]) - (hull[i][1] - hull[j][1]) * (x - hull[j][0]) < 0) return false;
  }
  return true;
}

// Shadow of one footprint part: hull of the outline and the outline moved along the shadow direction.
export function shadowHull(ringXY, effectiveHeight, solar) {
  const length = effectiveHeight / Math.tan(solar.altitudeRad);
  const az = solar.azimuthRad + Math.PI; // shadow falls opposite to the sun
  const dx = length * Math.sin(az);
  const dy = length * Math.cos(az);
  return convexHull([...ringXY, ...ringXY.map(([x, y]) => [x + dx, y + dy])]);
}

// Regular grid of points on the roof, about MAX_SAMPLES of them (0.4–3 m apart).
function sampleRoof(partsXY, area) {
  const spacing = Math.min(3, Math.max(0.4, Math.sqrt(area / MAX_SAMPLES)));
  const box = bboxOf(partsXY.flatMap((p) => p[0]));
  const points = [];
  for (let y = box.minY + spacing / 2; y < box.maxY; y += spacing) {
    for (let x = box.minX + spacing / 2; x < box.maxX; x += spacing) {
      if (partsXY.some((rings) => inPolygon(x, y, rings))) points.push([x, y]);
    }
  }
  if (!points.length) points.push([0, 0]);
  return { spacing, points, box };
}

/**
 * @param target     { geometry, height, area? }  roof to analyse (GeoJSON geometry, lon/lat)
 * @param neighbours [{ key, geometry, height, name?, sim? }]  possible shadow casters
 * @param dayOfYear  1–366, or null for today
 */
export function analyseRooftop({ target, neighbours, dayOfYear }) {
  const center = geometryCentroid(target.geometry);
  const frame = localFrame(center);
  const partsXY = polygonsOf(target.geometry).map((rings) => rings.map((r) => r.map(frame.toXY)));
  const measured = partsXY.reduce((s, rings) => s + Math.abs(ringArea(rings[0])) - rings.slice(1).reduce((h, r) => h + Math.abs(ringArea(r)), 0), 0);
  const area = measured > 0 ? measured : Number(target.area) > 0 ? Number(target.area) : 50;
  const { spacing, points, box } = sampleRoof(partsXY, area);
  const targetHeight = target.height || 0;

  const casters = neighbours
    .map((n) => ({ ...n, effectiveHeight: n.height - targetHeight, rings: polygonsOf(n.geometry).map((p) => p[0].map(frame.toXY)) }))
    .filter((n) => n.effectiveHeight > 0 && n.rings.length);

  const litHours = new Uint8Array(points.length);
  const blockedCount = new Map(); // caster key → shaded sample-hours
  const hourlyResults = [];
  let eligibleHours = 0;

  for (const hour of ANALYSIS_HOURS) {
    const solar = getSolarPosition(hour, dayOfYear);
    if (solar.altitudeDeg < MIN_ALTITUDE_DEG) {
      hourlyResults.push({ hour, sunlitPct: 0, sunny: false });
      continue;
    }
    eligibleHours++;
    const hulls = [];
    for (const c of casters) {
      for (const ring of c.rings) {
        const hull = shadowHull(ring, c.effectiveHeight, solar);
        const hb = bboxOf(hull);
        if (hull.length >= 3 && overlaps(hb, box)) hulls.push({ hull, hb, key: c.key });
      }
    }
    let shaded = 0;
    points.forEach(([x, y], i) => {
      const hitKeys = new Set();
      for (const h of hulls) {
        if (x >= h.hb.minX && x <= h.hb.maxX && y >= h.hb.minY && y <= h.hb.maxY && inConvex(x, y, h.hull)) hitKeys.add(h.key);
      }
      if (hitKeys.size) {
        shaded++;
        hitKeys.forEach((k) => blockedCount.set(k, (blockedCount.get(k) || 0) + 1));
      } else {
        litHours[i]++;
      }
    });
    const sunlitPct = Math.round(Math.max(0, (1 - shaded / points.length) * 100));
    hourlyResults.push({ hour, sunlitPct, sunny: sunlitPct > 30 });
  }

  const byKey = new Map(casters.map((c) => [c.key, c]));
  const roofHours = points.length * Math.max(eligibleHours, 1);
  const blockers = [...blockedCount.entries()]
    .map(([key, n]) => ({ key, name: byKey.get(key).name, height: byKey.get(key).height, sim: !!byKey.get(key).sim, share: n / roofHours }))
    .sort((a, b) => b.share - a.share);

  return {
    center, frame, area, spacing, eligibleHours, hourlyResults, blockers,
    samples: points.map((p, i) => ({ lonLat: frame.toLonLat(p), litHours: litHours[i] })),
    casterCount: casters.length,
  };
}

/**
 * Turn an analysis into the result object used by the ArcGIS tool and the saved-analyses dashboard
 * (same field names), plus the shade factor and shade-adjusted yield.
 */
export function buildResult({ analysis, baseline, heightM, floors, dayOfYear, seasonLabel, neighbourCount, simCount }) {
  const s = computeScore({ hourlyResults: analysis.hourlyResults, area: analysis.area, heightM, dayOfYear });
  const fin = computeFinancials({ area: analysis.area });
  const shadeFactor = computeShadeFactor(analysis.hourlyResults, dayOfYear);
  const baselineScore = baseline
    ? computeScore({ hourlyResults: baseline.hourlyResults, area: baseline.area, heightM, dayOfYear }).score
    : null;
  return {
    score: s.score,
    label: s.label,
    seasonLabel,
    suitabilityClass: s.suitabilityClass,
    sunnyHours: s.sunnyHours,
    eligibleHours: analysis.eligibleHours,
    avgSunlit: s.avgSunlit,
    hourlyResults: analysis.hourlyResults,
    area: analysis.area.toFixed(1),
    usableArea: fin.usableArea,
    floors: floors ?? '—',
    height: heightM ? heightM.toFixed(1) : '—',
    capacity: fin.capacity,
    generation: fin.generation,
    shadeFactor: shadeFactor.toFixed(3),
    shadedGeneration: (Number(fin.generation) * shadeFactor).toFixed(0),
    co2Saved: fin.co2Saved,
    annualSavings: fin.annualSavings,
    installCost: fin.installCost,
    paybackYears: fin.paybackYears,
    panelCount: fin.panelCount,
    neighbourCount,
    simCount,
    baselineScore: simCount > 0 ? baselineScore : null,
    simImpact: simCount > 0 ? s.score - baselineScore : null,
  };
}

// Equation of time (minutes) — converts the analysis' solar hours to Indian Standard Time for the 3D sun.
export function solarHourToIst(hour, dayOfYear, lon = 72.85) {
  const B = ((2 * Math.PI) / 365) * (dayOfYear - 81);
  const eotMin = 9.87 * Math.sin(2 * B) - 7.53 * Math.cos(B) - 1.5 * Math.sin(B);
  return hour + (82.5 - lon) / 15 - eotMin / 60;
}

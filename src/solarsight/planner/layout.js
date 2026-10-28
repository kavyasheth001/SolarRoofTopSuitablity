// Automatic panel layout on a flat roof: rows of tilted panels facing one direction, kept a setback away
// from the roof edge, with rows spaced so a row never shades the one behind it between 9:00 and 15:00
// (solar time) on the shortest day (21 December), the usual design rule for fixed-tilt rows.
import { getSolarPosition } from '../../utils/solarEngine.js';
import { convexHull } from '../solar/solarAnalysis.js';

const MIN_ROW_GAP = 0.4; // m, walkway for cleaning between rows
const PANEL_GAP = 0.02; // m between panels in a row (clamps)
const WINTER_SOLSTICE = 355;
const rad = (d) => (d * Math.PI) / 180;
const deg = (r) => (r * 180) / Math.PI;

// Horizontal unit vectors (east, north) for panels facing `azimuthDeg` (clockwise from north):
// f = direction the panels face, u = along the row, v = towards the back (raised) edge.
export function axesFor(azimuthDeg) {
  const g = rad(azimuthDeg);
  const f = [Math.sin(g), Math.cos(g)];
  return { f, u: [-Math.cos(g), Math.sin(g)], v: [-f[0], -f[1]] };
}

// Gap between rows so the raised edge of one row does not shade the next, 9:00-15:00 on 21 December.
export function rowGap(upslope, tiltDeg, azimuthDeg) {
  const rise = upslope * Math.sin(rad(tiltDeg));
  let worst = 0;
  for (let t = 9; t <= 15; t += 0.5) {
    const s = getSolarPosition(t, WINTER_SOLSTICE);
    if (s.altitudeRad <= 0.05) continue;
    worst = Math.max(worst, (rise / Math.tan(s.altitudeRad)) * Math.cos(s.azimuthRad - rad(azimuthDeg)));
  }
  return Math.max(MIN_ROW_GAP, worst);
}

// Facing that lines rows up with the roof's main axis (minimum-area bounding rectangle), choosing the side
// whose outward direction is closest to south.
export function roofAlignedAzimuth(roofParts) {
  const outer = roofParts.reduce((a, p) => (p[0].length > a.length ? p[0] : a), roofParts[0][0]);
  const hull = convexHull(outer);
  let bestAngle = 0; let bestArea = Infinity;
  for (let i = 0; i < hull.length; i++) {
    const [x1, y1] = hull[i]; const [x2, y2] = hull[(i + 1) % hull.length];
    const ang = Math.atan2(x2 - x1, y2 - y1); // edge azimuth
    const c = Math.cos(ang); const s = Math.sin(ang);
    let minA = Infinity; let maxA = -Infinity; let minB = Infinity; let maxB = -Infinity;
    for (const [x, y] of hull) {
      const a = x * s + y * c; const b = x * c - y * s;
      minA = Math.min(minA, a); maxA = Math.max(maxA, a); minB = Math.min(minB, b); maxB = Math.max(maxB, b);
    }
    const area = (maxA - minA) * (maxB - minB);
    if (area < bestArea) { bestArea = area; bestAngle = ang; }
  }
  const options = [0, 90, 180, 270].map((k) => (deg(bestAngle) + k + 360) % 360);
  return options.reduce((best, a) => (Math.abs(a - 180) < Math.abs(best - 180) ? a : best), options[0]);
}

// Does segment (p, q) touch the axis-aligned box? (Liang-Barsky clipping)
function segmentHitsBox(p, q, minA, minB, maxA, maxB) {
  let t0 = 0; let t1 = 1;
  const d = [q[0] - p[0], q[1] - p[1]];
  const checks = [[-d[0], p[0] - minA], [d[0], maxA - p[0]], [-d[1], p[1] - minB], [d[1], maxB - p[1]]];
  for (const [pp, qq] of checks) {
    if (pp === 0) { if (qq < 0) return false; continue; }
    const r = qq / pp;
    if (pp < 0) { if (r > t1) return false; if (r > t0) t0 = r; } else { if (r < t0) return false; if (r < t1) t1 = r; }
  }
  return true;
}

function inRing(x, y, ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i]; const [xj, yj] = ring[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

/**
 * @param roofParts  roof polygons in local metres (x east, y north), each an array of rings
 * @param along      panel size along the row, m
 * @param upslope    panel size up the slope, m
 * @param cellOk     optional (x, y) => bool from the roof model: the spot belongs to the roof part being
 *                   filled and is clear of tanks, stair rooms, edges between levels
 * @param flush      panels lie flat on a sloped roof plane: rows only need a small gap
 * @returns { panels: [{ x, y, row }], depth, pitch, gap }  panel centres in local metres
 */
export function layoutRows({ roofParts, along, upslope, tilt, azimuth, setback, cellOk, flush = false }) {
  const { u, v } = axesFor(azimuth);
  const depth = upslope * Math.cos(rad(tilt));
  const gap = flush ? 0.05 : rowGap(upslope, tilt, azimuth);
  const pitch = depth + gap;
  const step = along + PANEL_GAP;
  const toUV = ([x, y]) => [x * u[0] + y * u[1], x * v[0] + y * v[1]];

  const parts = roofParts.map((rings) => {
    const ringsUV = rings.map((r) => r.map(toUV));
    const edges = ringsUV.flatMap((r) => r.slice(1).map((q, i) => {
      const p = r[i];
      return { p, q, minA: Math.min(p[0], q[0]), maxA: Math.max(p[0], q[0]), minB: Math.min(p[1], q[1]), maxB: Math.max(p[1], q[1]) };
    }));
    const pts = ringsUV[0];
    return {
      ringsUV, edges,
      minA: Math.min(...pts.map((p) => p[0])), maxA: Math.max(...pts.map((p) => p[0])),
      minB: Math.min(...pts.map((p) => p[1])), maxB: Math.max(...pts.map((p) => p[1])),
    };
  });

  // A panel fits if its centre is on the roof (not in a hole) and no roof edge comes within the setback.
  const fits = (part, a, b) => {
    const minA = a - setback; const maxA = a + along + setback; const minB = b - setback; const maxB = b + depth + setback;
    for (const e of part.edges) {
      if (e.maxA < minA || e.minA > maxA || e.maxB < minB || e.minB > maxB) continue;
      if (segmentHitsBox(e.p, e.q, minA, minB, maxA, maxB)) return false;
    }
    const ca = a + along / 2; const cb = b + depth / 2;
    if (!inRing(ca, cb, part.ringsUV[0]) || part.ringsUV.slice(1).some((h) => inRing(ca, cb, h))) return false;
    if (!cellOk) return true;
    // Every part of the panel (corners, edge middles, centre) must sit on placeable roof.
    for (const fa of [0.05, 0.5, 0.95]) {
      for (const fb of [0.05, 0.5, 0.95]) {
        const pa = a + along * fa; const pb = b + depth * fb;
        if (!cellOk(pa * u[0] + pb * v[0], pa * u[1] + pb * v[1])) return false;
      }
    }
    return true;
  };

  // Try a few grid offsets and keep the one that fits the most panels.
  let best = [];
  for (const oa of [0, 0.25, 0.5, 0.75]) {
    for (const ob of [0, 0.33, 0.66]) {
      const found = [];
      for (const part of parts) {
        let row = 0;
        for (let b = part.minB + setback + ob * pitch; b + depth <= part.maxB - setback + 1e-9; b += pitch, row++) {
          for (let a = part.minA + setback + oa * step; a + along <= part.maxA - setback + 1e-9; a += step) {
            if (fits(part, a, b)) found.push({ a, b, row });
          }
        }
      }
      if (found.length > best.length) best = found;
    }
  }

  const panels = best.map(({ a, b, row }) => {
    const ca = a + along / 2; const cb = b + depth / 2;
    return { x: ca * u[0] + cb * v[0], y: ca * u[1] + cb * v[1], row };
  });
  return { panels, depth, pitch, gap };
}

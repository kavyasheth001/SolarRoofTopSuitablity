/**
 * solarEngine.js
 * Pure, side-effect-free calculation functions for solar suitability analysis.
 * Extracted from SolarSuitabilityTool.jsx so they can be shared with the
 * "Design New Building" mode without duplicating logic.
 *
 * Single constant for metres-per-floor — was inconsistently 3 m and 3.2 m.
 * Unified to 3.2 m (matches the What-If simulator that was already using it).
 */

export const METERS_PER_FLOOR = 3.2;

// ── Solar Position ────────────────────────────────────────────────────────────

/**
 * Return sun altitude and azimuth for Mumbai (19.076°N) at a given hour and
 * day-of-year.  Passing dayOfYear = null uses today's actual day.
 */
export function getSolarPosition(hour, dayOfYear) {
  if (dayOfYear == null) {
    const now = new Date();
    dayOfYear = Math.floor((now - new Date(now.getFullYear(), 0, 0)) / 86400000);
  }
  const lat = 19.076 * Math.PI / 180;
  const B = (360 / 365) * (dayOfYear - 81) * Math.PI / 180;
  const declination = 23.45 * Math.sin(B) * Math.PI / 180;
  const hourAngle = (hour - 12) * 15 * Math.PI / 180;

  const sinAlt =
    Math.sin(lat) * Math.sin(declination) +
    Math.cos(lat) * Math.cos(declination) * Math.cos(hourAngle);
  const altitude = Math.asin(Math.max(-1, Math.min(1, sinAlt)));

  const azimuth = Math.atan2(
    -Math.cos(declination) * Math.sin(hourAngle),
    Math.sin(declination) * Math.cos(lat) -
    Math.cos(declination) * Math.cos(hourAngle) * Math.sin(lat)
  );

  return {
    altitudeDeg: altitude * 180 / Math.PI,
    altitudeRad: altitude,
    azimuthRad: azimuth,
  };
}

// ── Geometry Helpers ──────────────────────────────────────────────────────────

/**
 * Compute the geographic centroid of a 2D ring, returned as { lon, lat }.
 * Handles both WebMercator (WKID 3857/102100) and Geographic (4326) inputs.
 */
export function ringToLonLat(ring, sr) {
  const cx = ring.reduce((s, v) => s + v[0], 0) / ring.length;
  const cy = ring.reduce((s, v) => s + v[1], 0) / ring.length;
  const isWM =
    sr &&
    (sr.wkid === 3857 ||
      sr.wkid === 102100 ||
      (sr.latestWkid && (sr.latestWkid === 3857 || sr.latestWkid === 102100)));
  if (isWM) {
    const R = 6378137;
    const lon = (cx / R) * (180 / Math.PI);
    const lat = (2 * Math.atan(Math.exp(cy / R)) - Math.PI / 2) * (180 / Math.PI);
    return { lon, lat };
  }
  return { lon: cx, lat: cy };
}

/**
 * Bounding-box diameter of a ring in metres.
 * Handles WebMercator and Geographic inputs.
 */
export function ringDiameterM(ring, sr) {
  const isWM =
    sr &&
    (sr.wkid === 3857 ||
      sr.wkid === 102100 ||
      (sr.latestWkid && (sr.latestWkid === 3857 || sr.latestWkid === 102100)));
  const xs = ring.map(v => v[0]);
  const ys = ring.map(v => v[1]);
  let wM, hM;
  if (isWM) {
    wM = Math.max(...xs) - Math.min(...xs);
    hM = Math.max(...ys) - Math.min(...ys);
  } else {
    const avgLat = (Math.max(...ys) + Math.min(...ys)) / 2;
    wM = (Math.max(...xs) - Math.min(...xs)) * 111320 * Math.cos(avgLat * Math.PI / 180);
    hM = (Math.max(...ys) - Math.min(...ys)) * 110540;
  }
  return Math.sqrt(wM * wM + hM * hM);
}

// ── Shadow Check ──────────────────────────────────────────────────────────────

/**
 * Estimate the fraction of a subject building's rooftop that is in shadow cast
 * by a single neighbour at a specific solar position.
 *
 * Uses a centroid-distance-angle approximation — screening tool, not survey-grade.
 */
export function checkShadowReach(neighbourGeom2D, nHeight, selectedGeom2D, selectedHeight, solar) {
  if (solar.altitudeRad <= 0.087) return 0;

  const effectiveHeight = Math.max(0, nHeight - (selectedHeight || 0));
  if (effectiveHeight <= 0) return 0;

  const shadowLength = effectiveHeight / Math.tan(solar.altitudeRad);
  const shadowAzimuth = solar.azimuthRad + Math.PI;

  try {
    const nRing = neighbourGeom2D.rings[0];
    const sRing = selectedGeom2D.rings[0];
    if (!nRing || !sRing) return 0;

    const nLL = ringToLonLat(nRing, neighbourGeom2D.spatialReference);
    const sLL = ringToLonLat(sRing, selectedGeom2D.spatialReference);

    const avgLat = (nLL.lat + sLL.lat) / 2;
    const dx = (sLL.lon - nLL.lon) * 111320 * Math.cos(avgLat * Math.PI / 180);
    const dy = (sLL.lat - nLL.lat) * 110540;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance < 1) return 0;

    const dirToSelected = Math.atan2(dx, dy);
    let angleDiff = Math.abs((dirToSelected - shadowAzimuth) % (2 * Math.PI));
    if (angleDiff > Math.PI) angleDiff = 2 * Math.PI - angleDiff;
    if (angleDiff > Math.PI / 2.6) return 0;
    if (shadowLength < distance) return 0;

    const neighbourDiameter = ringDiameterM(nRing, neighbourGeom2D.spatialReference);
    const angularCoverage = Math.atan2(neighbourDiameter / 2, distance);

    const selectedDiameter = ringDiameterM(sRing, selectedGeom2D.spatialReference);
    const selectedAngularWidth = Math.atan2(selectedDiameter / 2, distance);

    return Math.min(1.0, angularCoverage / Math.max(selectedAngularWidth, 0.01));
  } catch {
    return 0;
  }
}

// ── Height Estimation ─────────────────────────────────────────────────────────

/**
 * Parse a "G+5" / "G+0" / "G" floors string into a height in metres.
 * Returns null if the string cannot be parsed.
 */
export function floorsStringToHeight(noFloorsRaw) {
  if (noFloorsRaw == null) return null;
  const m = String(noFloorsRaw).match(/(\d+)/);
  return m ? (parseInt(m[1]) + 1) * METERS_PER_FLOOR : null;
}

// ── Scoring ───────────────────────────────────────────────────────────────────

/**
 * Compute the composite suitability score and associated labels.
 *
 * @param {{ hourlyResults, area, heightM, dayOfYear }} params
 */
export function computeScore({ hourlyResults, area, heightM, dayOfYear }) {
  const IRRADIANCE_SCORE = 92; // fixed for Mumbai

  const sunnyHours = hourlyResults.filter(h => h.sunny).length;

  const eligibleHours = hourlyResults.filter(h => {
    const sol = getSolarPosition(h.hour, dayOfYear);
    return sol.altitudeDeg >= 5;
  }).length;

  const sunlightScore = eligibleHours > 0 ? (sunnyHours / eligibleHours) * 100 : 0;
  const areaScore = Math.min(100, (Math.log10(Math.max(area, 1)) / Math.log10(500)) * 100);
  const heightScore = heightM ? Math.min(100, (heightM / 50) * 100) : 40;

  const finalScore = Math.round(
    sunlightScore    * 0.50 +
    areaScore        * 0.20 +
    heightScore      * 0.10 +
    IRRADIANCE_SCORE * 0.20
  );
  const score = Math.max(0, Math.min(100, finalScore));

  const avgSunlit = (
    hourlyResults.reduce((sum, h) => sum + parseFloat(h.sunlitPct), 0) / hourlyResults.length
  ).toFixed(0);

  let label = 'Good Solar Potential';
  if (score <= 40) label = 'Low Solar Potential';
  else if (score <= 70) label = 'Moderate Solar Potential';

  let suitabilityClass = 'Highly Suitable';
  if (score < 40) suitabilityClass = 'Less Suitable';
  else if (score < 55) suitabilityClass = 'Moderately Suitable';
  else if (score < 70) suitabilityClass = 'Suitable';

  return { score, sunnyHours, avgSunlit, sunlightScore, areaScore, heightScore, label, suitabilityClass };
}

// ── Financial & Environmental Metrics ────────────────────────────────────────

/**
 * Derive financial and environmental metrics from rooftop area.
 *
 * Assumptions:
 *   Panel: 330 W, 1.7 m² each
 *   CO2 factor: 0.82 kg/kWh (India grid)
 *   Tariff: Rs 7/unit
 *   Install cost: Rs 60,000/kWp
 *
 * @param {{ area: number }} params  Gross rooftop area in m²
 */
export function computeFinancials({ area }) {
  const usableArea = area * 0.70;
  const capacityNum = parseFloat((usableArea * 0.15).toFixed(1));
  const generationNum = parseFloat((capacityNum * 1500).toFixed(0));
  const panelCount = Math.floor((usableArea * 0.85) / 1.7);
  const co2Saved = (generationNum * 0.82 / 1000).toFixed(2);
  const annualSavings = (generationNum * 7).toFixed(0);
  const installCost = (capacityNum * 60000).toFixed(0);
  const paybackYears =
    parseFloat(annualSavings) > 0
      ? (parseFloat(installCost) / parseFloat(annualSavings)).toFixed(1)
      : '\u2014';

  return {
    usableArea: usableArea.toFixed(1),
    capacity: capacityNum.toFixed(1),
    generation: generationNum.toFixed(0),
    panelCount,
    co2Saved,
    annualSavings,
    installCost,
    paybackYears,
  };
}

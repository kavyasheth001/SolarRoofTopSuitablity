// Sunlight on a tilted panel, hour by hour, for a typical day of each month in Mumbai.
//
// Method (standard textbook chain, Duffie & Beckman "Solar Engineering of Thermal Processes"):
//   monthly daily GHI → clearness index Kt = H / H0 → diffuse share (Erbs) → hourly split
//   (Collares-Pereira & Rabl for global, Liu & Jordan for diffuse) → plane of array with the isotropic sky
//   model: beam × cos(incidence)/sin(altitude) + diffuse × (1 + cos tilt)/2 + ground-reflected light.
// The sun position comes from src/utils/solarEngine.js, the same one the shadow analysis uses.
import { getSolarPosition } from '../../utils/solarEngine.js';

export const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export const DAYS_IN_MONTH = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
const MID_DAY = [17, 47, 75, 105, 135, 162, 198, 228, 258, 288, 318, 344]; // Klein's representative days
// Mean daily global horizontal irradiation, kWh/m²/day: long-term averages for Mumbai (NASA POWER climatology,
// rounded). The monsoon months June-September are the cloudy dip. Annual ≈ 1,880 kWh/m².
export const GHI = [4.95, 5.62, 6.24, 6.67, 6.68, 4.73, 3.71, 3.83, 4.53, 5.17, 4.97, 4.71];
// Mean daytime air temperature, °C (for panel heat losses).
export const AIR_TEMP = [26, 27, 29, 31, 32, 30, 29, 28.5, 29, 30, 29, 27];
const LAT = 19.076; // same latitude as solarEngine
const ALBEDO = 0.2;
const G_SC = 1.367; // solar constant, kW/m²
const rad = (d) => (d * Math.PI) / 180;

let cache = null;

/**
 * Time slots (month × hour) with horizontal irradiation and the sun vector. Each slot is one hour on the
 * representative day of its month; multiply by `days` for the month total.
 * @returns [{ month, hour, days, I, Ib, Id, sun: [east, north, up] }]  (I*, kWh/m² in that hour)
 */
export function climateSlots() {
  if (cache) return cache;
  const phi = rad(LAT);
  const slots = [];
  for (let m = 0; m < 12; m++) {
    const n = MID_DAY[m];
    const delta = rad(23.45 * Math.sin(rad((360 * (284 + n)) / 365)));
    const ws = Math.acos(-Math.tan(phi) * Math.tan(delta)); // sunset hour angle
    const H0 = (24 / Math.PI) * G_SC * (1 + 0.033 * Math.cos(rad((360 * n) / 365)))
      * (Math.cos(phi) * Math.cos(delta) * Math.sin(ws) + ws * Math.sin(phi) * Math.sin(delta));
    const H = GHI[m];
    const kt = Math.min(0.8, H / H0);
    const wsDeg = (ws * 180) / Math.PI;
    const dFrac = wsDeg <= 81.4
      ? 1.391 - 3.56 * kt + 4.189 * kt ** 2 - 2.137 * kt ** 3
      : 1.311 - 3.022 * kt + 3.427 * kt ** 2 - 1.821 * kt ** 3;
    const Hd = H * Math.min(1, Math.max(0.1, dFrac));
    const a = 0.409 + 0.5016 * Math.sin(ws - rad(60));
    const b = 0.6609 - 0.4767 * Math.sin(ws - rad(60));
    const denom = Math.sin(ws) - ws * Math.cos(ws);
    for (let h = 0; h < 24; h++) {
      const t = h + 0.5; // hour centre, solar time
      const w = rad(15 * (t - 12));
      if (Math.abs(w) >= ws) continue;
      const rd = (Math.PI / 24) * (Math.cos(w) - Math.cos(ws)) / denom;
      const rt = rd * (a + b * Math.cos(w));
      const I = rt * H;
      const Id = Math.min(I, rd * Hd);
      const s = getSolarPosition(t, n);
      const ca = Math.cos(s.altitudeRad);
      slots.push({
        month: m, hour: t, dayOfYear: n, days: DAYS_IN_MONTH[m], I, Id, Ib: Math.max(0, I - Id),
        altitudeRad: s.altitudeRad, azimuthRad: s.azimuthRad,
        sun: [ca * Math.sin(s.azimuthRad), ca * Math.cos(s.azimuthRad), Math.sin(s.altitudeRad)],
      });
    }
  }
  cache = slots;
  return slots;
}

/**
 * Plane-of-array irradiation for a panel tilted `tiltDeg` and facing `azimuthDeg` (clockwise from north,
 * 180 = south), split into the part that shading removes (beam) and the part it does not (sky + ground).
 * @returns { beam: Float64Array, other: Float64Array }  kWh/m² per slot
 */
export function planeOfArray(tiltDeg, azimuthDeg) {
  const slots = climateSlots();
  const beta = rad(tiltDeg); const gamma = rad(azimuthDeg);
  const n = [Math.sin(beta) * Math.sin(gamma), Math.sin(beta) * Math.cos(gamma), Math.cos(beta)];
  const sky = (1 + Math.cos(beta)) / 2; const ground = (1 - Math.cos(beta)) / 2;
  const beam = new Float64Array(slots.length);
  const other = new Float64Array(slots.length);
  slots.forEach((s, i) => {
    const cosInc = s.sun[0] * n[0] + s.sun[1] * n[1] + s.sun[2] * n[2];
    const rb = s.altitudeRad > 0.02 ? Math.min(5, Math.max(0, cosInc) / Math.sin(s.altitudeRad)) : 0;
    beam[i] = s.Ib * rb;
    other[i] = s.Id * sky + s.I * ALBEDO * ground;
  });
  return { beam, other };
}

// Yearly irradiation on an unshaded panel, kWh/m².
export function annualPoa(tiltDeg, azimuthDeg) {
  const slots = climateSlots();
  const { beam, other } = planeOfArray(tiltDeg, azimuthDeg);
  return slots.reduce((sum, s, i) => sum + (beam[i] + other[i]) * s.days, 0);
}

// Tilt (0-35°, south-facing) that collects the most sunlight over the year.
export function bestTilt(azimuthDeg = 180) {
  let best = 0; let bestValue = -1;
  for (let t = 0; t <= 35; t++) {
    const v = annualPoa(t, azimuthDeg);
    if (v > bestValue) { bestValue = v; best = t; }
  }
  return { tilt: best, poa: bestValue, horizontal: annualPoa(0, 180) };
}

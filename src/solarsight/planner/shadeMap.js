// Which roof cells are in shadow, for every month × hour slot of the climate model, at the height a panel
// would sit there: 1 m above a flat roof (tilted rack), 0.2 m above a sloped one (flush mounting).
// Uses the same shading as the sunlight analysis: taller neighbours, proposed towers and the roof's own
// tanks, stair rooms, parapets and ridges.
import { createShading } from '../solar/shading.js';
import { polygonsOf } from '../solar/solarAnalysis.js';
import { climateSlots } from './irradiance.js';

export const PANEL_HEIGHT = { rack: 1.0, flush: 0.2 };

/**
 * @param model       roof model (buildRoofModel)
 * @param neighbours  [{ key, geometry, height }]
 * @param onProgress  (0..1)
 */
export async function buildShadeMap({ model, neighbours }, onProgress) {
  const { grid } = model;
  const { frame, nx, spacing: s } = grid;
  const shading = createShading({ grid, casters: neighbours.map((n) => ({ key: n.key, height: n.height, rings: polygonsOf(n.geometry).map((p) => p[0].map(frame.toXY)) })) });
  const slots = climateSlots();
  const cells = [];
  for (let k = 0; k < grid.z.length; k++) {
    if (!Number.isFinite(grid.z[k])) continue;
    const g = model.segments[model.seg[k]];
    cells.push({ k, x: grid.x0 + (k % nx) * s, y: grid.y0 + Math.floor(k / nx) * s, z: grid.z[k] + PANEL_HEIGHT[g?.mount || 'rack'] });
  }
  const indexOf = new Int32Array(grid.z.length).fill(-1);
  cells.forEach((c, i) => { indexOf[c.k] = i; });
  const shaded = new Uint8Array(cells.length * slots.length);
  for (let si = 0; si < slots.length; si++) {
    const sl = slots[si];
    const solar = { altitudeRad: sl.altitudeRad, azimuthRad: sl.azimuthRad };
    const base = si * cells.length;
    cells.forEach((c, i) => { if (shading.shadedBy(c.x, c.y, c.z, solar)) shaded[base + i] = 1; });
    if (si % 12 === 11) { onProgress?.((si + 1) / slots.length); await new Promise((r) => setTimeout(r, 0)); }
  }
  return {
    slots,
    /** 1 if a panel at local (x, y) is in shadow during slot `si` (points off the roof count as sunny). */
    isShaded(x, y, si) {
      const k = model.cellAt(x, y);
      const i = k < 0 ? -1 : indexOf[k];
      return i < 0 ? 0 : shaded[si * cells.length + i];
    },
  };
}

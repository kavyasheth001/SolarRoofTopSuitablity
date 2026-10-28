// Hourly sunlight on a real roof (LoD2 roof model): every roof cell at its own height, shaded by taller
// neighbours and by the roof's own tanks, stair rooms, parapets and ridges. Returns the same shape as
// analyseRooftop, so scoring (buildResult), the chart and the report are unchanged.
import { getSolarPosition } from '../../utils/solarEngine.js';
import { ANALYSIS_HOURS, polygonsOf } from './solarAnalysis.js';
import { createShading } from './shading.js';

export const OWN_ROOF = 'roof';

/**
 * @param model       roof model (buildRoofModel) — its grid carries the local frame and heights
 * @param neighbours  [{ key, geometry, height, name, sim? }]
 */
export function analyseRoof({ model, neighbours, dayOfYear }) {
  const { grid } = model;
  const { frame, nx, spacing: s } = grid;
  const casters = neighbours.map((n) => ({ ...n, rings: polygonsOf(n.geometry).map((p) => p[0].map(frame.toXY)) }));
  const shading = createShading({ grid, casters });

  // Sunlight is measured on the usable roof; the heatmap also shows the rest (tanks, small levels).
  const cells = [];
  for (let k = 0; k < grid.z.length; k++) {
    if (!Number.isFinite(grid.z[k])) continue;
    const g = model.segments[model.seg[k]];
    cells.push({ k, x: grid.x0 + (k % nx) * s, y: grid.y0 + Math.floor(k / nx) * s, z: grid.z[k], usable: g?.role === 'usable' });
  }
  const measured = cells.filter((c) => c.usable).length ? cells.filter((c) => c.usable) : cells;
  const litHours = new Uint8Array(cells.length);
  const blockedCount = new Map();
  const hourlyResults = [];
  let eligibleHours = 0;

  for (const hour of ANALYSIS_HOURS) {
    const solar = getSolarPosition(hour, dayOfYear);
    if (solar.altitudeDeg < 5) { hourlyResults.push({ hour, sunlitPct: 0, sunny: false }); continue; }
    eligibleHours++;
    let shadedMeasured = 0;
    cells.forEach((c, i) => {
      const by = shading.shadedBy(c.x, c.y, c.z, solar);
      if (!by) { litHours[i]++; return; }
      if (c.usable || measured === cells) {
        shadedMeasured++;
        blockedCount.set(by, (blockedCount.get(by) || 0) + 1);
      }
    });
    const sunlitPct = Math.round(Math.max(0, (1 - shadedMeasured / measured.length) * 100));
    hourlyResults.push({ hour, sunlitPct, sunny: sunlitPct > 30 });
  }

  const byKey = new Map(casters.map((c) => [c.key, c]));
  const cellHours = measured.length * Math.max(eligibleHours, 1);
  const blockers = [...blockedCount.entries()].map(([key, n]) => (key === OWN_ROOF
    ? { key, name: 'Own roof structures (tanks, stair rooms, parapets)', height: model.mainLevel, own: true, share: n / cellHours }
    : { key, name: byKey.get(key).name, height: byKey.get(key).height, sim: !!byKey.get(key).sim, share: n / cellHours }))
    .sort((a, b) => b.share - a.share);

  return {
    center: grid.center, frame, spacing: s, eligibleHours, hourlyResults, blockers,
    area: measured.length * s * s,
    roofArea: cells.length * s * s,
    samples: cells.map((c, i) => ({ lonLat: frame.toLonLat([c.x, c.y]), litHours: litHours[i], zAbs: grid.ground + c.z })),
    casterCount: casters.filter((c) => c.height > shading.zMin).length,
  };
}

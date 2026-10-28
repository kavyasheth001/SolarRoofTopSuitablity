// Is a point on the roof in shadow? Used by both the sunlight analysis and the panel planner.
//   Neighbours: a taller building shades point P (height z) if the horizontal path from P towards the sun
//     crosses its footprint within (building height − z) / tan(sun altitude). Exact for any footprint shape.
//   Own roof: the path from P towards the sun is walked across the roof height grid; a tank, stair room,
//     parapet or ridge higher than the sun ray at that spot shades P.
// Heights are metres above the building's ground; neighbours use their recorded heights on level ground.
import { bboxOf, convexHull } from './solarAnalysis.js';

const MIN_ALTITUDE = (5 * Math.PI) / 180;
const ROOF_EPS = 0.25; // m: tolerance against sampling noise on the roof surface

function segmentsCross(px, py, qx, qy, ax, ay, bx, by) {
  const d1 = (bx - ax) * (py - ay) - (by - ay) * (px - ax);
  const d2 = (bx - ax) * (qy - ay) - (by - ay) * (qx - ax);
  const d3 = (qx - px) * (ay - py) - (qy - py) * (ax - px);
  const d4 = (qx - px) * (by - py) - (qy - py) * (bx - px);
  return ((d1 > 0) !== (d2 > 0)) && ((d3 > 0) !== (d4 > 0));
}

/**
 * @param grid       roof grid (x0, y0, spacing, nx, ny, z) in local metres
 * @param casters    [{ key, rings: [[x, y]...] (local metres), height }] neighbours and proposed towers
 */
export function createShading({ grid, casters }) {
  const { nx, ny, z, spacing: s, x0, y0 } = grid;
  let zMin = Infinity; let zMax = -Infinity;
  for (const v of z) if (Number.isFinite(v)) { zMin = Math.min(zMin, v); zMax = Math.max(zMax, v); }
  const roofAt = (x, y) => {
    const ix = Math.round((x - x0) / s); const iy = Math.round((y - y0) / s);
    return ix < 0 || iy < 0 || ix >= nx || iy >= ny ? NaN : z[iy * nx + ix];
  };
  const items = casters.filter((c) => c.height > zMin).map((c) => ({
    ...c,
    edges: c.rings.flatMap((ring) => ring.slice(1).map((q, i) => [ring[i][0], ring[i][1], q[0], q[1]])),
    box: bboxOf(c.rings.flat()),
  }));
  const cache = new Map(); // per sun position: casters that can reach the roof, with their reach boxes

  function prepare(solar) {
    const key = `${solar.altitudeRad.toFixed(5)}|${solar.azimuthRad.toFixed(5)}`;
    if (cache.has(key)) return cache.get(key);
    const tan = Math.tan(solar.altitudeRad);
    const ux = Math.sin(solar.azimuthRad); const uy = Math.cos(solar.azimuthRad); // towards the sun
    const near = [];
    for (const c of items) {
      const reach = (c.height - zMin) / tan; // longest shadow, cast onto the lowest roof point
      const hull = convexHull([
        [c.box.minX, c.box.minY], [c.box.maxX, c.box.minY], [c.box.maxX, c.box.maxY], [c.box.minX, c.box.maxY],
        [c.box.minX - ux * reach, c.box.minY - uy * reach], [c.box.maxX - ux * reach, c.box.minY - uy * reach],
        [c.box.maxX - ux * reach, c.box.maxY - uy * reach], [c.box.minX - ux * reach, c.box.maxY - uy * reach],
      ]);
      near.push({ c, box: bboxOf(hull) });
    }
    const prepared = { tan, ux, uy, near };
    cache.set(key, prepared);
    return prepared;
  }

  /** Key of what shades (x, y) at height zp for this sun position: a caster key, 'roof', or null if in sun. */
  function shadedBy(x, y, zp, solar) {
    if (solar.altitudeRad < MIN_ALTITUDE) return 'low-sun';
    const { tan, ux, uy, near } = prepare(solar);
    // Own roof: walk towards the sun until the ray is above the highest roof point.
    const maxT = (zMax - zp) / tan;
    for (let t = s; t <= maxT; t += s * 0.75) {
      const h = roofAt(x + ux * t, y + uy * t);
      if (h > zp + t * tan + ROOF_EPS) return 'roof';
    }
    // Neighbours.
    for (const { c, box } of near) {
      if (x < box.minX || x > box.maxX || y < box.minY || y > box.maxY) continue;
      const len = (c.height - zp) / tan;
      if (len <= 0) continue;
      const qx = x + ux * len; const qy = y + uy * len;
      for (const [ax, ay, bx, by] of c.edges) {
        if (segmentsCross(x, y, qx, qy, ax, ay, bx, by)) return c.key;
      }
    }
    return null;
  }

  return { shadedBy, zMin, zMax };
}

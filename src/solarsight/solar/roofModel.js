// Roof model from a LoD2 height grid: splits the roof into flat levels and pitched planes, and finds the
// parts panels cannot use (water tanks, stair and lift rooms, parapets, light wells, north-facing slopes).
//
// Each grid cell gets a slope and a facing from its neighbours. Flat cells (< 8°) are grown into levels of
// equal height (steps < 0.3 m); pitched cells into planes of similar facing, each fitted with z = a·x + b·y + c.
// Small raised flat patches (< 40 m², > 1.2 m above the main roof) are tanks / cabins: obstacles.
import { convexHull } from './solarAnalysis.js';

const FLAT_DEG = 8;
const STEEP_DEG = 55;
const MIN_FLAT_M2 = 12;
const MIN_PLANE_M2 = 8;
const OBSTACLE_MAX_M2 = 40;
const deg = (r) => (r * 180) / Math.PI;

export function buildRoofModel(grid, { clearance = 0.5 } = {}) {
  const { nx, ny, z, spacing: s } = grid;
  const cellArea = s * s;
  const idx = (ix, iy) => iy * nx + ix;
  const valid = (k) => Number.isFinite(z[k]);
  const N = nx * ny;
  const slope = new Float32Array(N).fill(NaN);
  const facing = new Float32Array(N).fill(NaN);

  for (let iy = 0; iy < ny; iy++) {
    for (let ix = 0; ix < nx; ix++) {
      const k = idx(ix, iy);
      if (!valid(k)) continue;
      const zx = (a, b) => (a >= 0 && b < nx && valid(idx(a, iy)) && valid(idx(b, iy)) ? (z[idx(b, iy)] - z[idx(a, iy)]) / ((b - a) * s) : null);
      const zy = (a, b) => (a >= 0 && b < ny && valid(idx(ix, a)) && valid(idx(ix, b)) ? (z[idx(ix, b)] - z[idx(ix, a)]) / ((b - a) * s) : null);
      const gx = zx(ix - 1, ix + 1) ?? zx(ix, ix + 1) ?? zx(ix - 1, ix) ?? 0;
      const gy = zy(iy - 1, iy + 1) ?? zy(iy, iy + 1) ?? zy(iy - 1, iy) ?? 0;
      slope[k] = deg(Math.atan(Math.hypot(gx, gy)));
      facing[k] = (deg(Math.atan2(-gx, -gy)) + 360) % 360; // downhill direction, clockwise from north
    }
  }

  // Region growing over 4-neighbours with a test on the pair of cells.
  const seg = new Int32Array(N).fill(-1);
  const segments = [];
  const grow = (start, accept, kind) => {
    const id = segments.length;
    const cells = [start];
    seg[start] = id;
    for (let q = 0; q < cells.length; q++) {
      const k = cells[q]; const ix = k % nx; const iy = Math.floor(k / nx);
      for (const [jx, jy] of [[ix + 1, iy], [ix - 1, iy], [ix, iy + 1], [ix, iy - 1]]) {
        if (jx < 0 || jy < 0 || jx >= nx || jy >= ny) continue;
        const j = idx(jx, jy);
        if (seg[j] !== -1 || !valid(j) || !accept(k, j, start)) continue;
        seg[j] = id; cells.push(j);
      }
    }
    segments.push({ id, kind, cells });
  };
  const isFlat = (k) => slope[k] < FLAT_DEG;
  const isPitched = (k) => slope[k] >= FLAT_DEG && slope[k] <= STEEP_DEG;
  const angleDiff = (a, b) => Math.abs(((a - b + 540) % 360) - 180);
  for (let k = 0; k < N; k++) {
    if (seg[k] !== -1 || !valid(k)) continue;
    if (isFlat(k)) grow(k, (a, b) => isFlat(b) && Math.abs(z[a] - z[b]) < 0.3, 'flat');
    else if (isPitched(k)) grow(k, (a, b, st) => isPitched(b) && angleDiff(facing[b], facing[st]) < 30 && Math.abs(z[a] - z[b]) < s * 1.5, 'pitched');
  }

  const xy = (k) => [grid.x0 + (k % nx) * s, grid.y0 + Math.floor(k / nx) * s];
  // Describe each region: area, level or fitted plane.
  segments.forEach((g) => {
    g.area = g.cells.length * cellArea;
    const zs = g.cells.map((k) => z[k]).sort((a, b) => a - b);
    g.level = zs[Math.floor(zs.length / 2)];
    if (g.kind === 'pitched' && g.cells.length >= 4) {
      // Least squares plane z = a x + b y + c.
      let sx = 0, sy = 0, sz = 0, sxx = 0, syy = 0, sxy = 0, sxz = 0, syz = 0;
      const n = g.cells.length;
      g.cells.forEach((k) => { const [x, y] = xy(k); sx += x; sy += y; sz += z[k]; sxx += x * x; syy += y * y; sxy += x * y; sxz += x * z[k]; syz += y * z[k]; });
      const mx = sx / n; const my = sy / n; const mz = sz / n;
      const cxx = sxx / n - mx * mx; const cyy = syy / n - my * my; const cxy = sxy / n - mx * my;
      const cxz = sxz / n - mx * mz; const cyz = syz / n - my * mz;
      const det = cxx * cyy - cxy * cxy;
      const a = det ? (cxz * cyy - cyz * cxy) / det : 0; const b = det ? (cyz * cxx - cxz * cxy) / det : 0;
      g.plane = { a, b, c: mz - a * mx - b * my };
      g.tilt = deg(Math.atan(Math.hypot(a, b)));
      g.azimuth = (deg(Math.atan2(-a, -b)) + 360) % 360;
      g.rms = Math.sqrt(g.cells.reduce((t, k) => { const [x, y] = xy(k); return t + (z[k] - (a * x + b * y + g.plane.c)) ** 2; }, 0) / n);
    }
  });

  const flats = segments.filter((g) => g.kind === 'flat').sort((a, b) => b.area - a.area);
  const main = flats[0] || segments.slice().sort((a, b) => b.area - a.area)[0];
  const mainLevel = main?.level ?? 0;
  segments.forEach((g) => {
    if (g.kind === 'flat') {
      const raised = g.level - mainLevel > 1.2;
      const sunken = mainLevel - g.level > 1.2;
      g.role = g.area < MIN_FLAT_M2 ? (raised ? 'obstacle' : 'small')
        : raised && g.area < OBSTACLE_MAX_M2 ? 'obstacle'
          : sunken && g.area < OBSTACLE_MAX_M2 ? 'well' : 'usable';
    } else {
      const facesNorth = angleDiff(g.azimuth ?? 0, 0) < 70;
      g.role = g.area < MIN_PLANE_M2 || g.rms > 0.4 ? 'small' : facesNorth || g.tilt > 45 ? 'unsuited' : 'usable';
    }
    g.mount = g.kind === 'flat' ? 'rack' : 'flush';
  });

  // Placeable cells: in a usable segment and at least `clearance` from any other segment or gap.
  const r = Math.max(1, Math.round(clearance / s));
  const placeable = new Uint8Array(N);
  for (let k = 0; k < N; k++) {
    const g = segments[seg[k]];
    if (!g || g.role !== 'usable') continue;
    const ix = k % nx; const iy = Math.floor(k / nx);
    let ok = true;
    for (let dy = -r; dy <= r && ok; dy++) {
      for (let dx = -r; dx <= r && ok; dx++) {
        const jx = ix + dx; const jy = iy + dy;
        if (jx < 0 || jy < 0 || jx >= nx || jy >= ny || seg[idx(jx, jy)] !== g.id) ok = false;
      }
    }
    placeable[k] = ok ? 1 : 0;
  }

  // Outline of each segment (convex hull of its cells) for display and layout bounds.
  segments.forEach((g) => { g.hull = convexHull(g.cells.map(xy)); });

  const roofArea = segments.reduce((t, g) => t + g.area, 0) + 0;
  const sum = (role) => segments.filter((g) => g.role === role).reduce((t, g) => t + g.area, 0);
  return {
    grid, segments, seg, placeable, slope, facing, mainLevel,
    usable: segments.filter((g) => g.role === 'usable'),
    stats: {
      roofArea, usableArea: sum('usable'), obstacleArea: sum('obstacle'), wellArea: sum('well'),
      obstacles: segments.filter((g) => g.role === 'obstacle').length,
      pitchedPlanes: segments.filter((g) => g.kind === 'pitched' && g.role !== 'small').length,
      northPlanes: segments.filter((g) => g.role === 'unsuited').length,
      // Parts split only by parapets or joints sit at the same height: count levels 0.5 m apart as one.
      levels: new Set(flats.filter((g) => g.role === 'usable').map((g) => Math.round(g.level / 0.5))).size,
    },
    /** Grid cell index at local (x, y), or -1 outside the grid. */
    cellAt(x, y) {
      const ix = Math.round((x - grid.x0) / s); const iy = Math.round((y - grid.y0) / s);
      return ix < 0 || iy < 0 || ix >= nx || iy >= ny ? -1 : idx(ix, iy);
    },
    /** Roof height (m above ground) at local (x, y), NaN off the roof. */
    heightAt(x, y) {
      const k = this.cellAt(x, y);
      return k < 0 ? NaN : z[k];
    },
  };
}

// Plain-language summary of the roof for the panel.
export function describeRoof(model) {
  const { stats, grid } = model;
  const parts = [`${Math.round(stats.usableArea)} m² usable of ${Math.round(stats.roofArea)} m²`];
  if (stats.levels > 1) parts.push(`${stats.levels} flat levels`);
  if (stats.pitchedPlanes) parts.push(`${stats.pitchedPlanes} sloped plane${stats.pitchedPlanes > 1 ? 's' : ''}${stats.northPlanes ? ` (${stats.northPlanes} facing north, left out)` : ''}`);
  if (stats.obstacles) parts.push(`${stats.obstacles} tank / stair room${stats.obstacles > 1 ? 's' : ''} (${Math.round(stats.obstacleArea)} m²) kept clear`);
  return { source: grid.source === 'lod2' ? 'LoD2 roof model' : 'flat roof (recorded height)', text: parts.join(' · ') };
}

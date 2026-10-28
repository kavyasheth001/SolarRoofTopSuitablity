// Reads a building's real roof from the LoD2 model as a height grid.
//   ground: a ray cast upwards from below the ground hits the LoD2 building's base (true ground there);
//   roof:   the height of the LoD2 surface straight down at each grid point inside the footprint.
// Heights are returned relative to that ground, so they line up with the neighbours' recorded heights.
// Falls back to a flat LoD1 roof (recorded height) where LoD2 has no model for the building.
import * as Cesium from 'cesium';
import { geometryCentroid, inPolygon, localFrame, polygonsOf } from './solarAnalysis.js';

const MAX_POINTS = 3500;

/** Flat roof grid from a footprint and a height (designed buildings, and buildings LoD2 does not cover). */
export function flatRoofGrid(geometry, height, ground = 0) {
  return gridFor(geometry, (inside) => (inside ? height : NaN), ground, 'lod1');
}

function gridFor(geometry, heightAt, ground, source) {
  const center = geometryCentroid(geometry);
  const frame = localFrame(center);
  const parts = polygonsOf(geometry).map((rings) => rings.map((r) => r.map(frame.toXY)));
  const pts = parts.flatMap((p) => p[0]);
  const minX = Math.min(...pts.map((p) => p[0])); const maxX = Math.max(...pts.map((p) => p[0]));
  const minY = Math.min(...pts.map((p) => p[1])); const maxY = Math.max(...pts.map((p) => p[1]));
  const spacing = Math.max(0.75, Math.sqrt(((maxX - minX) * (maxY - minY)) / (MAX_POINTS * 1.3)));
  const nx = Math.max(1, Math.round((maxX - minX) / spacing)); const ny = Math.max(1, Math.round((maxY - minY) / spacing));
  const x0 = minX + spacing / 2; const y0 = minY + spacing / 2;
  const z = new Float32Array(nx * ny).fill(NaN);
  const inside = new Uint8Array(nx * ny);
  for (let iy = 0; iy < ny; iy++) {
    for (let ix = 0; ix < nx; ix++) {
      const x = x0 + ix * spacing; const y = y0 + iy * spacing;
      if (parts.some((rings) => inPolygon(x, y, rings))) inside[iy * nx + ix] = 1;
    }
  }
  for (let k = 0; k < z.length; k++) z[k] = heightAt(inside[k], k);
  return { source, center, frame, parts, ground, spacing, x0, y0, nx, ny, z, inside };
}

/**
 * @param engine  MapEngine (viewer, LoD1 primitive, LoD2 providers)
 * @param index   building index in engine.features
 * @param onProgress  (share 0..1) while sampling
 */
export async function sampleRoofFromLod2(engine, index, onProgress) {
  const feature = engine.features[index];
  const attrHeight = Math.max(Number(feature.properties.height) || 3, 3);
  const { viewer } = engine;
  const { scene } = viewer;
  let providers = [];
  try { providers = await engine.lod2Providers(); } catch { /* no LoD2 mirror: flat roof below */ }
  if (!providers.length) return flatRoofGrid(feature.geometry, attrHeight, engine.groundOf(index));

  const grid = gridFor(feature.geometry, () => NaN, 0, 'lod2');
  const toCarto = ([x, y]) => { const [lon, lat] = grid.frame.toLonLat([x, y]); return Cesium.Cartographic.fromDegrees(lon, lat); };

  // LoD2 must be drawn (at full detail here) for the samples; the reality mesh and our overlays must not be hit.
  const shown = providers.map((p) => p.show);
  providers.forEach((p) => { p.show = true; });
  const reality = engine.i3s.reality ? await engine.i3s.reality : [];
  const realityShown = reality.map((p) => p.show);
  reality.forEach((p) => { p.show = false; });
  const [clon, clat] = grid.center;
  const roofGuess = engine.groundOf(index) + attrHeight;
  const size = Math.max(grid.nx, grid.ny) * grid.spacing;
  viewer.camera.setView({
    destination: Cesium.Cartesian3.fromDegrees(clon, clat - (Math.max(90, size * 1.6) * 0.6) / 110540, roofGuess + Math.max(90, size * 1.6)),
    orientation: { heading: 0, pitch: Cesium.Math.toRadians(-58), roll: 0 },
  });
  await engine.waitForTiles(providers, 12000);
  const exclude = engine.overlays;

  try {
    // Ground: ray from below at the inside grid point nearest the centre.
    let best = -1; let bestD = Infinity;
    for (let k = 0; k < grid.z.length; k++) {
      if (!grid.inside[k]) continue;
      const x = grid.x0 + (k % grid.nx) * grid.spacing; const y = grid.y0 + Math.floor(k / grid.nx) * grid.spacing;
      const d = Math.hypot(x, y);
      if (d < bestD) { bestD = d; best = k; }
    }
    const bx = grid.x0 + (best % grid.nx) * grid.spacing; const by = grid.y0 + Math.floor(best / grid.nx) * grid.spacing;
    const c = toCarto([bx, by]);
    const below = Cesium.Cartesian3.fromRadians(c.longitude, c.latitude, -60);
    const above = Cesium.Cartesian3.fromRadians(c.longitude, c.latitude, 500);
    const up = Cesium.Cartesian3.normalize(Cesium.Cartesian3.subtract(above, below, new Cesium.Cartesian3()), new Cesium.Cartesian3());
    const baseHit = scene.pickFromRay(new Cesium.Ray(below, up), exclude);
    const ground = baseHit?.position ? Cesium.Cartographic.fromCartesian(baseHit.position).height : engine.groundOf(index);

    // Roof: LoD2 height at each grid point inside the footprint. If the detailed tiles are not in yet
    // (little of the roof found), keep rendering a little longer and read it once more.
    const insideTotal = grid.inside.reduce((t, v) => t + v, 0);
    const readRoof = async () => {
      let hits = 0; let n = 0;
      for (let k = 0; k < grid.z.length; k++) {
        if (!grid.inside[k]) continue;
        n++;
        const x = grid.x0 + (k % grid.nx) * grid.spacing; const y = grid.y0 + Math.floor(k / grid.nx) * grid.spacing;
        const h = scene.sampleHeight(toCarto([x, y]), exclude);
        if (Number.isFinite(h) && h - ground > 1.5) { grid.z[k] = h - ground; hits++; } else grid.z[k] = NaN;
        if (n % 400 === 0) { onProgress?.(n / insideTotal); await new Promise((r) => setTimeout(r, 0)); }
      }
      return insideTotal ? hits / insideTotal : 0;
    };
    let share = await readRoof();
    if (share < 0.5) {
      await engine.renderUntil(() => false, 3000);
      share = await readRoof();
    }
    grid.ground = ground;
    grid.lod2Share = share;
    // Too little of the footprint covered by LoD2: use the recorded height as a flat roof instead.
    if (grid.lod2Share < 0.5) return { ...flatRoofGrid(feature.geometry, attrHeight, ground), lod2Share: grid.lod2Share };
    return grid;
  } finally {
    providers.forEach((p, i) => { p.show = shown[i]; });
    reality.forEach((p, i) => { p.show = realityShown[i]; });
    engine.requestRender();
  }
}

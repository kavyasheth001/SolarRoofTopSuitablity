// List the Reality Model (I3S IntegratedMesh) segments in the web scene and which ones touch an area.
//   node tools/reality/inspect.mjs [minLon minLat maxLon maxLat]
import { getJson, webscene } from './portal.mjs';

const [minX, minY, maxX, maxY] = process.argv.length >= 6 ? process.argv.slice(2, 6).map(Number) : [72.833, 18.978, 72.869, 19.017]; // F/S ward

const found = [];
(function walk(layers, trail) {
  for (const l of layers || []) {
    const title = [...trail, l.title].join(' > ');
    if (l.layerType === 'IntegratedMeshLayer' || /reality/i.test(title)) found.push({ title, url: l.url, type: l.layerType });
    walk(l.layers, [...trail, l.title]);
  }
})((await webscene()).operationalLayers, []);

console.log(`${found.length} reality-mesh entries in the web scene`);
for (const f of found) {
  if (!f.url) { console.log(`  (group) ${f.title}`); continue; }
  try {
    const svc = await getJson(`${f.url.replace(/\/layers\/\d+$/, '')}?f=json`);
    const layer = svc.layers?.[0] || svc;
    const layerUrl = /\/layers\/\d+$/.test(f.url) ? f.url : `${f.url}/layers/${layer.id ?? 0}`;
    const info = await getJson(`${layerUrl}?f=json`);
    const e = info.fullExtent || info.store?.extent && { xmin: info.store.extent[0], ymin: info.store.extent[1], xmax: info.store.extent[2], ymax: info.store.extent[3] };
    const hits = e && e.xmin <= maxX && e.xmax >= minX && e.ymin <= maxY && e.ymax >= minY;
    console.log(`${hits ? 'HIT ' : '    '}${f.title}`);
    console.log(`      ${layerUrl}`);
    console.log(`      I3S ${info.store?.version || info.version} ${info.layerType} · extent ${e ? [e.xmin, e.ymin, e.xmax, e.ymax].map((v) => v.toFixed(4)).join(', ') : '?'} · wkid ${info.spatialReference?.wkid}/${info.spatialReference?.vcsWkid ?? ''} · nodePages ${info.nodePages ? `${info.nodePages.nodesPerPage}/page` : 'no'} · textures ${(info.textureSetDefinitions || []).map((t) => t.formats?.map((x) => x.format).join('+')).join(' | ')} · geometry ${(info.geometryDefinitions || []).map((g) => g.geometryBuffers?.map((b) => b.compressedAttributes?.encoding || 'raw').join('+')).join(' | ')}`);
  } catch (err) {
    console.log(`  ERR ${f.title}: ${err.message}`);
  }
}

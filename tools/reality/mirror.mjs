// Mirror the part of the Reality Model (I3S 1.7 IntegratedMesh) that covers an area onto the local static
// server, keeping the I3S REST layout so CesiumJS's I3SDataProvider reads it unchanged (no conversion).
//
//   node tools/reality/mirror.mjs --dry-run      # nodes per level, no download
//   node tools/reality/mirror.mjs                # F/S ward to level 12 + full detail in the showcase area
//   node tools/reality/mirror.mjs --max-level 14 --detail 72.840,18.996,72.852,19.008 --only BMC_Seg_03_Part_02_MM
//   node tools/reality/mirror.mjs --bbox 72.8455,19.0035,72.8495,19.0070   # a box instead of the ward outline
//   node tools/reality/mirror.mjs --group lod2   # vendor LoD2 buildings (I3S 1.9 3DObject, Draco), all levels
//
// The finest levels hold most of the data (levels 13-16, tiles a few metres across, were 78 % of a test), so
// outside the --detail box the tree stops at --max-level. A node whose children are not all kept is cut to a
// leaf, so the mesh never shows holes; it just stays coarser at the edges.
import fs from 'node:fs';
import path from 'node:path';
import { ROOT, getBytes, getJson, webscene } from './portal.mjs';

const args = Object.fromEntries(process.argv.slice(2).map((a, i, all) => (a.startsWith('--') ? [a.slice(2), all[i + 1] && !all[i + 1].startsWith('--') ? all[i + 1] : true] : null)).filter(Boolean));
const GROUP = args.group || 'reality';
const MAX_LEVEL = Number(args['max-level'] ?? (GROUP === 'lod2' ? 99 : 12));
const MANIFEST = GROUP === 'lod2' ? 'lod2-manifest.json' : 'manifest.json';
// Showcase area around Parel (Parekh Corporation, Lodha, One Avighna): about 1.2 x 1.3 km at full detail.
const DETAIL = (args.detail || '72.8410,18.9960,72.8530,19.0080').split(',').map(Number);
// Area: the F/S ward outline from the vector export, or a box.
const AREA = args.bbox
  ? (() => { const [a, b, c, d] = String(args.bbox).split(',').map(Number); return [[[a, b], [c, b], [c, d], [a, d], [a, b]]]; })()
  : JSON.parse(fs.readFileSync(path.join(ROOT, 'infra/data/export/ward_boundary.geojson'), 'utf8')).features
    .find((f) => f.properties.name === (args.ward || 'F/S')).geometry.coordinates;
const xs = AREA[0].map((c) => c[0]); const ys = AREA[0].map((c) => c[1]);
const [minX, minY, maxX, maxY] = [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)];
const OUT = path.join(ROOT, 'infra/data/static/i3s');
const CONCURRENCY = Number(args.concurrency || 8);
const M_PER_DEG = 111320;

async function segments() {
  const list = [];
  const wanted = GROUP === 'lod2'
    ? (l, trail) => /^LoD 2 without Texture$/i.test(trail[0] || '') && /SceneServer/.test(l.url || '')
    : (l) => l.layerType === 'IntegratedMeshLayer';
  (function walk(layers, trail) {
    for (const l of layers || []) {
      if (l.url && wanted(l, trail)) list.push({ title: l.title, url: l.url.replace(/\/layers\/\d+$/, '') });
      walk(l.layers, [...trail, l.title]);
    }
  })((await webscene()).operationalLayers, []);
  return list;
}

// A node's oriented box is treated as a circle (its full diagonal as radius), so the test is conservative.
function nodeCircle(obb) {
  const [lon, lat] = obb.center;
  return { lon, lat, r: Math.hypot(...obb.halfSize), kx: M_PER_DEG * Math.cos((lat * Math.PI) / 180) };
}

function inRing(x, y, ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i]; const [xj, yj] = ring[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

// Distance in metres from a point to the outline, in a local plane around the point.
function distanceToRing({ lon, lat, kx }, ring) {
  let best = Infinity;
  for (let i = 1; i < ring.length; i++) {
    const ax = (ring[i - 1][0] - lon) * kx; const ay = (ring[i - 1][1] - lat) * M_PER_DEG;
    const bx = (ring[i][0] - lon) * kx; const by = (ring[i][1] - lat) * M_PER_DEG;
    const dx = bx - ax; const dy = by - ay;
    const t = Math.max(0, Math.min(1, -(ax * dx + ay * dy) / (dx * dx + dy * dy || 1)));
    best = Math.min(best, Math.hypot(ax + t * dx, ay + t * dy));
  }
  return best;
}

function touchesArea(obb) {
  const c = nodeCircle(obb);
  const dLon = c.r / c.kx; const dLat = c.r / M_PER_DEG;
  if (c.lon - dLon > maxX || c.lon + dLon < minX || c.lat - dLat > maxY || c.lat + dLat < minY) return false;
  return inRing(c.lon, c.lat, AREA[0]) || distanceToRing(c, AREA[0]) <= c.r;
}

function touchesDetail(obb) {
  const c = nodeCircle(obb);
  const dLon = c.r / c.kx; const dLat = c.r / M_PER_DEG;
  return c.lon - dLon <= DETAIL[2] && c.lon + dLon >= DETAIL[0] && c.lat - dLat <= DETAIL[3] && c.lat + dLat >= DETAIL[1];
}

async function pool(items, fn) {
  let i = 0;
  await Promise.all(Array.from({ length: CONCURRENCY }, async () => {
    while (i < items.length) { const item = items[i++]; await fn(item); }
  }));
}

function write(file, data) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, data);
}

async function mirrorSegment(seg) {
  const name = seg.url.match(/([^/]+)\/SceneServer/)[1];
  const service = await getJson(`${seg.url}?f=json`);
  const layerUrl = `${seg.url}/layers/0`;
  const layer = await getJson(`${layerUrl}?f=json`);
  const perPage = layer.nodePages.nodesPerPage;

  // Walk the tree from the root and follow only children that touch the area, so only the node pages
  // holding those nodes are read (a segment has up to ~2,000+ pages of 64 nodes).
  const pageCache = new Map(); // page number → Promise<nodes[]>
  const readPage = (page) => {
    if (!pageCache.has(page)) pageCache.set(page, getJson(`${layerUrl}/nodepages/${page}?f=json`).then((j) => j.nodes));
    return pageCache.get(page);
  };
  const nodeAt = async (i) => (await readPage(Math.floor(i / perPage)))[i % perPage];
  // A node refines (its children are kept) only if it touches the area and every child is within the level
  // cap or the detail box. Children outside the area are kept as leaves, so the mesh never shows holes.
  const keep = new Set([0]);
  const leaf = new Set();
  const levels = {};
  let frontier = [{ node: await nodeAt(0), level: 0 }];
  while (frontier.length) {
    await pool([...new Set(frontier.flatMap((f) => (f.node.children || []).map((c) => Math.floor(c / perPage))))], (p) => readPage(p));
    const next = [];
    for (const { node, level } of frontier) {
      levels[level] = (levels[level] || 0) + 1;
      const kids = await Promise.all((node.children || []).map(nodeAt));
      const refine = touchesArea(node.obb) && kids.length > 0
        && kids.every((k) => k && (level + 1 <= MAX_LEVEL || touchesDetail(k.obb)));
      if (!refine) { leaf.add(node.index); continue; }
      for (const k of kids) { keep.add(k.index); next.push({ node: k, level: level + 1 }); }
    }
    frontier = next;
  }
  console.log(`   nodes per level: ${Object.entries(levels).map(([l, n]) => `${l}:${n}`).join(' ')}`);
  const nodes = (await Promise.all([...pageCache.values()])).flat();
  const kept = nodes.filter((n) => keep.has(n.index) && n.mesh);
  const resources = [];
  for (const n of kept) {
    const res = n.mesh.geometry?.resource ?? n.index;
    const geomDef = layer.geometryDefinitions?.[n.mesh.geometry?.definition ?? 0];
    // Cesium reads the Draco buffer when there is one, so only that one is mirrored.
    const buffers = geomDef?.geometryBuffers || [{}];
    const draco = buffers.map((b, i) => (b.compressedAttributes ? i : -1)).filter((i) => i >= 0);
    (draco.length ? draco : buffers.map((_, i) => i)).forEach((b) => resources.push(`nodes/${res}/geometries/${b}`));
    const matRes = n.mesh.material?.resource ?? res;
    const matDef = layer.materialDefinitions?.[n.mesh.material?.definition ?? 0];
    const texSet = layer.textureSetDefinitions?.[matDef?.pbrMetallicRoughness?.baseColorTexture?.textureSetDefinitionId ?? 0];
    if (texSet) texSet.formats.forEach((f) => resources.push(`nodes/${matRes}/textures/${f.name}`));
  }
  console.log(`${name}: ${pageCache.size} node pages read, ${keep.size} nodes touch the area, ${resources.length} files`);
  if (!kept.length) return { name, files: 0, bytes: 0 };

  if (args['dry-run']) {
    // Size from the vertex counts in the node pages: geometry + JPEG texture came to ~142 bytes per vertex
    // on a 1.76 GB test download of this mesh (sampling files was biased towards small tiles).
    const est = kept.reduce((sum, n) => sum + (n.mesh.geometry?.vertexCount || 0), 0) * 142;
    console.log(`   estimated ${(est / 1e9).toFixed(2)} GB`);
    return { name, files: resources.length, bytes: est };
  }

  const dir = path.join(OUT, name, 'SceneServer');
  // Service + layer documents, and node pages with children outside the area removed.
  write(path.join(dir, 'index.json'), JSON.stringify(service));
  write(path.join(dir, 'layers/0/index.json'), JSON.stringify(layer));
  for (const [p, pagePromise] of pageCache) {
    const pageNodes = (await pagePromise).map((n) => (keep.has(n.index)
      ? { ...n, children: leaf.has(n.index) ? [] : (n.children || []) }
      : { index: n.index, obb: n.obb, lodThreshold: n.lodThreshold, children: [] }));
    write(path.join(dir, `layers/0/nodepages/${p}`), JSON.stringify({ nodes: pageNodes }));
  }
  let bytes = 0; let done = 0; let skipped = 0;
  await pool(resources, async (r) => {
    const file = path.join(dir, 'layers/0', r);
    if (fs.existsSync(file)) { skipped++; bytes += fs.statSync(file).size; done++; return; }
    try {
      const { bytes: data } = await getBytes(`${layerUrl}/${r}`);
      write(file, data);
      bytes += data.length;
    } catch (err) {
      console.warn(`   skip ${r}: ${err.message.replace(/token=[^&\s]+/g, 'token=…')}`);
    }
    if (++done % 500 === 0) console.log(`   ${done}/${resources.length} files, ${(bytes / 1e9).toFixed(2)} GB`);
  });
  console.log(`   done: ${done} files (${skipped} already present), ${(bytes / 1e9).toFixed(2)} GB`);
  return { name, files: done, bytes };
}

const all = await segments();
const chosen = all.filter((s) => !args.only || String(args.only).split(',').some((o) => s.url.includes(`/${o}/`)));
const results = [];
for (const seg of chosen) {
  const layer = await getJson(`${seg.url}/layers/0?f=json`);
  const [xmin, ymin, xmax, ymax] = layer.store?.extent || [];
  const e = layer.fullExtent || { xmin, ymin, xmax, ymax };
  if (!(e.xmin <= maxX && e.xmax >= minX && e.ymin <= maxY && e.ymax >= minY)) continue;
  results.push(await mirrorSegment(seg));
  // Update the manifest after each segment so the map can show what is already there.
  if (!args['dry-run']) {
    const manifestFile = path.join(OUT, MANIFEST);
    const prev = fs.existsSync(manifestFile) ? JSON.parse(fs.readFileSync(manifestFile, 'utf8')).segments : [];
    const segs = [...new Set([...prev, ...results.filter((r) => r.files).map((r) => r.name)])];
    write(manifestFile, JSON.stringify({ bbox: [minX, minY, maxX, maxY], segments: segs, updated: new Date().toISOString() }, null, 2));
  }
}
const total = results.reduce((s, r) => s + r.bytes, 0);
console.log(`\nTotal: ${results.filter((r) => r.files).length} segments, ${(total / 1e9).toFixed(2)} GB${args['dry-run'] ? ' (estimate)' : ''}`);

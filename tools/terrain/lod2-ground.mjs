// Collect true ground heights from the LoD2 building models, for a bare-earth terrain.
//
// The Copernicus GLO-30 DEM is a surface model: in dense Mumbai blocks it sits 3-9 m above the street, which
// buries LoD2 buildings and the Reality Mesh. Each LoD2 building mesh, though, reaches down to its real ground,
// so a ray cast upwards from below the ground hits the building's base at the true ground height.
//
// Usage (the map must be running, with GeoServer and the LoD2 mirror):
//   1. node tools/terrain/lod2-ground.mjs            (listens on http://localhost:8790)
//   2. open http://localhost:8080/mumbai/solarsight/map and, in the browser console, run
//        await fetch('http://localhost:8790/snippet.js').then((r) => r.text()).then(eval)
//   3. the page casts one ray per building and posts the results; they are written to
//      infra/data/terrain_src/lod2_ground.csv (lon,lat,ground_m,roof_m,height_attr_m) and the server exits.
//   4. bash tools/terrain/build-terrain.sh   (uses the CSV for the F/S bare-earth surface)
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const OUT = path.join(ROOT, 'infra/data/terrain_src/lod2_ground.csv');
const PORT = 8790;

// Runs in the map page (dev build exposes window.__solarsightEngine).
const SNIPPET = `(async () => {
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const e = window.__solarsightEngine; const v = e.viewer;
  e.setModels({ ...e.models, lod2: true });
  await e.i3s.lod2;
  e.goHome(0);
  for (let k = 0; k < 40; k++) { v.scene.requestRender(); await wait(250); }
  const E = v.scene.globe.ellipsoid; const C3 = v.camera.position.constructor;
  const Ray = v.camera.getPickRay({ x: 1, y: 1 }).constructor;
  const rad = Math.PI / 180;
  const at = (lon, lat, h) => E.cartographicToCartesian({ longitude: lon * rad, latitude: lat * rad, height: h });
  const inRing = (x, y, ring) => { let s = false; for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) { const [a, b] = ring[i]; const [c, d] = ring[j]; if ((b > y) !== (d > y) && x < ((c - a) * (y - b)) / (d - b) + a) s = !s; } return s; };
  const rows = [];
  for (let i = 0; i < e.features.length; i++) {
    const f = e.features[i]; const g = f.geometry;
    const ring = (g.type === 'MultiPolygon' ? g.coordinates[0] : g.coordinates)[0];
    let lon = ring.reduce((s, c) => s + c[0], 0) / ring.length; let lat = ring.reduce((s, c) => s + c[1], 0) / ring.length;
    if (!inRing(lon, lat, ring)) { // concave footprint: use the middle of the first edge, nudged inwards
      const [a, b] = ring; lon = (a[0] + b[0]) / 2 + (lon - (a[0] + b[0]) / 2) * 0.1; lat = (a[1] + b[1]) / 2 + (lat - (a[1] + b[1]) / 2) * 0.1;
    }
    const lo = at(lon, lat, -60); const hi = at(lon, lat, 400);
    const upDir = C3.normalize(C3.subtract(hi, lo, new C3()), new C3());
    const base = v.scene.pickFromRay(new Ray(lo, upDir), [e.primitive]);
    const top = v.scene.pickFromRay(new Ray(hi, C3.negate(upDir, new C3())), [e.primitive]);
    const h = (r) => (r && r.position ? E.cartesianToCartographic(r.position).height : null);
    const gz = h(base); const rz = h(top);
    if (gz != null && rz != null && rz > gz) rows.push([lon.toFixed(6), lat.toFixed(6), gz.toFixed(2), rz.toFixed(2), Number(f.properties.height).toFixed(2)].join(','));
    if (i % 500 === 0) { console.log('lod2 ground', i, '/', e.features.length); await wait(0); }
  }
  await fetch('http://localhost:${PORT}/ground', { method: 'POST', body: rows.join('\\n') });
  console.log('lod2 ground: sent', rows.length, 'points');
})();`;

http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'GET' && req.url === '/snippet.js') { res.end(SNIPPET); return; }
  if (req.method === 'POST' && req.url === '/ground') {
    let body = '';
    req.on('data', (c) => { body += c; });
    req.on('end', () => {
      fs.mkdirSync(path.dirname(OUT), { recursive: true });
      fs.writeFileSync(OUT, `lon,lat,ground_m,roof_m,height_attr_m\n${body}\n`);
      console.log(`wrote ${body.split('\n').length} points to ${path.relative(ROOT, OUT)}`);
      res.end('ok');
      setTimeout(() => process.exit(0), 200);
    });
    return;
  }
  res.statusCode = 404; res.end();
}).listen(PORT, () => console.log(`waiting for LoD2 ground points on http://localhost:${PORT}`));

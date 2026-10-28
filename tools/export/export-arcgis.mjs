#!/usr/bin/env node
// Export ArcGIS feature/map-service layers, clipped to one area (default: F/S ward), as GeoJSON.
//
//   node tools/export/export-arcgis.mjs --config tools/export/fs-layers.json --pilot
//   node tools/export/export-arcgis.mjs --config tools/export/fs-layers.json --only building_new,heritage
//
// Credentials are read from the project .env (VITE_PORTAL_URL / _USERNAME / _PASSWORD) and are
// never printed or written anywhere. Output: infra/data/export/<name>.geojson + manifest.json.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const REFERER = 'http://localhost:8080';

const args = Object.fromEntries(
  process.argv.slice(2).map((a, i, all) => a.startsWith('--') ? [a.slice(2), all[i + 1]?.startsWith('--') || all[i + 1] == null ? true : all[i + 1]] : null).filter(Boolean),
);
const config = JSON.parse(fs.readFileSync(path.resolve(ROOT, args.config || 'tools/export/fs-layers.json'), 'utf8'));
const outDir = path.resolve(ROOT, args.out || 'infra/data/export');
fs.mkdirSync(outDir, { recursive: true });

function readEnv(file) {
  const env = {};
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m) env[m[1]] = m[2].replace(/^['"]|['"]$/g, '');
  }
  return env;
}
const env = readEnv(path.join(ROOT, '.env'));

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function post(url, params, { retries = 4 } = {}) {
  for (let attempt = 0; ; attempt++) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded', Referer: REFERER },
        body: new URLSearchParams(params),
      });
      const text = await res.text();
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = JSON.parse(text);
      if (json.error) throw new Error(`${json.error.code}: ${json.error.message}`);
      return json;
    } catch (err) {
      if (attempt >= retries) throw err;
      await sleep(1000 * 2 ** attempt);
    }
  }
}

// One token per portal; servers federated with bmc3dmumbai.com accept its portal token.
const tokens = new Map();
async function tokenFor(url) {
  const host = new URL(url).host;
  if (host !== new URL(env.VITE_PORTAL_URL).host) return null; // other hosts: try anonymous
  if (!tokens.has(host)) {
    const t = await post(`${env.VITE_PORTAL_URL}/portal/sharing/rest/generateToken`, {
      username: env.VITE_PORTAL_USERNAME, password: env.VITE_PORTAL_PASSWORD,
      referer: REFERER, expiration: 120, f: 'json',
    });
    tokens.set(host, t.token);
  }
  return tokens.get(host);
}

async function call(url, params) {
  const token = await tokenFor(url);
  return post(url, token ? { ...params, token } : params);
}

async function main() {
  const area = config.area;
  const boundary = await call(`${area.boundaryUrl}/query`, { where: area.where, outFields: '*', outSR: 4326, returnGeometry: true, f: 'json' });
  if (!boundary.features?.length) throw new Error(`Area not found: ${area.where}`);
  const areaGeom = JSON.stringify({ ...boundary.features[0].geometry, spatialReference: { wkid: 4326 } });
  console.log(`Area: ${area.name} (${boundary.features[0].geometry.rings[0].length} vertices)`);

  const only = typeof args.only === 'string' ? new Set(args.only.split(',')) : null;
  const layers = config.layers.filter((l) => (only ? only.has(l.name) : args.pilot ? l.pilot : true));
  const manifestPath = path.join(outDir, 'manifest.json');
  const manifest = fs.existsSync(manifestPath) ? JSON.parse(fs.readFileSync(manifestPath, 'utf8')) : {};

  for (const layer of layers) {
    const t0 = Date.now();
    try {
      const info = await call(layer.url, { f: 'json' });
      const oid = info.objectIdField || info.fields?.find((f) => f.type === 'esriFieldTypeOID')?.name || 'objectid';
      const pageSize = Math.min(info.maxRecordCount || 1000, 2000);
      const spatial = { geometry: areaGeom, geometryType: 'esriGeometryPolygon', inSR: 4326, spatialRel: 'esriSpatialRelIntersects' };
      const { count } = await call(`${layer.url}/query`, { where: '1=1', ...spatial, returnCountOnly: true, f: 'json' });

      const file = path.join(outDir, `${layer.name}.geojson`);
      const out = fs.createWriteStream(file);
      out.write('{"type":"FeatureCollection","features":[\n');
      let written = 0;
      for (let offset = 0; offset < count; offset += pageSize) {
        const page = await call(`${layer.url}/query`, {
          where: '1=1', ...spatial, outFields: layer.outFields || '*', outSR: 4326, returnGeometry: true,
          orderByFields: oid, resultOffset: offset, resultRecordCount: pageSize, f: 'geojson',
        });
        for (const f of page.features || []) out.write((written++ ? ',\n' : '') + JSON.stringify(f));
        process.stdout.write(`\r  ${layer.name}: ${written}/${count}`);
      }
      out.write('\n]}\n');
      await new Promise((r) => out.end(r));
      const mb = fs.statSync(file).size / 1048576;
      const ok = written === count;
      manifest[layer.name] = { url: layer.url, area: area.name, count, written, ok, mb: +mb.toFixed(2), geometryType: info.geometryType, exportedAt: new Date().toISOString() };
      console.log(`\r  ${ok ? 'OK ' : 'MISMATCH'} ${layer.name}: ${written}/${count} features, ${mb.toFixed(1)} MB, ${((Date.now() - t0) / 1000).toFixed(1)} s`);
    } catch (err) {
      manifest[layer.name] = { url: layer.url, area: area.name, ok: false, error: String(err.message || err).slice(0, 200), exportedAt: new Date().toISOString() };
      console.log(`\r  FAILED ${layer.name}: ${err.message}`);
    }
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  }
}

main().catch((err) => { console.error(err.message); process.exit(1); });

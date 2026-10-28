// Copies CesiumJS runtime assets (workers, widgets CSS, textures) into public/cesium so Vite serves
// them as plain static files at /mumbai/cesium/. Run after `npm install` (also wired to predev/prebuild).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const src = path.join(root, 'node_modules', 'cesium', 'Build', 'Cesium');
const dest = path.join(root, 'public', 'cesium');

for (const dir of ['Workers', 'ThirdParty', 'Assets', 'Widgets']) {
  fs.cpSync(path.join(src, dir), path.join(dest, dir), { recursive: true });
}
console.log(`Cesium assets copied to ${path.relative(root, dest)}`);

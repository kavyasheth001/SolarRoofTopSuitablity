// Shared helpers for the Reality Mesh tools: .env credentials (never printed), portal tokens, JSON/binary fetch.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const REFERER = 'http://localhost:8080';

function readEnv(file) {
  const env = {};
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m) env[m[1]] = m[2].replace(/^['"]|['"]$/g, '');
  }
  return env;
}
export const env = readEnv(path.join(ROOT, '.env'));

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function withRetry(fn, retries = 4) {
  for (let attempt = 0; ; attempt++) {
    try {
      return await fn();
    } catch (err) {
      if (attempt >= retries || err.permanent) throw err;
      await sleep(800 * 2 ** attempt);
    }
  }
}

// Both portals: the primary (bmc3dmumbai.com) and the vendor's (3D content).
const portals = [
  { base: `${env.VITE_PORTAL_URL}/portal`, user: env.VITE_PORTAL_USERNAME, pass: env.VITE_PORTAL_PASSWORD },
  { base: env.VITE_SECOND_PORTAL_URL, user: env.VITE_SECOND_PORTAL_USERNAME, pass: env.VITE_SECOND_PORTAL_PASSWORD },
].filter((p) => p.base && p.user);

const tokens = new Map(); // host → { token, expires }
async function tokenForHost(host) {
  const cached = tokens.get(host);
  if (cached && cached.expires > Date.now() + 60_000) return cached.token;
  const portal = portals.find((p) => new URL(p.base).host === host);
  if (!portal) return null;
  const res = await fetch(`${portal.base}/sharing/rest/generateToken`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Referer: REFERER },
    body: new URLSearchParams({ username: portal.user, password: portal.pass, referer: REFERER, expiration: 120, f: 'json' }),
  });
  const json = await res.json();
  if (!json.token) throw new Error(`token request to ${host} failed: ${json.error?.message || res.status}`);
  tokens.set(host, { token: json.token, expires: json.expires });
  return json.token;
}

function withToken(url, token) {
  if (!token) return url;
  const u = new URL(url);
  u.searchParams.set('token', token);
  return u.toString();
}

async function request(url) {
  return withRetry(async () => {
    const token = await tokenForHost(new URL(url).host);
    const res = await fetch(withToken(url, token), { headers: { Referer: REFERER }, signal: AbortSignal.timeout(60_000) });
    if (res.status === 404) { const e = new Error(`404 ${url}`); e.permanent = true; throw e; }
    if (!res.ok) throw new Error(`HTTP ${res.status} ${url}`);
    return res;
  });
}

export async function getJson(url) {
  // The server now and then answers 200 with an empty body; retry that like a network error.
  const json = await withRetry(async () => JSON.parse(await (await request(url)).text()));
  if (json.error) throw new Error(`${json.error.code}: ${json.error.message} (${url})`);
  return json;
}

export async function getBytes(url) {
  const res = await request(url);
  return { bytes: Buffer.from(await res.arrayBuffer()), type: res.headers.get('content-type') };
}

export async function webscene() {
  return getJson(`${env.VITE_PORTAL_URL}/portal/sharing/rest/content/items/${env.VITE_WEBSCENE_ID}/data?f=json`);
}

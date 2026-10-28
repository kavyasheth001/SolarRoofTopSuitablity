// GeoServer WFS queries used by the solar tool. POST is used because footprints can have hundreds of
// vertices, which would overflow a GET URL.
import { OWS_URL, BUILDINGS_TYPE } from '../config';
import { NEIGHBOUR_RADIUS_M } from './solarAnalysis';

const PROPS = 'geom,name,class,sub_class,no_floors,height,area_sqmtr,bld_id,address';

async function getFeatures(params) {
  const body = new URLSearchParams({
    service: 'WFS', version: '2.0.0', request: 'GetFeature', typeNames: BUILDINGS_TYPE,
    outputFormat: 'application/json', srsName: 'EPSG:4326', propertyName: PROPS, ...params,
  });
  const res = await fetch(OWS_URL, { method: 'POST', body });
  const text = await res.text();
  if (!res.ok || !text.startsWith('{')) throw new Error(text.match(/ExceptionText>([^<]*)/)?.[1] || `WFS ${res.status}`);
  return JSON.parse(text).features;
}

const cqlString = (s) => `'${String(s).replace(/'/g, "''")}'`;

// EWKT keeps lon/lat axis order in CQL (plain WKT in EPSG:4326 is read as lat/lon by GeoServer 3).
export function toEwkt(geometry) {
  const ring = (r) => `(${r.map(([x, y]) => `${x.toFixed(7)} ${y.toFixed(7)}`).join(',')})`;
  const poly = (rings) => `(${rings.map(ring).join(',')})`;
  const body = geometry.type === 'MultiPolygon'
    ? `MULTIPOLYGON(${geometry.coordinates.map(poly).join(',')})`
    : `POLYGON${poly(geometry.coordinates)}`;
  return `SRID=4326;${body}`;
}

export const gidOf = (feature) => Number(String(feature?.id ?? '').split('.').pop());

export function searchBuildings(term) {
  const like = cqlString(`%${term.trim()}%`);
  return getFeatures({
    CQL_FILTER: `name ILIKE ${like} OR address ILIKE ${like} OR bld_id ILIKE ${like}`,
    count: '12',
    sortBy: 'height DESC',
  });
}

/**
 * Buildings within 200 m of a footprint that are taller than `minHeight` (shorter ones cannot shade the roof).
 * `excludeGid` skips the building itself; `replaceUnder` drops buildings under a new footprint (designed mode).
 */
export function fetchNeighbours({ geometry, minHeight, excludeGid, replaceUnder = false }) {
  const shape = toEwkt(geometry);
  const parts = [`DWITHIN(geom,${shape},${NEIGHBOUR_RADIUS_M},meters)`, `height > ${Number(minHeight) || 0}`];
  if (Number.isFinite(excludeGid)) parts.push(`gid <> ${excludeGid}`);
  if (replaceUnder) parts.push(`NOT INTERSECTS(geom,${shape})`);
  return getFeatures({ CQL_FILTER: parts.join(' AND ') });
}

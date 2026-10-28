// Endpoints and shared settings of the GeoServer map module (kept apart from the ArcGIS app's config).
import registry from './layers/registry.json';

export const GEOSERVER = import.meta.env.VITE_GEOSERVER_URL || 'http://localhost:8600/geoserver';
export const OWS_URL = `${GEOSERVER}/${registry.workspace}/ows`;
export const WMS_URL = `${GEOSERVER}/${registry.workspace}/wms`;
export const BUILDINGS_TYPE = `${registry.workspace}:building_new`;
// Local static server (infra nginx): quantized-mesh terrain built from Copernicus GLO-30 for the Mumbai region.
export const STATIC = import.meta.env.VITE_STATIC_URL || 'http://localhost:8601';

// Day presets shared by the sun controls and the solar tool: [month (0-based), day], null = today.
export const SEASONS = {
  today: { label: 'Today', md: null },
  summer: { label: 'Summer solstice (21 Jun)', md: [5, 21] },
  equinox: { label: 'Equinox (21 Mar)', md: [2, 21] },
  monsoon: { label: 'Monsoon (15 Aug)', md: [7, 15] },
  winter: { label: 'Winter solstice (21 Dec)', md: [11, 21] },
};

export function seasonMonthDay(season) {
  const now = new Date();
  return SEASONS[season]?.md || [now.getMonth(), now.getDate()];
}

// Day of year (1 = 1 Jan), the convention used by src/utils/solarEngine.js.
export function seasonDayOfYear(season) {
  const year = new Date().getFullYear();
  const [m, d] = seasonMonthDay(season);
  return Math.round((Date.UTC(year, m, d) - Date.UTC(year, 0, 0)) / 86400000);
}

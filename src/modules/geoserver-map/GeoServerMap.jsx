// GeoServer map (separate page, independent of the ArcGIS app): F/S ward data served by our own GeoServer and drawn without
// the ArcGIS SDK. Left: OpenLayers (2D, GeoServer WMS). Right: CesiumJS (3D, buildings extruded from
// GeoServer WFS, real sun position and shadows). No Cesium ion services are used.
import { useEffect, useRef, useState } from 'react';
import * as Cesium from 'cesium';
import 'cesium/Build/Cesium/Widgets/widgets.css';
import OlMap from 'ol/Map';
import OlView from 'ol/View';
import TileLayer from 'ol/layer/Tile';
import OSM from 'ol/source/OSM';
import TileWMS from 'ol/source/TileWMS';
import { fromLonLat, toLonLat } from 'ol/proj';
import 'ol/ol.css';
import registry from './layers/registry.json';
import { GEOSERVER, STATIC, SEASONS, seasonMonthDay } from './config';
import SolarPanel, { buildingName } from './solar/SolarPanel';

window.CESIUM_BASE_URL = `${import.meta.env.BASE_URL.replace(/\/$/, '')}/cesium/`;

const TERRAIN_URL = `${STATIC}/terrain/mumbai-cop30`;
const HILLSHADE_LAYER = `${registry.workspace}:mumbai_hillshade`;
const DEM_CREDIT = 'Terrain: Copernicus DEM GLO-30 © DLR e.V. 2010-2014 and © Airbus Defence and Space GmbH 2014-2018, provided under COPERNICUS by the EU and ESA';
const FS_CENTER = [72.8506, 18.9975];
const IST_OFFSET_H = 5.5;
const SHADOW_CASTER = Cesium.Color.fromCssColorString('#e11d48'); // distinct from the amber height classes

// Registry order is draw order (bottom → top), so the WMS LAYERS list keeps it.
const wmsList = (visible, skip = []) =>
  registry.layers.filter((l) => visible.has(l.id) && !skip.includes(l.id)).map((l) => `${registry.workspace}:${l.id}`).join(',');

const swatch = (l) => l.fill || l.point || l.rules?.[0]?.fill || l.stroke;

function heightColor(h) {
  if (h >= 100) return Cesium.Color.fromCssColorString('#b45309');
  if (h >= 45) return Cesium.Color.fromCssColorString('#f59e0b');
  if (h >= 15) return Cesium.Color.fromCssColorString('#cbd5e1');
  return Cesium.Color.fromCssColorString('#f1f5f9');
}

function istToJulian(season, hour) {
  const now = new Date();
  const [m, d] = seasonMonthDay(season);
  const minutes = Math.round((hour - IST_OFFSET_H) * 60);
  return Cesium.JulianDate.fromDate(new Date(Date.UTC(now.getFullYear(), m, d, 0, minutes)));
}

async function fetchBuildings() {
  const params = new URLSearchParams({
    service: 'WFS', version: '2.0.0', request: 'GetFeature', typeNames: 'bmc:building_new',
    outputFormat: 'application/json', srsName: 'EPSG:4326',
    propertyName: 'geom,name,class,sub_class,no_floors,height,area_sqmtr,bld_id,address',
  });
  const res = await fetch(`${GEOSERVER}/bmc/ows?${params}`);
  if (!res.ok) throw new Error(`WFS ${res.status}`);
  return res.json();
}

// Ground height under each building, sampled from the terrain at the footprint's first-ring centroid,
// so blocks sit on the hills instead of on the flat ellipsoid.
async function sampleGroundHeights(terrainProvider, features) {
  if (!terrainProvider || terrainProvider instanceof Cesium.EllipsoidTerrainProvider) return features.map(() => 0);
  const points = features.map((f) => {
    const ring = (f.geometry.type === 'MultiPolygon' ? f.geometry.coordinates[0] : f.geometry.coordinates)[0];
    const lon = ring.reduce((s, c) => s + c[0], 0) / ring.length;
    const lat = ring.reduce((s, c) => s + c[1], 0) / ring.length;
    return Cesium.Cartographic.fromDegrees(lon, lat);
  });
  try {
    const sampled = await Cesium.sampleTerrainMostDetailed(terrainProvider, points);
    return sampled.map((p) => (Number.isFinite(p.height) ? p.height : 0));
  } catch {
    return features.map(() => 0);
  }
}

// Returns the primitive and, per feature, the ids of its geometry instances (needed to recolour it).
function buildPrimitive(features, groundHeights) {
  const instances = [];
  const instanceIds = features.map(() => []);
  features.forEach((f, i) => {
    const h = Math.max(Number(f.properties.height) || 3, 3);
    const base = groundHeights[i] || 0;
    const polys = f.geometry.type === 'MultiPolygon' ? f.geometry.coordinates : [f.geometry.coordinates];
    polys.forEach((rings, j) => {
      const id = { index: i, part: j };
      instanceIds[i].push(id);
      const outer = Cesium.Cartesian3.fromDegreesArray(rings[0].flat());
      const holes = rings.slice(1).map((r) => new Cesium.PolygonHierarchy(Cesium.Cartesian3.fromDegreesArray(r.flat())));
      instances.push(new Cesium.GeometryInstance({
        id,
        geometry: new Cesium.PolygonGeometry({
          polygonHierarchy: new Cesium.PolygonHierarchy(outer, holes),
          height: base,
          extrudedHeight: base + h,
          vertexFormat: Cesium.PerInstanceColorAppearance.VERTEX_FORMAT,
        }),
        attributes: { color: Cesium.ColorGeometryInstanceAttribute.fromColor(heightColor(h)) },
      }));
    });
  });
  const primitive = new Cesium.Primitive({
    geometryInstances: instances,
    appearance: new Cesium.PerInstanceColorAppearance({ translucent: false, closed: true, flat: false }),
    shadows: Cesium.ShadowMode.ENABLED,
    releaseGeometryInstances: false,
    asynchronous: true,
  });
  return { primitive, instanceIds };
}

export default function GeoServerMap() {
  const olRef = useRef(null);
  const csRef = useRef(null);
  const viewerRef = useRef(null);
  const featuresRef = useRef([]);
  const primitiveRef = useRef(null);
  const instanceIdsRef = useRef([]);
  const groundRef = useRef([]);
  const gidIndexRef = useRef(new Map()); // WFS feature id -> index in featuresRef
  const selectedIndexRef = useRef(null);
  const tintRef = useRef(new Set()); // indices drawn as shadow casters
  const interactionRef = useRef(null); // 'draw' while the solar tool is drawing a footprint
  const solarOpenRef = useRef(false);
  const [status, setStatus] = useState('Loading buildings from GeoServer…');
  const [count, setCount] = useState(0);
  const [hour, setHour] = useState(9);
  const [season, setSeason] = useState('today');
  const [shadows, setShadows] = useState(true);
  const [picked, setPicked] = useState(null);
  const [visible, setVisible] = useState(() => new Set(registry.layers.filter((l) => l.visible).map((l) => l.id)));
  const [counts, setCounts] = useState({});
  const [panelOpen, setPanelOpen] = useState(true);
  const [solarOpen, setSolarOpen] = useState(false);
  solarOpenRef.current = solarOpen;
  const olWmsRef = useRef(null);
  const csOverlayRef = useRef(null);

  // Building colour: selected (cyan) > shadow caster (red) > height class.
  const paint = (index) => {
    const prim = primitiveRef.current;
    const f = featuresRef.current[index];
    if (!prim?.ready || !f) return;
    const color = selectedIndexRef.current === index ? Cesium.Color.CYAN
      : tintRef.current.has(index) ? SHADOW_CASTER : heightColor(Math.max(Number(f.properties.height) || 3, 3));
    instanceIdsRef.current[index]?.forEach((id) => {
      const attrs = prim.getGeometryInstanceAttributes(id);
      if (attrs) attrs.color = Cesium.ColorGeometryInstanceAttribute.toValue(color);
    });
    viewerRef.current?.scene.requestRender();
  };

  const selectIndex = (index) => {
    const prev = selectedIndexRef.current;
    selectedIndexRef.current = index;
    if (prev != null) paint(prev);
    if (index == null) { setPicked(null); return; }
    paint(index);
    setPicked({ index, feature: featuresRef.current[index] });
  };

  const flyToFeature = (feature, pitchDeg = -35) => {
    const ring = (feature.geometry.type === 'MultiPolygon' ? feature.geometry.coordinates[0] : feature.geometry.coordinates)[0];
    const lon = ring.reduce((s, c) => s + c[0], 0) / ring.length;
    const lat = ring.reduce((s, c) => s + c[1], 0) / ring.length;
    const h = Math.max(Number(feature.properties.height) || 10, 10);
    const range = pitchDeg < -50 ? Math.max(260, h * 3) : Math.max(180, h * 2.6);
    viewerRef.current?.camera.flyToBoundingSphere(new Cesium.BoundingSphere(Cesium.Cartesian3.fromDegrees(lon, lat, h / 2), h), {
      offset: new Cesium.HeadingPitchRange(Cesium.Math.toRadians(20), Cesium.Math.toRadians(pitchDeg), range),
      duration: 1.4,
    });
  };

  // Solar tool hooks: select a WFS feature (search result), fly to a building, mark shadow casters.
  const selectFeature = (feature) => {
    const index = gidIndexRef.current.get(feature.id);
    if (index == null) return;
    selectIndex(index);
    flyToFeature(featuresRef.current[index]);
  };
  const focusKey = (key, pitchDeg) => {
    const index = gidIndexRef.current.get(key);
    if (index != null) flyToFeature(featuresRef.current[index], pitchDeg);
  };
  const tintBuildings = (keys) => {
    const old = [...tintRef.current];
    tintRef.current = new Set(keys.map((k) => gidIndexRef.current.get(k)).filter((i) => i != null));
    [...old, ...tintRef.current].forEach(paint);
  };

  const toggleLayer = (id) => setVisible((prev) => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });

  // Feature count per published layer, straight from GeoServer WFS (proves each layer is served).
  useEffect(() => {
    registry.layers.forEach(async (l) => {
      try {
        const res = await fetch(`${GEOSERVER}/${registry.workspace}/ows?service=WFS&version=2.0.0&request=GetFeature&typeNames=${registry.workspace}:${l.id}&resultType=hits`);
        const n = Number((await res.text()).match(/numberMatched="(\d+)"/)?.[1]);
        setCounts((c) => ({ ...c, [l.id]: Number.isFinite(n) ? n : 'error' }));
      } catch {
        setCounts((c) => ({ ...c, [l.id]: 'error' }));
      }
    });
  }, []);

  // 3D: CesiumJS
  useEffect(() => {
    const viewer = new Cesium.Viewer(csRef.current, {
      baseLayer: new Cesium.ImageryLayer(new Cesium.OpenStreetMapImageryProvider({ url: 'https://tile.openstreetmap.org/', maximumLevel: 19 })),
      terrainProvider: new Cesium.EllipsoidTerrainProvider(),
      baseLayerPicker: false, geocoder: false, homeButton: false, sceneModePicker: false,
      navigationHelpButton: false, animation: false, timeline: false, fullscreenButton: false,
      infoBox: false, selectionIndicator: false, shadows: true,
    });
    viewerRef.current = viewer;
    if (import.meta.env.DEV) window.__geoserverMapViewer = viewer; // inspection aid in dev only
    viewer.scene.globe.enableLighting = true;
    viewer.scene.globe.depthTestAgainstTerrain = true;
    // Double-click is used to finish drawing a footprint, not to zoom to an entity.
    viewer.cesiumWidget.screenSpaceEventHandler.removeInputAction(Cesium.ScreenSpaceEventType.LEFT_DOUBLE_CLICK);

    // Relief shading from our GeoServer (transparent on flat ground), above the OSM base and below data layers.
    viewer.imageryLayers.addImageryProvider(new Cesium.WebMapServiceImageryProvider({
      url: `${GEOSERVER}/${registry.workspace}/wms`,
      layers: HILLSHADE_LAYER,
      parameters: { transparent: true, format: 'image/png' },
    }));

    // 3D terrain from the local static server; stays on the flat ellipsoid if it is unavailable.
    const terrainReady = Cesium.CesiumTerrainProvider.fromUrl(TERRAIN_URL, { requestVertexNormals: true, credit: DEM_CREDIT })
      .then((provider) => {
        if (!viewer.isDestroyed()) viewer.terrainProvider = provider;
        return provider;
      })
      .catch(() => null);
    // Higher-resolution, shorter-range shadow map removes the striping ("shadow acne") on walls.
    viewer.scene.shadowMap.size = 4096;
    viewer.scene.shadowMap.softShadows = false;
    viewer.scene.shadowMap.normalOffset = true;
    viewer.scene.shadowMap.darkness = 0.35;
    viewer.scene.shadowMap.maximumDistance = 1500;
    viewer.clock.shouldAnimate = false;
    viewer.camera.setView({
      destination: Cesium.Cartesian3.fromDegrees(72.8318, 18.9745, 1400),
      orientation: { heading: Cesium.Math.toRadians(20), pitch: Cesium.Math.toRadians(-32), roll: 0 },
    });

    let cancelled = false;
    let terrainLabel = 'flat ellipsoid';
    const t0 = performance.now();
    Promise.all([fetchBuildings(), terrainReady])
      .then(async ([fc, terrainProvider]) => {
        if (cancelled) return;
        featuresRef.current = fc.features;
        gidIndexRef.current = new Map(fc.features.map((f, i) => [f.id, i]));
        setCount(fc.features.length);
        const groundHeights = await sampleGroundHeights(terrainProvider, fc.features);
        groundRef.current = groundHeights;
        if (terrainProvider) terrainLabel = 'local Copernicus terrain';
        if (cancelled) return;
        const { primitive: prim, instanceIds } = buildPrimitive(fc.features, groundHeights);
        primitiveRef.current = prim;
        instanceIdsRef.current = instanceIds;
        viewer.scene.primitives.add(prim);
        return prim.readyPromise ?? new Promise((resolve) => {
          const remove = viewer.scene.postRender.addEventListener(() => { if (prim.ready) { remove(); resolve(); } });
        });
      })
      .then(() => !cancelled && setStatus(`Loaded from GeoServer WFS on ${terrainLabel} in ${((performance.now() - t0) / 1000).toFixed(1)} s`))
      .catch((err) => !cancelled && setStatus(`Failed: ${err.message} (is GeoServer running on ${GEOSERVER}?)`));

    const handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);
    handler.setInputAction((e) => {
      if (interactionRef.current === 'draw') return;
      const hit = viewer.scene.pick(e.position);
      if (hit && hit.primitive === primitiveRef.current && hit.id) { selectIndex(hit.id.index); return; }
      // With the solar tool open, a click beside a building (ground, roof heatmap) keeps the selection.
      if (!solarOpenRef.current) selectIndex(null);
    }, Cesium.ScreenSpaceEventType.LEFT_CLICK);

    return () => { cancelled = true; handler.destroy(); viewer.destroy(); };
  }, []);

  // 2D: OpenLayers, GeoServer WMS over OSM. Clicking flies the 3D camera there.
  useEffect(() => {
    const wms = new TileLayer({
      source: new TileWMS({
        url: `${GEOSERVER}/${registry.workspace}/wms`,
        params: { LAYERS: wmsList(visible), TILED: true, TRANSPARENT: true },
        serverType: 'geoserver',
        crossOrigin: 'anonymous',
      }),
      opacity: 0.9,
    });
    olWmsRef.current = wms;
    const hillshade = new TileLayer({
      source: new TileWMS({
        url: `${GEOSERVER}/${registry.workspace}/wms`,
        params: { LAYERS: HILLSHADE_LAYER, TILED: true, TRANSPARENT: true },
        serverType: 'geoserver',
        crossOrigin: 'anonymous',
      }),
    });
    const map = new OlMap({
      target: olRef.current,
      layers: [new TileLayer({ source: new OSM() }), hillshade, wms],
      view: new OlView({ center: fromLonLat(FS_CENTER), zoom: 14 }),
    });
    map.on('singleclick', (e) => {
      const [lon, lat] = toLonLat(e.coordinate);
      viewerRef.current?.camera.flyTo({
        destination: Cesium.Cartesian3.fromDegrees(lon, lat - 0.006, 700),
        orientation: { heading: 0, pitch: Cesium.Math.toRadians(-35), roll: 0 },
        duration: 1.5,
      });
    });
    return () => map.setTarget(undefined);
  }, []);

  // Layer toggles drive both maps: 2D WMS, and a WMS overlay draped on the 3D ground
  // (buildings are skipped in 3D because they are already drawn as extruded blocks).
  useEffect(() => {
    const list = wmsList(visible);
    olWmsRef.current?.setVisible(Boolean(list));
    if (list) olWmsRef.current?.getSource().updateParams({ LAYERS: list });

    const viewer = viewerRef.current;
    if (!viewer || viewer.isDestroyed()) return;
    if (csOverlayRef.current) viewer.imageryLayers.remove(csOverlayRef.current, true);
    csOverlayRef.current = null;
    const draped = wmsList(visible, ['building_new']);
    if (draped) {
      csOverlayRef.current = viewer.imageryLayers.addImageryProvider(new Cesium.WebMapServiceImageryProvider({
        url: `${GEOSERVER}/${registry.workspace}/wms`,
        layers: draped,
        parameters: { transparent: true, format: 'image/png' },
      }));
    }
  }, [visible]);

  // Sun position: hour + season drive the Cesium clock (IST).
  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer) return;
    viewer.clock.currentTime = istToJulian(season, hour);
    viewer.shadows = shadows;
    viewer.scene.requestRender();
  }, [hour, season, shadows]);

  const pickedProps = picked?.feature.properties;
  const minutes = Math.round(hour * 60);
  const hh = Math.floor(minutes / 60);
  const mm = String(minutes % 60).padStart(2, '0');

  return (
    <div style={{ position: 'fixed', inset: 0, display: 'flex', flexDirection: 'column', background: '#0f172a', fontFamily: 'Inter, Segoe UI, sans-serif' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '8px 14px', background: '#1e3a5f', color: '#fff', fontSize: 13, flexWrap: 'wrap' }}>
        <strong style={{ fontSize: 15 }}>SolarSight · GeoServer Map · F/S ward</strong>
        <span style={{ opacity: 0.8 }}>PostGIS → GeoServer 3.0.2 → OpenLayers + CesiumJS (no ArcGIS SDK)</span>
        <span style={{ marginLeft: 'auto', opacity: 0.9 }}>{count.toLocaleString('en-IN')} buildings · {status}</span>
        <button onClick={() => setSolarOpen((o) => !o)} style={{ padding: '5px 12px', background: solarOpen ? '#facc15' : '#f59e0b', color: '#1e293b', border: 'none', borderRadius: 6, fontWeight: 700, cursor: 'pointer' }}>
          ☀ Solar Suitability
        </button>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '6px 14px', background: '#f8fafc', fontSize: 12, color: '#0f172a', flexWrap: 'wrap' }}>
        <label>Day&nbsp;
          <select value={season} onChange={(e) => setSeason(e.target.value)}>
            {Object.entries(SEASONS).map(([id, s]) => <option key={id} value={id}>{s.label}</option>)}
          </select>
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>Time (IST) 6:00
          <input type="range" min={6} max={19} step={0.05} value={hour} onChange={(e) => setHour(Number(e.target.value))} style={{ width: 220 }} />
          19:00 <strong style={{ minWidth: 44 }}>{hh}:{mm}</strong>
        </label>
        <label><input type="checkbox" checked={shadows} onChange={(e) => setShadows(e.target.checked)} /> Shadows</label>
        <span style={{ color: '#64748b' }}>Click a building in 3D for its attributes · click the 2D map to fly there</span>
      </div>
      <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
        <div style={{ position: 'relative', width: solarOpen ? '26%' : '38%', height: '100%', borderRight: '2px solid #1e3a5f' }}>
          <div ref={olRef} style={{ position: 'absolute', inset: 0 }} />
          <div style={{ position: 'absolute', top: 8, right: 8, width: panelOpen ? 250 : 'auto', maxHeight: 'calc(100% - 16px)', overflowY: 'auto', background: 'rgba(255,255,255,0.97)', borderRadius: 8, boxShadow: '0 4px 16px rgba(0,0,0,0.2)', fontSize: 12, color: '#0f172a' }}>
            <button onClick={() => setPanelOpen((o) => !o)} style={{ width: '100%', display: 'flex', justifyContent: 'space-between', padding: '7px 10px', background: '#1e3a5f', color: '#fff', border: 'none', borderRadius: panelOpen ? '8px 8px 0 0' : 8, cursor: 'pointer', fontWeight: 600 }}>
              <span>Layers · {registry.area}</span><span>{panelOpen ? '▾' : '▸'}</span>
            </button>
            {panelOpen && registry.groups.map((g) => (
              <div key={g} style={{ padding: '4px 10px 6px' }}>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', color: '#64748b', textTransform: 'uppercase', margin: '4px 0 2px' }}>{g}</div>
                {registry.layers.filter((l) => l.group === g).map((l) => (
                  <label key={l.id} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '2px 0', cursor: 'pointer' }}>
                    <input type="checkbox" autoComplete="off" checked={visible.has(l.id)} onChange={() => toggleLayer(l.id)} />
                    <span style={{ width: 10, height: 10, borderRadius: l.point ? '50%' : 2, background: swatch(l), border: `1px solid ${l.stroke || l.rules?.[0]?.stroke || '#fff'}`, flexShrink: 0 }} />
                    <span style={{ flex: 1 }}>{l.title}</span>
                    <span style={{ color: counts[l.id] === 'error' ? '#dc2626' : '#94a3b8', fontVariantNumeric: 'tabular-nums' }}>
                      {counts[l.id] == null ? '…' : counts[l.id] === 'error' ? 'error' : counts[l.id].toLocaleString('en-IN')}
                    </span>
                  </label>
                ))}
              </div>
            ))}
          </div>
        </div>
        <div style={{ position: 'relative', flex: 1 }}>
          <div ref={csRef} style={{ position: 'absolute', inset: 0 }} />
          {picked && !solarOpen && (
            <div style={{ position: 'absolute', top: 12, right: 12, width: 280, background: 'rgba(255,255,255,0.96)', borderRadius: 8, padding: '10px 12px', fontSize: 12, color: '#0f172a', boxShadow: '0 6px 20px rgba(0,0,0,0.25)' }}>
              <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 6 }}>{buildingName(pickedProps)}</div>
              {[
                ['Class', `${pickedProps.class || '—'} / ${pickedProps.sub_class || '—'}`],
                ['Floors', pickedProps.no_floors || '—'],
                ['Height', pickedProps.height ? `${Number(pickedProps.height).toFixed(1)} m` : '—'],
                ['Footprint', pickedProps.area_sqmtr ? `${Math.round(pickedProps.area_sqmtr).toLocaleString('en-IN')} m²` : '—'],
                ['Building ID', pickedProps.bld_id || '—'],
              ].map(([k, v]) => (
                <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0', borderTop: '1px solid #e2e8f0' }}>
                  <span style={{ color: '#64748b' }}>{k}</span><span style={{ fontWeight: 600, textAlign: 'right' }}>{v}</span>
                </div>
              ))}
            </div>
          )}
        </div>
        {solarOpen && (
          <SolarPanel
            viewerRef={viewerRef}
            interactionRef={interactionRef}
            selected={picked}
            onSelectFeature={selectFeature}
            onFocusKey={focusKey}
            groundOf={(index) => groundRef.current[index] || 0}
            tintBuildings={tintBuildings}
            season={season}
            setSeason={setSeason}
            setHour={setHour}
            onClose={() => setSolarOpen(false)}
          />
        )}
      </div>
    </div>
  );
}

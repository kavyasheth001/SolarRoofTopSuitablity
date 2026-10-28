// SolarSight 3D map engine (CesiumJS, no ArcGIS SDK, no Cesium ion services). One instance owns the viewer:
// local terrain + hillshade, the F/S buildings from GeoServer WFS (LoD1 blocks), the mirrored vendor models
// (LoD2, Reality Mesh), draped GeoServer WMS layers, sun time, picking and selection.
//
// Performance: the scene renders only when something changes (requestRenderMode). Anything that changes the
// picture outside Cesium's own loaders must call engine.requestRender() (or renderFor for async geometry).
import * as Cesium from 'cesium';
import 'cesium/Build/Cesium/Widgets/widgets.css';
import registry from '../layers/registry.json';
import { BUILDINGS_TYPE, OWS_URL, STATIC, WMS_URL, seasonMonthDay } from '../config';

window.CESIUM_BASE_URL = `${import.meta.env.BASE_URL.replace(/\/$/, '')}/cesium/`;

const TERRAIN_URL = `${STATIC}/terrain/mumbai-dtm`; // bare earth: Copernicus GLO-30 + LoD2 building bases
const HILLSHADE_LAYER = `${registry.workspace}:mumbai_hillshade`;
const DEM_CREDIT = 'Terrain: bare earth from Copernicus DEM GLO-30 and BMC LoD2 buildings. Copernicus DEM GLO-30 © DLR e.V. 2010-2014 and © Airbus Defence and Space GmbH 2014-2018, provided under COPERNICUS by the EU and ESA';
const IST_OFFSET_H = 5.5;
const SHADOW_CASTER = Cesium.Color.fromCssColorString('#e11d48'); // distinct from the amber height classes
const SELECTED_TINT = Cesium.Color.fromCssColorString('#22d3ee').withAlpha(0.55);
const CASTER_TINT = SHADOW_CASTER.withAlpha(0.5);
export const HOME_VIEW = { lon: 72.8318, lat: 18.9745, height: 1400, heading: 20, pitch: -32 };

// Rendering presets. "balanced" is the default: half the shadow-map memory of "high", which matters most
// on laptop integrated graphics.
export const QUALITY = {
  high: { label: 'High', resolutionScale: 1, msaa: 4, shadowMap: 4096, globeSse: 2, meshSse: 8 },
  balanced: { label: 'Balanced', resolutionScale: 1, msaa: 2, shadowMap: 2048, globeSse: 2, meshSse: 12 },
  fast: { label: 'Fast', resolutionScale: 0.75, msaa: 1, shadowMap: 1024, globeSse: 4, meshSse: 20 },
};

// Vendor 3D models mirrored to the local static server in I3S layout by tools/reality/mirror.mjs; each manifest
// lists the mirrored segments. Heights are above mean sea level like the local terrain, so no geoid shift.
const I3S_MODELS = {
  // Photogrammetry textures already carry real daylight, so they are drawn unlit (no double shading).
  reality: {
    manifest: 'manifest.json',
    options: (q) => ({ cesium3dTilesetOptions: { shadows: Cesium.ShadowMode.ENABLED, maximumScreenSpaceError: q.meshSse, customShader: new Cesium.CustomShader({ lightingModel: Cesium.LightingModel.UNLIT }) } }),
  },
  // Untextured LoD2 roofs and walls: normals are computed so they shade with the sun.
  lod2: {
    manifest: 'lod2-manifest.json',
    options: () => ({ calculateNormals: true, cesium3dTilesetOptions: { shadows: Cesium.ShadowMode.ENABLED, maximumScreenSpaceError: 16 } }),
  },
};

export function heightColor(h) {
  if (h >= 100) return Cesium.Color.fromCssColorString('#b45309');
  if (h >= 45) return Cesium.Color.fromCssColorString('#f59e0b');
  if (h >= 15) return Cesium.Color.fromCssColorString('#cbd5e1');
  return Cesium.Color.fromCssColorString('#f1f5f9');
}

function istToJulian(season, hour) {
  const [m, d] = seasonMonthDay(season);
  const minutes = Math.round((hour - IST_OFFSET_H) * 60);
  return Cesium.JulianDate.fromDate(new Date(Date.UTC(new Date().getFullYear(), m, d, 0, minutes)));
}

async function fetchBuildings() {
  const params = new URLSearchParams({
    service: 'WFS', version: '2.0.0', request: 'GetFeature', typeNames: BUILDINGS_TYPE,
    outputFormat: 'application/json', srsName: 'EPSG:4326',
    propertyName: 'geom,name,class,sub_class,no_floors,height,area_sqmtr,bld_id,address,flat_count',
  });
  const res = await fetch(`${OWS_URL}?${params}`);
  if (!res.ok) throw new Error(`WFS ${res.status}`);
  return res.json();
}

const firstRing = (g) => (g.type === 'MultiPolygon' ? g.coordinates[0] : g.coordinates)[0];
const ringCenter = (ring) => [ring.reduce((s, c) => s + c[0], 0) / ring.length, ring.reduce((s, c) => s + c[1], 0) / ring.length];

// Ground height under each building, sampled from the terrain at the footprint's first-ring centroid,
// so blocks sit on the hills instead of on the flat ellipsoid.
async function sampleGroundHeights(terrainProvider, features) {
  if (!terrainProvider) return features.map(() => 0);
  const points = features.map((f) => Cesium.Cartographic.fromDegrees(...ringCenter(firstRing(f.geometry))));
  try {
    const sampled = await Cesium.sampleTerrainMostDetailed(terrainProvider, points);
    return sampled.map((p) => (Number.isFinite(p.height) ? p.height : 0));
  } catch {
    return features.map(() => 0);
  }
}

function inRing(x, y, ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i]; const [xj, yj] = ring[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

const bboxOf = (g) => {
  const pts = (g.type === 'MultiPolygon' ? g.coordinates.flat(1) : g.coordinates).flat(1);
  return [Math.min(...pts.map((p) => p[0])), Math.min(...pts.map((p) => p[1])), Math.max(...pts.map((p) => p[0])), Math.max(...pts.map((p) => p[1]))];
};

// LoD1 blocks: one primitive for all buildings; per feature, the ids of its geometry instances (to recolour it).
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

export class MapEngine {
  /**
   * @param container  element to draw into
   * @param on         callbacks: status(text, state), buildings(count), pick(index|null), models(statusById), camera([lon, lat])
   */
  constructor(container, on = {}) {
    this.on = on;
    this.features = [];
    this.ground = [];
    this.bboxes = [];
    this.indexById = new Map();
    this.instanceIds = [];
    this.selected = null;
    this.tinted = new Set();
    this.interaction = null; // 'draw' while a tool owns clicks
    this.keepSelectionOnEmptyClick = false;
    this.models = { lod1: false, lod2: true, reality: false }; // LoD2: the real roof shapes
    this.modelStatus = {};
    this.i3s = {};
    this.quality = QUALITY.balanced;

    const viewer = new Cesium.Viewer(container, {
      baseLayer: new Cesium.ImageryLayer(new Cesium.OpenStreetMapImageryProvider({ url: 'https://tile.openstreetmap.org/', maximumLevel: 19 })),
      terrainProvider: new Cesium.EllipsoidTerrainProvider(),
      baseLayerPicker: false, geocoder: false, homeButton: false, sceneModePicker: false,
      navigationHelpButton: false, animation: false, timeline: false, fullscreenButton: false,
      infoBox: false, selectionIndicator: false, shadows: true,
      requestRenderMode: true, maximumRenderTimeChange: Infinity,
      msaaSamples: this.quality.msaa,
    });
    this.viewer = viewer;
    if (import.meta.env.DEV) Object.assign(window, { __solarsightViewer: viewer, __solarsightEngine: this }); // inspection aid in dev only
    const { scene } = viewer;
    scene.globe.enableLighting = true;
    scene.globe.depthTestAgainstTerrain = true;
    // Double-click is used to finish drawing a footprint, not to zoom to an entity.
    viewer.cesiumWidget.screenSpaceEventHandler.removeInputAction(Cesium.ScreenSpaceEventType.LEFT_DOUBLE_CLICK);
    // Relief shading from our GeoServer (transparent on flat ground), above the OSM base and below data layers.
    viewer.imageryLayers.addImageryProvider(new Cesium.WebMapServiceImageryProvider({
      url: WMS_URL, layers: HILLSHADE_LAYER, parameters: { transparent: true, format: 'image/png' },
    }));
    scene.shadowMap.softShadows = false;
    scene.shadowMap.normalOffset = true; // removes striping ("shadow acne") on walls
    scene.shadowMap.darkness = 0.35;
    scene.shadowMap.maximumDistance = 1500;
    viewer.clock.shouldAnimate = false;
    this.setQuality('balanced');
    this.goHome(0);

    scene.camera.moveEnd.addEventListener(() => this.on.camera?.(this.cameraTarget()));
    this.handler = new Cesium.ScreenSpaceEventHandler(scene.canvas);
    this.handler.setInputAction((e) => this.handleClick(e.position), Cesium.ScreenSpaceEventType.LEFT_CLICK);
    this.load();
  }

  async load() {
    const t0 = performance.now();
    this.on.status?.('Loading F/S buildings from GeoServer…', 'loading');
    // 3D terrain from the local static server; stays on the flat ellipsoid if it is unavailable.
    const terrainReady = Cesium.CesiumTerrainProvider.fromUrl(TERRAIN_URL, { requestVertexNormals: true, credit: DEM_CREDIT })
      .then((provider) => { if (!this.viewer.isDestroyed()) this.viewer.terrainProvider = provider; return provider; })
      .catch(() => null);
    try {
      const [fc, terrain] = await Promise.all([fetchBuildings(), terrainReady]);
      if (this.viewer.isDestroyed()) return;
      this.features = fc.features;
      this.indexById = new Map(fc.features.map((f, i) => [f.id, i]));
      this.bboxes = fc.features.map((f) => bboxOf(f.geometry));
      this.on.buildings?.(fc.features.length);
      this.ground = await sampleGroundHeights(terrain, fc.features);
      if (this.viewer.isDestroyed()) return;
      const { primitive, instanceIds } = buildPrimitive(fc.features, this.ground);
      this.primitive = primitive;
      this.instanceIds = instanceIds;
      primitive.show = this.models.lod1;
      this.viewer.scene.primitives.add(primitive);
      await this.renderUntil(() => primitive.ready, 60000);
      this.on.status?.(`${fc.features.length.toLocaleString('en-IN')} buildings · ${terrain ? 'local terrain' : 'flat ground'} · ${((performance.now() - t0) / 1000).toFixed(1)} s`, 'ready');
    } catch (err) {
      this.on.status?.(`Could not load buildings: ${err.message}. Is GeoServer running?`, 'error');
    }
  }

  // ── Rendering ──────────────────────────────────────────────────────────────
  requestRender() {
    if (!this.viewer.isDestroyed()) this.viewer.scene.requestRender();
  }

  // Keep rendering every frame until a condition holds (async primitives build only while frames render).
  renderUntil(done, timeoutMs = 15000) {
    const start = performance.now();
    return new Promise((resolve) => {
      const tick = () => {
        if (this.viewer.isDestroyed()) return resolve(false);
        if (done() || performance.now() - start > timeoutMs) { this.requestRender(); return resolve(done()); }
        this.viewer.scene.requestRender();
        requestAnimationFrame(tick);
      };
      tick();
    });
  }

  setQuality(id) {
    const q = QUALITY[id] || QUALITY.balanced;
    this.quality = q;
    const { viewer } = this;
    viewer.resolutionScale = q.resolutionScale;
    viewer.scene.msaaSamples = q.msaa;
    viewer.scene.shadowMap.size = q.shadowMap;
    viewer.scene.globe.maximumScreenSpaceError = q.globeSse;
    this.i3s.reality?.then((providers) => providers.forEach((p) => p.layers?.forEach((l) => { if (l.tileset) l.tileset.maximumScreenSpaceError = q.meshSse; })));
    this.requestRender();
  }

  // ── Sun ────────────────────────────────────────────────────────────────────
  setSun(season, hour, shadows) {
    const { viewer } = this;
    viewer.clock.currentTime = istToJulian(season, hour);
    viewer.shadows = shadows;
    this.requestRender();
  }

  // ── Layers ─────────────────────────────────────────────────────────────────
  // GeoServer WMS layers draped on the 3D ground (building footprints are skipped: they are drawn in 3D).
  setDrapedLayers(ids) {
    const { viewer } = this;
    if (this.overlay) viewer.imageryLayers.remove(this.overlay, true);
    this.overlay = null;
    const list = registry.layers.filter((l) => ids.has(l.id) && l.id !== 'building_new').map((l) => `${registry.workspace}:${l.id}`).join(',');
    if (list) {
      this.overlay = viewer.imageryLayers.addImageryProvider(new Cesium.WebMapServiceImageryProvider({
        url: WMS_URL, layers: list, parameters: { transparent: true, format: 'image/png' },
      }));
    }
    this.requestRender();
  }

  setModels(models) {
    this.models = { ...models };
    if (this.primitive) this.primitive.show = models.lod1;
    Object.entries(I3S_MODELS).forEach(([id, model]) => {
      const note = (text) => { this.modelStatus = { ...this.modelStatus, [id]: text }; this.on.models?.(this.modelStatus); };
      if (models[id] && !this.i3s[id]) {
        note('loading…');
        this.i3s[id] = fetch(`${STATIC}/i3s/${model.manifest}`, { cache: 'no-store' })
          .then((r) => { if (!r.ok) throw new Error('not downloaded yet'); return r.json(); })
          .then((m) => Promise.all(m.segments.map((name) => Cesium.I3SDataProvider.fromUrl(`${STATIC}/i3s/${name}/SceneServer/layers/0`, model.options(this.quality)))))
          .then((providers) => {
            if (this.viewer.isDestroyed()) return [];
            providers.forEach((p) => this.viewer.scene.primitives.add(p));
            note(`${providers.length} segment${providers.length === 1 ? '' : 's'}`);
            return providers;
          })
          .catch((err) => { note(err.message); delete this.i3s[id]; return []; });
      }
      this.i3s[id]?.then((providers) => { providers.forEach((p) => { p.show = this.models[id]; }); this.requestRender(); });
    });
    this.requestRender();
  }

  // LoD2 providers, loading them if needed (the roof analysis reads real roof shapes from LoD2 even when hidden).
  async lod2Providers() {
    if (!this.i3s.lod2) {
      const visible = this.models.lod2;
      this.setModels({ ...this.models, lod2: true }); // starts loading
      this.models.lod2 = visible; // keep the user's choice; setModels' loader applies it once loaded
    }
    return this.i3s.lod2;
  }

  // Render until every tileset of these providers has loaded what the current view needs (or the timeout).
  async waitForTiles(providers, timeoutMs = 10000) {
    const tilesets = providers.flatMap((p) => (p.layers || []).map((l) => l.tileset)).filter(Boolean);
    // After a camera move `tilesLoaded` still describes the previous view until the tilesets have run a few
    // frames and requested the new tiles, so render a short while before trusting it.
    const settle = performance.now() + 600;
    await this.renderUntil(() => performance.now() > settle && tilesets.every((t) => t.tilesLoaded), timeoutMs);
  }

  // Tint whole buildings in the 3D tiles (LoD2, Reality Mesh): a volume around each footprint, from below the
  // ground to above the roof, colours the model surfaces inside it. LoD1 blocks are recoloured directly (paint).
  classify(indices, color) {
    if (!indices.length) return null;
    const instances = indices.flatMap((i) => {
      const f = this.features[i];
      const ground = this.groundOf(i);
      const top = ground + Math.max(Number(f.properties.height) || 3, 3) + 40;
      const polys = f.geometry.type === 'MultiPolygon' ? f.geometry.coordinates : [f.geometry.coordinates];
      return polys.map((rings) => new Cesium.GeometryInstance({
        geometry: new Cesium.PolygonGeometry({
          polygonHierarchy: new Cesium.PolygonHierarchy(
            Cesium.Cartesian3.fromDegreesArray(rings[0].flat()),
            rings.slice(1).map((r) => new Cesium.PolygonHierarchy(Cesium.Cartesian3.fromDegreesArray(r.flat()))),
          ),
          height: ground - 20,
          extrudedHeight: top,
        }),
        attributes: { color: Cesium.ColorGeometryInstanceAttribute.fromColor(color) },
      }));
    });
    return this.viewer.scene.primitives.add(new Cesium.ClassificationPrimitive({
      geometryInstances: instances,
      classificationType: Cesium.ClassificationType.CESIUM_3D_TILE,
      asynchronous: false,
    }));
  }

  // Overlays that roof sampling must not hit.
  get overlays() { return [this.primitive, this.selectionVolume, this.tintVolume].filter(Boolean); }

  // ── Buildings: picking, selection, colouring ─────────────────────────────────
  indexOf(featureId) { return this.indexById.get(featureId); }
  groundOf(index) { return this.ground[index] || 0; }
  roofHeightOf(index) { return this.groundOf(index) + Math.max(Number(this.features[index]?.properties.height) || 3, 3); }

  footprintAt(lon, lat) {
    for (let i = 0; i < this.features.length; i++) {
      const b = this.bboxes[i];
      if (lon < b[0] || lon > b[2] || lat < b[1] || lat > b[3]) continue;
      const g = this.features[i].geometry;
      const polys = g.type === 'MultiPolygon' ? g.coordinates : [g.coordinates];
      if (polys.some((rings) => inRing(lon, lat, rings[0]))) return i;
    }
    return -1;
  }

  handleClick(position) {
    if (this.interaction) return;
    const { scene } = this.viewer;
    const hit = scene.pick(position);
    if (hit && hit.primitive === this.primitive && hit.id) { this.select(hit.id.index); return; }
    // On LoD2 or the Reality Mesh: select the building whose footprint holds the clicked point.
    if (hit) {
      const pos = scene.pickPosition(position);
      if (Cesium.defined(pos)) {
        const c = Cesium.Cartographic.fromCartesian(pos);
        const index = this.footprintAt(Cesium.Math.toDegrees(c.longitude), Cesium.Math.toDegrees(c.latitude));
        if (index >= 0) { this.select(index); return; }
      }
    }
    if (!this.keepSelectionOnEmptyClick) this.select(null);
  }

  // Building colour: selected (cyan) > shadow caster (red) > height class.
  paint(index) {
    const prim = this.primitive;
    const f = this.features[index];
    if (!prim?.ready || !f) return;
    const color = this.selected === index ? Cesium.Color.CYAN
      : this.tinted.has(index) ? SHADOW_CASTER : heightColor(Math.max(Number(f.properties.height) || 3, 3));
    this.instanceIds[index]?.forEach((id) => {
      const attrs = prim.getGeometryInstanceAttributes(id);
      if (attrs) attrs.color = Cesium.ColorGeometryInstanceAttribute.toValue(color);
    });
    this.requestRender();
  }

  select(index, { fly = false } = {}) {
    const prev = this.selected;
    this.selected = index;
    if (prev != null) this.paint(prev);
    // Selected building tinted cyan in LoD2 / Reality Mesh (and painted cyan in LoD1).
    if (this.selectionVolume) this.viewer.scene.primitives.remove(this.selectionVolume);
    this.selectionVolume = null;
    if (index != null) {
      this.paint(index);
      this.selectionVolume = this.classify([index], SELECTED_TINT);
      if (fly) this.flyToIndex(index);
    }
    this.requestRender();
    this.on.pick?.(index);
  }

  selectFeatureId(featureId, opts) {
    const index = this.indexOf(featureId);
    if (index != null) this.select(index, opts);
    return index;
  }

  // Shadow casters: red LoD1 blocks, and tinted red in LoD2 / Reality Mesh.
  tint(featureIds) {
    const old = [...this.tinted];
    this.tinted = new Set(featureIds.map((k) => this.indexOf(k)).filter((i) => i != null));
    [...old, ...this.tinted].forEach((i) => this.paint(i));
    if (this.tintVolume) this.viewer.scene.primitives.remove(this.tintVolume);
    this.tintVolume = this.classify([...this.tinted], CASTER_TINT);
    this.requestRender();
  }

  // ── Camera ─────────────────────────────────────────────────────────────────
  flyToIndex(index, pitchDeg = -35) {
    const f = this.features[index];
    if (!f) return;
    const [lon, lat] = ringCenter(firstRing(f.geometry));
    const h = Math.max(Number(f.properties.height) || 10, 10);
    const base = this.groundOf(index);
    const range = pitchDeg < -50 ? Math.max(200, h * 2.6) : Math.max(170, h * 2.5);
    this.viewer.camera.flyToBoundingSphere(new Cesium.BoundingSphere(Cesium.Cartesian3.fromDegrees(lon, lat, base + h / 2), h), {
      offset: new Cesium.HeadingPitchRange(Cesium.Math.toRadians(20), Cesium.Math.toRadians(pitchDeg), range),
      duration: 1.4,
    });
  }

  flyToFeatureId(featureId, pitchDeg) {
    const index = this.indexOf(featureId);
    if (index != null) this.flyToIndex(index, pitchDeg);
  }

  flyToLonLat(lon, lat, height = 700) {
    this.viewer.camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(lon, lat - height / 117000, height),
      orientation: { heading: 0, pitch: Cesium.Math.toRadians(-35), roll: 0 },
      duration: 1.5,
    });
  }

  goHome(duration = 1.5) {
    const v = HOME_VIEW;
    const opts = {
      destination: Cesium.Cartesian3.fromDegrees(v.lon, v.lat, v.height),
      orientation: { heading: Cesium.Math.toRadians(v.heading), pitch: Cesium.Math.toRadians(v.pitch), roll: 0 },
    };
    if (duration) this.viewer.camera.flyTo({ ...opts, duration }); else this.viewer.camera.setView(opts);
  }

  // Ground point at the centre of the view, as [lon, lat] (for the 2D overview).
  cameraTarget() {
    const { scene, camera } = this.viewer;
    const canvas = scene.canvas;
    const ray = camera.getPickRay(new Cesium.Cartesian2(canvas.clientWidth / 2, canvas.clientHeight / 2));
    const p = ray && scene.globe.pick(ray, scene);
    const c = Cesium.Cartographic.fromCartesian(p || camera.positionWC);
    return [Cesium.Math.toDegrees(c.longitude), Cesium.Math.toDegrees(c.latitude)];
  }

  destroy() {
    this.handler?.destroy();
    if (!this.viewer.isDestroyed()) this.viewer.destroy();
  }
}

// Cesium drawing for the solar tool: roof sun-hours heatmap, proposed / designed buildings, footprint drawing.
import * as Cesium from 'cesium';
import { localFrame } from './solarAnalysis';

// Sun-hours ramp: deep indigo (always shaded) → violet → orange → yellow (sun every hour).
const RAMP = ['#1e1b4b', '#7e22ce', '#f97316', '#facc15'].map((c) => Cesium.Color.fromCssColorString(c));
export const RAMP_CSS = 'linear-gradient(90deg,#1e1b4b,#7e22ce,#f97316,#facc15)';

function rampColor(t) {
  const x = Math.min(1, Math.max(0, t)) * (RAMP.length - 1);
  const i = Math.min(RAMP.length - 2, Math.floor(x));
  return Cesium.Color.lerp(RAMP[i], RAMP[i + 1], x - i, new Cesium.Color());
}

// One flat cell per roof sample, laid just above the roof, coloured by the hours it is in sun.
export function roofHeatmapPrimitive(analysis, roofHeight) {
  const half = analysis.spacing / 2;
  const frame = localFrame(analysis.center);
  const hours = Math.max(analysis.eligibleHours, 1);
  const instances = analysis.samples.map((s) => {
    const [x, y] = frame.toXY(s.lonLat);
    const [w, south] = frame.toLonLat([x - half, y - half]);
    const [e, north] = frame.toLonLat([x + half, y + half]);
    return new Cesium.GeometryInstance({
      geometry: new Cesium.RectangleGeometry({
        rectangle: Cesium.Rectangle.fromDegrees(w, south, e, north),
        height: (s.zAbs ?? roofHeight) + 0.15, // each cell on its own roof height (LoD2), else the flat roof
        vertexFormat: Cesium.PerInstanceColorAppearance.FLAT_VERTEX_FORMAT,
      }),
      attributes: { color: Cesium.ColorGeometryInstanceAttribute.fromColor(rampColor(s.litHours / hours)) },
    });
  });
  return new Cesium.Primitive({
    geometryInstances: instances,
    appearance: new Cesium.PerInstanceColorAppearance({ flat: true, translucent: false }),
    shadows: Cesium.ShadowMode.DISABLED,
    asynchronous: false, // built at once: the map only renders on demand
  });
}

// Ground height at a footprint's centre, from the same terrain the buildings stand on.
export async function groundHeightAt(viewer, [lon, lat]) {
  const tp = viewer.terrainProvider;
  if (!tp || tp instanceof Cesium.EllipsoidTerrainProvider) return 0;
  try {
    const [p] = await Cesium.sampleTerrainMostDetailed(tp, [Cesium.Cartographic.fromDegrees(lon, lat)]);
    return Number.isFinite(p.height) ? p.height : 0;
  } catch {
    return 0;
  }
}

// Proposed (what-if) or designed building as an extruded, shadow-casting entity.
export function addBlockEntity(viewer, { ring, base, height, color, label }) {
  viewer.scene.requestRender();
  return viewer.entities.add({
    polygon: {
      hierarchy: Cesium.Cartesian3.fromDegreesArray(ring.flat()),
      height: base,
      extrudedHeight: base + height,
      material: Cesium.Color.fromCssColorString(color).withAlpha(0.85),
      outline: true,
      outlineColor: Cesium.Color.WHITE,
      shadows: Cesium.ShadowMode.ENABLED,
    },
    position: Cesium.Cartesian3.fromDegrees(...ring[0], base + height + 4),
    label: label && {
      text: label, font: '600 13px Segoe UI, sans-serif', fillColor: Cesium.Color.WHITE,
      outlineColor: Cesium.Color.BLACK, outlineWidth: 3, style: Cesium.LabelStyle.FILL_AND_OUTLINE,
      verticalOrigin: Cesium.VerticalOrigin.BOTTOM, disableDepthTestDistance: Number.POSITIVE_INFINITY,
    },
  });
}

export function setBlockHeight(entity, { ring, base, height, label }) {
  entity.polygon.extrudedHeight = base + height;
  entity.position = Cesium.Cartesian3.fromDegrees(...ring[0], base + height + 4);
  if (label) entity.label.text = label;
}

function pickPoint(viewer, position) {
  const { scene } = viewer;
  let cartesian = scene.pickPositionSupported ? scene.pickPosition(position) : undefined;
  if (!Cesium.defined(cartesian)) cartesian = scene.globe.pick(viewer.camera.getPickRay(position), scene);
  if (!Cesium.defined(cartesian)) return null;
  const c = Cesium.Cartographic.fromCartesian(cartesian);
  return { lonLat: [Cesium.Math.toDegrees(c.longitude), Cesium.Math.toDegrees(c.latitude)], height: c.height };
}

/**
 * Click to add corners, move to preview, right-click to undo, double-click (or finish()) to close.
 * Returns { finish, cancel }. onFinish receives a closed ring of [lon, lat].
 */
export function drawFootprint(viewer, { color = '#22d3ee', onChange, onFinish }) {
  const points = [];
  let hover = null;
  const css = Cesium.Color.fromCssColorString(color);
  // Drawn a metre above the highest clicked point and kept visible through buildings.
  const outline = viewer.entities.add({
    polyline: {
      positions: new Cesium.CallbackProperty(() => {
        const pts = hover ? [...points, hover] : points;
        if (!pts.length) return [];
        const z = Math.max(...pts.map((p) => p.height)) + 1;
        return Cesium.Cartesian3.fromDegreesArrayHeights([...pts, pts[0]].flatMap((p) => [...p.lonLat, z]));
      }, false),
      width: 3, material: css, depthFailMaterial: css.withAlpha(0.6),
    },
  });
  const handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);
  const cleanup = () => {
    handler.destroy();
    viewer.entities.remove(outline);
    viewer.scene.requestRender();
  };
  const finish = () => {
    if (points.length < 3) return false;
    cleanup();
    const ring = points.map((p) => p.lonLat);
    onFinish([...ring, ring[0]]);
    return true;
  };
  handler.setInputAction((e) => {
    const p = pickPoint(viewer, e.position);
    if (!p) return;
    const last = points[points.length - 1];
    if (last && Math.hypot(p.lonLat[0] - last.lonLat[0], p.lonLat[1] - last.lonLat[1]) < 2e-6) return; // 2nd click of a double-click
    points.push(p);
    onChange?.(points.length);
    viewer.scene.requestRender();
  }, Cesium.ScreenSpaceEventType.LEFT_CLICK);
  // The outline follows the mouse; with on-demand rendering every move must ask for a frame.
  handler.setInputAction((e) => { hover = pickPoint(viewer, e.endPosition); viewer.scene.requestRender(); }, Cesium.ScreenSpaceEventType.MOUSE_MOVE);
  handler.setInputAction(() => { points.pop(); onChange?.(points.length); viewer.scene.requestRender(); }, Cesium.ScreenSpaceEventType.RIGHT_CLICK);
  handler.setInputAction(() => finish(), Cesium.ScreenSpaceEventType.LEFT_DOUBLE_CLICK);
  return { finish, cancel: cleanup };
}

// Map screenshot for the dashboard / PDF, centre-cropped to 800 × 500.
export function captureView(viewer, width = 800, height = 500) {
  // The map renders on demand, so ask for a frame first; the canvas is read right after it is drawn.
  viewer.scene.requestRender();
  viewer.render();
  const src = viewer.scene.canvas;
  const out = document.createElement('canvas');
  out.width = width; out.height = height;
  const scale = Math.max(width / src.width, height / src.height);
  const w = width / scale; const h = height / scale;
  out.getContext('2d').drawImage(src, (src.width - w) / 2, (src.height - h) / 2, w, h, 0, 0, width, height);
  return out.toDataURL('image/png');
}

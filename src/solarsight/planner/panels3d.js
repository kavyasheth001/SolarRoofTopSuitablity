// 3D model of a panel plan on the roof: each panel is a thin box tilted and turned to its own pose, with a cell
// texture; on flat roofs it stands on front and back legs, on sloped roofs it lies flush on the plane.
// Panels cast and receive shadows.
// Optional "yield" view colours each panel by the energy it makes.
import * as Cesium from 'cesium';

const THICKNESS = 0.04; // m
const FRONT_CLEARANCE = 0.3; // m from roof to the panel's low edge (racks)
const FLUSH_STANDOFF = 0.12; // m between a sloped roof and a flush-mounted panel
const LEG = 0.05; // m
const textures = new Map();

// Canvas texture: dark cells with thin light gaps and an aluminium frame.
function panelTexture(cols, rows, color) {
  const key = `${cols}x${rows}|${color}`;
  if (textures.has(key)) return textures.get(key);
  const cw = 24; const ch = 24; const frame = 6;
  const canvas = document.createElement('canvas');
  canvas.width = cols * cw + frame * 2; canvas.height = rows * ch + frame * 2;
  const g = canvas.getContext('2d');
  g.fillStyle = '#cbd5e1'; g.fillRect(0, 0, canvas.width, canvas.height);
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = frame + c * cw; const y = frame + r * ch;
      const grad = g.createLinearGradient(x, y, x + cw, y + ch);
      grad.addColorStop(0, color); grad.addColorStop(1, '#1e3a8a');
      g.fillStyle = grad; g.fillRect(x + 1, y + 1, cw - 2, ch - 2);
      g.fillStyle = 'rgba(148,163,184,0.35)'; g.fillRect(x + cw / 2 - 0.5, y + 1, 1, ch - 2); // busbar
    }
  }
  textures.set(key, canvas);
  return canvas;
}

const yieldRamp = ['#ef4444', '#f59e0b', '#facc15', '#22c55e'].map((c) => Cesium.Color.fromCssColorString(c));
function rampColor(t) {
  const x = Math.min(1, Math.max(0, t)) * (yieldRamp.length - 1);
  const i = Math.min(yieldRamp.length - 2, Math.floor(x));
  return Cesium.Color.lerp(yieldRamp[i], yieldRamp[i + 1], x - i, new Cesium.Color());
}

/**
 * @param plan       from planForPanel: panels with local x, y, base height z (m above ground), tilt, azimuth,
 *                   mount ('rack' on flat roofs, 'flush' on slopes), along / upslope size and orientation
 * @param center     [lon, lat] of the local plane the plan was laid out in
 * @param groundAbs  absolute height of the building's ground, m (panel heights are relative to it)
 * @param mode       'panels' (realistic) or 'yield' (coloured by energy)
 * @returns { primitives: Cesium.Primitive[], remove(scene) }
 */
export function buildPanelPrimitives(plan, center, groundAbs, mode = 'panels') {
  const enu = Cesium.Transforms.eastNorthUpToFixedFrame(Cesium.Cartesian3.fromDegrees(center[0], center[1], groundAbs));
  // Yield colours span this roof's own range, so small differences between panels stay visible.
  const yields = plan.panels.map((p) => p.annual);
  const minYield = Math.min(...yields); const span = Math.max(...yields) - minYield || 1;
  const local = (x, y, z) => Cesium.Matrix4.multiplyByTranslation(enu, new Cesium.Cartesian3(x, y, z), new Cesium.Matrix4());
  const legColor = Cesium.ColorGeometryInstanceAttribute.fromColor(Cesium.Color.fromCssColorString('#94a3b8'));

  const byOrientation = { portrait: [], landscape: [] };
  const legInstances = [];
  plan.panels.forEach((p, i) => {
    const beta = Cesium.Math.toRadians(p.tilt);
    const turn = Cesium.Matrix3.fromRotationZ(Math.PI - Cesium.Math.toRadians(p.azimuth)); // local −y (south) to the facing
    const rotation = Cesium.Matrix3.multiply(turn, Cesium.Matrix3.fromRotationX(beta), new Cesium.Matrix3());
    const { along: w, upslope: l } = p;
    // Racks stand on legs above a flat roof; flush panels sit just above the sloped surface.
    const centreZ = p.mount === 'flush'
      ? p.z + FLUSH_STANDOFF + THICKNESS / 2
      : p.z + FRONT_CLEARANCE + (l / 2) * Math.sin(beta) + THICKNESS / 2;
    const model = Cesium.Matrix4.multiply(local(p.x, p.y, centreZ), Cesium.Matrix4.fromRotationTranslation(rotation, Cesium.Cartesian3.ZERO), new Cesium.Matrix4());
    byOrientation[p.orientation === 'landscape' ? 'landscape' : 'portrait'].push(new Cesium.GeometryInstance({
      id: { panel: i },
      geometry: Cesium.BoxGeometry.fromDimensions({
        dimensions: new Cesium.Cartesian3(w, l, THICKNESS),
        vertexFormat: mode === 'yield' ? Cesium.PerInstanceColorAppearance.VERTEX_FORMAT : Cesium.MaterialAppearance.MaterialSupport.TEXTURED.vertexFormat,
      }),
      modelMatrix: model,
      attributes: mode === 'yield' ? { color: Cesium.ColorGeometryInstanceAttribute.fromColor(rampColor((p.annual - minYield) / span)) } : undefined,
    }));
    if (p.mount === 'flush') return;
    // Legs under the four corners: short at the low (front) edge, tall at the raised (back) edge.
    for (const [sx, sy] of [[-0.42, -0.45], [0.42, -0.45], [-0.42, 0.45], [0.42, 0.45]]) {
      const corner = Cesium.Matrix3.multiplyByVector(turn, new Cesium.Cartesian3(sx * w, sy * l * Math.cos(beta), 0), new Cesium.Cartesian3());
      const legHeight = centreZ - THICKNESS / 2 + sy * l * Math.sin(beta) - p.z;
      legInstances.push(new Cesium.GeometryInstance({
        geometry: Cesium.BoxGeometry.fromDimensions({ dimensions: new Cesium.Cartesian3(LEG, LEG, legHeight), vertexFormat: Cesium.PerInstanceColorAppearance.VERTEX_FORMAT }),
        modelMatrix: local(p.x + corner.x, p.y + corner.y, p.z + legHeight / 2),
        attributes: { color: legColor },
      }));
    }
  });

  const primitives = [];
  Object.entries(byOrientation).forEach(([orientation, instances]) => {
    if (!instances.length) return;
    const [cols, rows] = orientation === 'portrait' ? plan.spec.cells : [plan.spec.cells[1], plan.spec.cells[0]];
    primitives.push(new Cesium.Primitive({
      geometryInstances: instances,
      appearance: mode === 'yield'
        ? new Cesium.PerInstanceColorAppearance({ closed: true, translucent: false })
        : new Cesium.MaterialAppearance({
          material: Cesium.Material.fromType('Image', { image: panelTexture(cols, rows, plan.spec.color || '#0f172a') }),
          materialSupport: Cesium.MaterialAppearance.MaterialSupport.TEXTURED,
          translucent: false, closed: true,
        }),
      shadows: Cesium.ShadowMode.ENABLED,
      asynchronous: false,
    }));
  });
  if (legInstances.length) {
    primitives.push(new Cesium.Primitive({
      geometryInstances: legInstances,
      appearance: new Cesium.PerInstanceColorAppearance({ closed: true, translucent: false }),
      shadows: Cesium.ShadowMode.ENABLED,
      asynchronous: false,
    }));
  }
  return {
    primitives,
    remove(scene) { primitives.forEach((p) => scene.primitives.remove(p)); },
  };
}

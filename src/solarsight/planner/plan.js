// Turns a roof + a panel type into a concrete installation plan: layout, energy per panel, costs and payback.
//
// The roof comes from the LoD2 model (buildRoofModel): each usable part is filled on its own.
//   flat levels   tilted racks; tilt, facing and portrait/landscape chosen for the most energy,
//                 rows spaced so they do not shade each other
//   sloped planes panels flush on the plane, at its own tilt and facing (north-facing slopes are skipped)
// Energy per panel, per climate slot (12 months × daylight hours):
//   G  = beam on the panel × (1 − share of the panel in shadow) + sky and ground light
//   Tc = air temperature + G × (NOCT − 20) / 800       (NOCT 45 °C on racks, 50 °C flush on a roof)
//   E  = kWp × G × (1 + temperature coefficient × (Tc − 25)) × days in month
// then × (1 − system losses) × (1 + bifacial gain).
import { CO2_KG_PER_KWH, LIFETIME_YEARS, subsidyFor } from './catalogue.js';
import { AIR_TEMP, bestTilt, climateSlots, planeOfArray } from './irradiance.js';
import { axesFor, layoutRows, roofAlignedAzimuth } from './layout.js';

const NOCT_RISE = { rack: (45 - 20) / 800, flush: (50 - 20) / 800 }; // °C per W/m²
const MIN_SUN_SHARE = 0.8; // panels losing more than 20 % to shade are left out
const poaCache = new Map();

function poaFor(tilt, azimuth) {
  const key = `${Math.round(tilt * 10)}|${Math.round(azimuth)}`;
  if (!poaCache.has(key)) poaCache.set(key, planeOfArray(tilt, azimuth));
  return poaCache.get(key);
}

// Energy of one panel (kWh/yr, plus monthly), and what it would make without any shade.
function panelEnergy({ x, y }, spec, along, tilt, azimuth, mount, shadeMap, losses) {
  const slots = climateSlots();
  const poa = poaFor(tilt, azimuth);
  const { u } = axesFor(azimuth);
  const off = along * 0.35;
  const pts = [[x, y], [x + u[0] * off, y + u[1] * off], [x - u[0] * off, y - u[1] * off]];
  const kwp = spec.watt / 1000;
  const k = (1 - losses) * (1 + spec.bifacialGain);
  const monthly = new Array(12).fill(0);
  let annual = 0; let clear = 0;
  slots.forEach((s, si) => {
    const shade = shadeMap ? (shadeMap.isShaded(pts[0][0], pts[0][1], si) + shadeMap.isShaded(pts[1][0], pts[1][1], si) + shadeMap.isShaded(pts[2][0], pts[2][1], si)) / 3 : 0;
    const power = (g) => kwp * g * (1 + (spec.tempCoeff / 100) * (AIR_TEMP[s.month] + NOCT_RISE[mount] * g * 1000 - 25)) * s.days * k;
    const e = power(poa.beam[si] * (1 - shade) + poa.other[si]);
    monthly[s.month] += e;
    annual += e;
    clear += power(poa.beam[si] + poa.other[si]);
  });
  return { annual, clear, monthly };
}

export function finance(plan, spec, settings) {
  const kw = plan.kw;
  const moduleCost = Math.round(kw * 1000 * spec.pricePerWp);
  const bosCost = Math.round(kw * 1000 * settings.bosPerWp);
  const total = moduleCost + bosCost;
  const subsidy = Math.min(total, subsidyFor(settings.subsidy, kw, settings.flats));
  const net = total - subsidy;
  const savings = plan.annualKwh * settings.tariff;
  let lifetimeKwh = 0;
  for (let yr = 0; yr < LIFETIME_YEARS; yr++) lifetimeKwh += plan.annualKwh * (1 - spec.degradation / 100) ** yr;
  return {
    moduleCost, bosCost, total, subsidy, net,
    annualSavings: Math.round(savings),
    paybackYears: savings > 0 ? net / savings : null,
    lifetimeKwh: Math.round(lifetimeKwh),
    lifetimeSavings: Math.round(lifetimeKwh * settings.tariff),
    lcoe: lifetimeKwh > 0 ? net / lifetimeKwh : null,
    co2Tonnes: (plan.annualKwh * CO2_KG_PER_KWH) / 1000,
  };
}

// Panels on one usable roof part for one rack setup (flat parts) or the plane's own pose (sloped parts).
function fillSegment({ model, roofParts, g, shadeMap, spec, settings, config }) {
  const L = spec.lengthMm / 1000; const W = spec.widthMm / 1000;
  const cellOk = (x, y) => { const k = model.cellAt(x, y); return k >= 0 && model.placeable[k] === 1 && model.seg[k] === g.id; };
  const flush = g.mount === 'flush';
  const { tilt, azimuth, orientation } = flush ? { ...config, tilt: g.tilt, azimuth: g.azimuth } : config;
  const along = orientation === 'portrait' ? W : L;
  const upslope = orientation === 'portrait' ? L : W;
  const layout = layoutRows({ roofParts, along, upslope, tilt, azimuth, setback: settings.setback, cellOk, flush });
  const panels = layout.panels
    .map((p) => {
      const base = flush ? g.plane.a * p.x + g.plane.b * p.y + g.plane.c : g.level;
      return { ...p, z: base, tilt, azimuth, mount: g.mount, along, upslope, orientation, segment: g.id, ...panelEnergy(p, spec, along, tilt, azimuth, g.mount, shadeMap, settings.losses) };
    })
    .filter((p) => p.annual >= MIN_SUN_SHARE * p.clear); // keep the sunny spots
  return { segment: g, mount: g.mount, level: g.level, tilt, azimuth, orientation, layout, panels, annualKwh: panels.reduce((t, p) => t + p.annual, 0) };
}

// Candidate rack setups for the flat parts: facing (due south, along the roof), tilt (best for the year,
// and a low 10° that packs rows closer), portrait / landscape; user overrides narrow the list.
function rackConfigs(roofParts, fixed) {
  const aligned = roofAlignedAzimuth(roofParts);
  const facings = fixed.azimuth != null ? [fixed.azimuth] : Math.abs(aligned - 180) > 3 ? [180, aligned] : [180];
  const out = [];
  for (const azimuth of facings) {
    for (const tilt of fixed.tilt != null ? [fixed.tilt] : [...new Set([bestTilt(azimuth).tilt, 10])]) {
      for (const orientation of fixed.orientation ? [fixed.orientation] : ['portrait', 'landscape']) out.push({ tilt, azimuth, orientation });
    }
  }
  return out;
}

/**
 * Plan for one panel type on one roof.
 * @param model      roof model (usable flat levels and sloped planes)
 * @param roofParts  footprint polygons in local metres (edge setback)
 * @param fixed      user overrides for flat parts: { tilt, azimuth, orientation }
 */
export function planForPanel({ model, roofParts, shadeMap, spec, settings, fixed = {} }) {
  // One rack setup for all flat parts (as an installer would), chosen for the most energy; each sloped part
  // keeps its own plane (best portrait / landscape).
  const flats = model.usable.filter((g) => g.mount === 'rack');
  const slopes = model.usable.filter((g) => g.mount === 'flush');
  let rack = [];
  let rackKwh = -1;
  for (const config of rackConfigs(roofParts, fixed)) {
    const filled = flats.map((g) => fillSegment({ model, roofParts, g, shadeMap, spec, settings, config }));
    const kwh = filled.reduce((t, r) => t + r.annualKwh, 0);
    if (kwh > rackKwh) { rackKwh = kwh; rack = filled; }
  }
  const sloped = slopes.map((g) => ['portrait', 'landscape']
    .map((orientation) => fillSegment({ model, roofParts, g, shadeMap, spec, settings, config: { orientation } }))
    .reduce((x, y) => (y.annualKwh > x.annualKwh ? y : x)));
  const groups = [...rack, ...sloped].filter((r) => r.panels.length);
  let panels = groups.flatMap((r) => r.panels);
  const targetKwh = settings.sizing === 'bill' ? settings.monthlyUnits * 12 : Infinity;
  if (Number.isFinite(targetKwh) && panels.length) {
    // Sunniest panels first; among near-equal ones (2 % steps) the ones closest to the sunniest spot,
    // so the array stays in one compact block instead of being scattered.
    const top = [...panels].sort((a, b) => b.annual - a.annual).slice(0, Math.max(1, Math.ceil(panels.length / 10)));
    const cx = top.reduce((t, p) => t + p.x, 0) / top.length; const cy = top.reduce((t, p) => t + p.y, 0) / top.length;
    const step = (p) => Math.round((p.annual / p.clear) * 50);
    panels.sort((a, b) => step(b) - step(a) || Math.hypot(a.x - cx, a.y - cy) - Math.hypot(b.x - cx, b.y - cy));
    let sum = 0; let n = 0;
    while (n < panels.length && sum < targetKwh) sum += panels[n++].annual;
    panels = panels.slice(0, n);
  }
  const kept = new Set(panels);
  const parts = groups.map((r) => ({ ...r, panels: r.panels.filter((p) => kept.has(p)) })).filter((r) => r.panels.length);
  const main = parts.slice().sort((a, b) => b.panels.length - a.panels.length)[0];
  const annualKwh = panels.reduce((t, p) => t + p.annual, 0);
  const clearKwh = panels.reduce((t, p) => t + p.clear, 0);
  const monthlyKwh = new Array(12).fill(0);
  panels.forEach((p) => p.monthly.forEach((v, m) => { monthlyKwh[m] += v; }));
  const kw = (panels.length * spec.watt) / 1000;
  const plan = {
    spec, settings,
    tilt: main?.tilt ?? 0, azimuth: main?.azimuth ?? 180, orientation: main?.orientation ?? 'portrait',
    rowGap: main?.layout.gap ?? 0, rows: parts.reduce((t, r) => t + new Set(r.panels.map((p) => p.row)).size, 0),
    // Roof parts with the same mounting and a level within 0.5 m are reported together.
    parts: Object.values(parts.reduce((acc, r) => {
      const key = [r.mount, r.tilt, Math.round(r.azimuth), r.orientation, Math.round(r.level / 0.5)].join('|');
      if (acc[key]) { acc[key].count += r.panels.length; acc[key].area += r.segment.area; } else {
        acc[key] = { mount: r.mount, tilt: r.tilt, azimuth: r.azimuth, orientation: r.orientation, count: r.panels.length, level: r.level, area: r.segment.area, kind: r.segment.kind };
      }
      return acc;
    }, {})).sort((a, b) => b.count - a.count),
    panels, count: panels.length, kw, annualKwh, monthlyKwh,
    specificYield: kw > 0 ? annualKwh / kw : 0,
    shadingLoss: clearKwh > 0 ? 1 - annualKwh / clearKwh : 0,
    panelArea: panels.length * (spec.lengthMm / 1000) * (spec.widthMm / 1000),
    targetKwh: Number.isFinite(targetKwh) ? targetKwh : null,
  };
  plan.finance = finance(plan, spec, settings);
  return plan;
}

export const facingLabel = (az) => {
  const names = ['north', 'north-east', 'east', 'south-east', 'south', 'south-west', 'west', 'north-west'];
  return `${names[Math.round(((az % 360) + 360) % 360 / 45) % 8]} (${Math.round(az)}°)`;
};

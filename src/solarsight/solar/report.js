// Saving and PDF export for SolarSight. Saved entries use the same localStorage key and shape as the ArcGIS
// tool, so they also show up in the existing dashboard (/mumbai/dashboard); SolarSight adds the panel plan.
const STORAGE_KEY = 'solar_analyses';
const KEEP = 20;
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function loadSaved() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); } catch { return []; }
}

export function storeSaved(list) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

export function saveToDashboard({ buildingName, buildingInfo, result, plan = null, mapScreenshot }) {
  const entry = {
    id: Date.now(),
    timestamp: new Date().toISOString(),
    buildingName,
    buildingInfo,
    result,
    plan,
    mapScreenshot,
    source: 'solarsight',
  };
  const list = [entry, ...loadSaved()];
  // Screenshots are large; drop the oldest entries until it fits the browser quota.
  for (let n = Math.min(list.length, KEEP); n > 0; n--) {
    try {
      storeSaved(list.slice(0, n));
      return entry;
    } catch (err) {
      if (n === 1) throw err;
    }
  }
  return entry;
}

const inr = (v) => `Rs ${Math.round(Number(v) || 0).toLocaleString('en-IN')}`;
const n0 = (v) => Math.round(Number(v) || 0).toLocaleString('en-IN');

function header(pdf, W, margin, subtitle) {
  pdf.setFillColor(11, 18, 32);
  pdf.rect(0, 0, W, 34, 'F');
  pdf.setFillColor(245, 164, 0);
  pdf.rect(0, 34, W, 1.5, 'F');
  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(20); pdf.setFont('helvetica', 'bold');
  pdf.text('SolarSight', margin, 15);
  pdf.setFontSize(10); pdf.setFont('helvetica', 'normal');
  pdf.text(subtitle, margin, 22);
  pdf.setFontSize(8);
  pdf.text(`Generated ${new Date().toLocaleString('en-IN')}  ·  Data: BMC F/S ward layers via SolarSight GeoServer (PostGIS)`, margin, 29);
}

function table(pdf, rows, x, y, w, rowH = 6.5) {
  rows.forEach(([label, value, strong], i) => {
    const ry = y + i * rowH;
    pdf.setFillColor(...(strong ? [255, 248, 230] : i % 2 === 0 ? [248, 250, 252] : [255, 255, 255]));
    pdf.rect(x, ry - 4.3, w, rowH, 'F');
    pdf.setFontSize(8.8); pdf.setFont('helvetica', strong ? 'bold' : 'normal'); pdf.setTextColor(70, 80, 95);
    pdf.text(label, x + 2, ry);
    pdf.setFont('helvetica', 'bold'); pdf.setTextColor(11, 18, 32);
    pdf.text(String(value), x + w - 2, ry, { align: 'right' });
  });
  return y + rows.length * rowH;
}

export async function exportPdf({ buildingName, result: r, plan, mapScreenshot, blockers = [] }) {
  const { jsPDF } = await import('jspdf');
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const W = 210; const H = 297; const margin = 14;
  let y;

  // ── Page 1: suitability ─────────────────────────────────────────────────────
  header(pdf, W, margin, 'Rooftop solar suitability and panel plan');
  y = 45;
  pdf.setTextColor(11, 18, 32); pdf.setFontSize(15); pdf.setFont('helvetica', 'bold');
  pdf.text(pdf.splitTextToSize(buildingName, W - margin * 2)[0], margin, y); y += 6;
  pdf.setFontSize(9); pdf.setFont('helvetica', 'normal'); pdf.setTextColor(90, 100, 115);
  pdf.text(`Floors: ${r.floors}   Height: ${r.height !== '—' ? `${r.height} m` : '—'}   Roof: ${r.area} m²   Day simulated: ${r.seasonLabel}`, margin, y); y += 6;

  if (mapScreenshot) {
    pdf.addImage(mapScreenshot, 'PNG', margin, y, W - margin * 2, 58);
    y += 63;
  }

  const scoreColor = r.score > 70 ? [22, 163, 74] : r.score > 40 ? [217, 119, 6] : [220, 38, 38];
  pdf.setFillColor(...scoreColor);
  pdf.roundedRect(margin, y, W - margin * 2, 14, 2, 2, 'F');
  pdf.setTextColor(255, 255, 255); pdf.setFontSize(13); pdf.setFont('helvetica', 'bold');
  pdf.text(`Suitability score ${r.score} / 100  ·  ${r.label}  ·  ${r.suitabilityClass}`, margin + 4, y + 9.2);
  y += 21;

  pdf.setTextColor(11, 18, 32); pdf.setFontSize(11); pdf.setFont('helvetica', 'bold');
  pdf.text('Sunlight on the roof', margin, y); y += 5;
  y = table(pdf, [
    [`Hours in good sun (of ${r.eligibleHours} daylight hours)`, `${r.sunnyHours} h`],
    ['Average share of the roof in sun', `${r.avgSunlit}%`],
    ['Shade factor (sun-weighted)', `${(Number(r.shadeFactor) * 100).toFixed(1)}%`],
    ['Taller buildings within 200 m checked', r.neighbourCount],
    ...(r.simCount > 0 && r.baselineScore !== null ? [[`Score without / with ${r.simCount} proposed tower(s)`, `${r.baselineScore} -> ${r.score} (${r.simImpact > 0 ? '+' : ''}${r.simImpact})`]] : []),
  ], margin, y, W - margin * 2) + 4;

  if (blockers.length) {
    pdf.setFontSize(11); pdf.setFont('helvetica', 'bold'); pdf.setTextColor(11, 18, 32);
    pdf.text('Main shadow sources', margin, y); y += 5;
    y = table(pdf, blockers.slice(0, 4).map((b) => [`${b.name} (${b.height.toFixed(0)} m)`, `${(b.share * 100).toFixed(1)}% of roof sun-hours`]), margin, y, W - margin * 2) + 4;
  }

  if (!plan) {
    pdf.setFontSize(11); pdf.setFont('helvetica', 'bold'); pdf.setTextColor(11, 18, 32);
    pdf.text('Rough estimate (no panel plan chosen)', margin, y); y += 5;
    y = table(pdf, [
      ['Usable roof (70%) / capacity', `${r.usableArea} m² / ${r.capacity} kWp`],
      ['Generation (shade-adjusted)', `${n0(r.shadedGeneration)} kWh/yr`],
      ['Savings / install cost / payback', `${inr(r.annualSavings)} / ${inr(r.installCost)} / ${r.paybackYears} yrs`],
    ], margin, y, W - margin * 2) + 4;
  }

  pdf.setFontSize(7); pdf.setFont('helvetica', 'italic'); pdf.setTextColor(140, 140, 140);
  pdf.text(pdf.splitTextToSize('Score = 50% sunlit hours + 20% roof area + 10% height + 20% irradiance (fixed 92). Shadows of taller buildings within 200 m are cast for each hour 6-18 (solar time) and measured on a roof grid. Screening estimate, not a site survey.', W - margin * 2), margin, H - 14);

  // ── Page 2: panel plan ───────────────────────────────────────────────────────
  if (plan) {
    pdf.addPage();
    header(pdf, W, margin, `Panel plan · ${buildingName}`);
    y = 46;
    pdf.setTextColor(11, 18, 32); pdf.setFontSize(15); pdf.setFont('helvetica', 'bold');
    pdf.text(`${plan.count} × ${plan.panel} = ${plan.kw.toFixed(1)} kWp`, margin, y); y += 6;
    pdf.setFontSize(9); pdf.setFont('helvetica', 'normal'); pdf.setTextColor(90, 100, 115);
    pdf.text(`${plan.rows} rows · tilt ${plan.tilt}° · facing ${Math.round(plan.azimuth)}° (180° = south) · ${plan.orientation} · ${plan.rowGap.toFixed(2)} m between rows · ${plan.settings.setback} m edge setback`, margin, y); y += 8;

    const half = (W - margin * 2 - 6) / 2;
    pdf.setFontSize(11); pdf.setFont('helvetica', 'bold'); pdf.setTextColor(11, 18, 32);
    pdf.text('Energy', margin, y); pdf.text('Cost and savings', margin + half + 6, y); y += 5;
    const yE = table(pdf, [
      ['Generation, year 1', `${n0(plan.annualKwh)} kWh`, true],
      ['Average per day', `${(plan.annualKwh / 365).toFixed(1)} kWh`],
      ['Specific yield', `${n0(plan.specificYield)} kWh/kWp`],
      ['Lost to neighbour shade', `${(plan.shadingLoss * 100).toFixed(1)}%`],
      ['Panel area', `${n0(plan.panelArea)} m²`],
      ['CO2 avoided', `${plan.finance.co2Tonnes.toFixed(1)} t/yr`],
      ['25-year generation', `${n0(plan.finance.lifetimeKwh)} kWh`],
    ], margin, y, half);
    const yC = table(pdf, [
      ['Panels', inr(plan.finance.moduleCost)],
      ['Inverter, structure, install', inr(plan.finance.bosCost)],
      ['System cost', inr(plan.finance.total), true],
      ['Subsidy', `- ${inr(plan.finance.subsidy)}`],
      ['Your cost', inr(plan.finance.net), true],
      [`Savings/yr at Rs ${plan.settings.tariff}/unit`, inr(plan.finance.annualSavings)],
      ['Payback', plan.finance.paybackYears ? `${plan.finance.paybackYears.toFixed(1)} years` : '-'],
      ['Savings over 25 years', inr(plan.finance.lifetimeSavings)],
      ['Cost per unit (25 yrs)', plan.finance.lcoe ? `Rs ${plan.finance.lcoe.toFixed(2)}` : '-'],
    ], margin + half + 6, y, half);
    y = Math.max(yE, yC) + 6;

    // Monthly generation bars.
    pdf.setFontSize(11); pdf.setFont('helvetica', 'bold'); pdf.setTextColor(11, 18, 32);
    pdf.text('Monthly generation (kWh)', margin, y); y += 4;
    const chartH = 42; const max = Math.max(...plan.monthlyKwh, 1); const bw = (W - margin * 2) / 12;
    plan.monthlyKwh.forEach((v, m) => {
      const h = (v / max) * chartH;
      pdf.setFillColor(245, 164, 0);
      pdf.rect(margin + m * bw + 2, y + chartH - h, bw - 4, h, 'F');
      pdf.setFontSize(7); pdf.setFont('helvetica', 'normal'); pdf.setTextColor(90, 100, 115);
      pdf.text(MONTHS[m], margin + m * bw + bw / 2, y + chartH + 4, { align: 'center' });
      pdf.text(n0(v), margin + m * bw + bw / 2, y + chartH - h - 1.5, { align: 'center' });
    });
    y += chartH + 12;

    pdf.setFontSize(7.5); pdf.setFont('helvetica', 'italic'); pdf.setTextColor(120, 120, 120);
    const note = 'How this plan was made: panels are laid out automatically on the roof at the tilt and facing that give the most energy, '
      + 'with rows spaced so they do not shade each other between 9:00 and 15:00 on 21 December and a setback from the roof edge; positions '
      + 'shaded more than 20% by neighbouring buildings are left empty. Generation uses Mumbai monthly sunlight (NASA POWER climatology), '
      + `split into direct and diffuse light, panel heat losses and ${Math.round(plan.settings.losses * 100)}% system losses, with each panel's own shading from `
      + `taller buildings within 200 m. Panel price Rs ${plan.pricePerWp}/Wp and Rs ${plan.settings.bosPerWp}/Wp for inverter, structure and installation are indicative. `
      + 'Subsidy as published for PM Surya Ghar (2024); check current rules. Confirm with an installer\'s site survey.';
    pdf.text(pdf.splitTextToSize(note, W - margin * 2), margin, y);
  }

  pdf.save(`SolarSight_${buildingName.replace(/[\s/\\:*?"<>|]+/g, '_')}.pdf`);
}

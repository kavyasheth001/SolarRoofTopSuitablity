// Saving and PDF export for the GeoServer solar tool. Saved entries use the same localStorage key and shape
// as the ArcGIS tool, so they show up in the existing Saved Analyses dashboard (/mumbai/dashboard).
const STORAGE_KEY = 'solar_analyses';
const KEEP = 20;

export function saveToDashboard({ buildingName, buildingInfo, result, mapScreenshot }) {
  const entry = {
    id: Date.now(),
    timestamp: new Date().toISOString(),
    buildingName,
    buildingInfo,
    result,
    mapScreenshot,
    source: 'geoserver-map',
  };
  const existing = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  const list = [entry, ...existing];
  // Screenshots are large; drop the oldest entries until it fits the browser quota.
  for (let n = Math.min(list.length, KEEP); n > 0; n--) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(list.slice(0, n)));
      return entry;
    } catch (err) {
      if (n === 1) throw err;
    }
  }
  return entry;
}

const inr = (v) => `Rs ${Math.round(Number(v)).toLocaleString('en-IN')}`;

export async function exportPdf({ buildingName, result: r, mapScreenshot, blockers = [] }) {
  const { jsPDF } = await import('jspdf');
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const W = 210; const H = 297; const margin = 14;
  let y;

  pdf.setFillColor(30, 58, 95);
  pdf.rect(0, 0, W, 38, 'F');
  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(22); pdf.setFont('helvetica', 'bold');
  pdf.text('SolarSight', margin, 16);
  pdf.setFontSize(10); pdf.setFont('helvetica', 'normal');
  pdf.text('Solar Rooftop Suitability Analysis Report', margin, 24);
  pdf.setFontSize(8);
  pdf.text(`Generated: ${new Date().toLocaleString('en-IN')}   ·   Data: BMC F/S ward via local GeoServer (PostGIS)`, margin, 31);
  y = 44;

  pdf.setTextColor(30, 58, 95); pdf.setFontSize(14); pdf.setFont('helvetica', 'bold');
  pdf.text(pdf.splitTextToSize(buildingName, W - margin * 2)[0], margin, y); y += 6;
  pdf.setFontSize(9); pdf.setFont('helvetica', 'normal'); pdf.setTextColor(80, 80, 80);
  pdf.text(`Floors: ${r.floors}   Height: ${r.height !== '—' ? `${r.height} m` : '—'}   Neighbours analysed: ${r.neighbourCount}   Day: ${r.seasonLabel}`, margin, y); y += 5;
  pdf.text(`Suitability class: ${r.suitabilityClass}`, margin, y); y += 7;

  if (mapScreenshot) {
    pdf.addImage(mapScreenshot, 'PNG', margin, y, W - margin * 2, 55);
    y += 60;
  }

  const scoreColor = r.score > 70 ? [22, 163, 74] : r.score > 40 ? [217, 119, 6] : [220, 38, 38];
  pdf.setFillColor(...scoreColor);
  pdf.rect(margin, y, W - margin * 2, 14, 'F');
  pdf.setTextColor(255, 255, 255); pdf.setFontSize(13); pdf.setFont('helvetica', 'bold');
  pdf.text(`Suitability Score: ${r.score} / 100  -  ${r.label}`, margin + 4, y + 9.5);
  y += 20;

  pdf.setTextColor(30, 58, 95); pdf.setFontSize(11); pdf.setFont('helvetica', 'bold');
  pdf.text('Analysis Metrics', margin, y); y += 5;
  const metrics = [
    [`Sunny hours (out of ${r.eligibleHours})`, `${r.sunnyHours} hrs`],
    ['Average rooftop sunlit', `${r.avgSunlit}%`],
    ['Shade factor (sun-weighted)', `${(Number(r.shadeFactor) * 100).toFixed(1)}%`],
    ['Total rooftop area', `${r.area} m2`],
    ['Usable area (70%)', `${r.usableArea} m2`],
    ['Estimated panel count', `${r.panelCount} panels (330 W each)`],
    ['Estimated capacity', `${r.capacity} kWp`],
    ['Annual generation (unshaded / shade-adjusted)', `${r.generation} / ${r.shadedGeneration} kWh/yr`],
    ['CO2 emission saved', `${r.co2Saved} tonnes/yr`],
    ['Annual electricity savings', `${inr(r.annualSavings)}/yr`],
    ['Installation cost (est.)', inr(r.installCost)],
    ['Estimated payback period', `${r.paybackYears} years`],
  ];
  metrics.forEach(([label, value], i) => {
    const rowY = y + i * 7;
    const shade = i % 2 === 0 ? [248, 250, 252] : [255, 255, 255];
    pdf.setFillColor(...shade);
    pdf.rect(margin, rowY - 4, W - margin * 2, 7, 'F');
    pdf.setFontSize(9); pdf.setFont('helvetica', 'normal'); pdf.setTextColor(80, 80, 80);
    pdf.text(label, margin + 2, rowY);
    pdf.setFont('helvetica', 'bold'); pdf.setTextColor(30, 58, 95);
    pdf.text(value, W - margin - 2, rowY, { align: 'right' });
  });
  y += metrics.length * 7 + 4;

  if (blockers.length && y < H - 40) {
    pdf.setTextColor(30, 58, 95); pdf.setFontSize(11); pdf.setFont('helvetica', 'bold');
    pdf.text('Main shadow sources', margin, y); y += 5;
    pdf.setFontSize(9); pdf.setFont('helvetica', 'normal'); pdf.setTextColor(80, 80, 80);
    blockers.slice(0, 4).forEach((b) => {
      pdf.text(`${b.name} (${b.height.toFixed(0)} m)`, margin + 2, y);
      pdf.text(`${(b.share * 100).toFixed(1)}% of roof sun-hours`, W - margin - 2, y, { align: 'right' });
      y += 5;
    });
    y += 2;
  }

  if (r.simCount > 0 && r.baselineScore !== null && y < H - 35) {
    pdf.setFillColor(245, 158, 11);
    pdf.rect(margin, y, W - margin * 2, 8, 'F');
    pdf.setTextColor(255, 255, 255); pdf.setFontSize(10); pdf.setFont('helvetica', 'bold');
    pdf.text('What-If Impact Analysis', margin + 4, y + 5.5);
    y += 12;
    pdf.setFontSize(9); pdf.setFont('helvetica', 'normal'); pdf.setTextColor(80, 80, 80);
    pdf.text(`Score without proposed buildings: ${r.baselineScore}/100   ·   with ${r.simCount} proposed: ${r.score}/100   ·   impact ${r.simImpact > 0 ? '+' : ''}${r.simImpact} points`, margin + 4, y);
    y += 8;
  }

  if (y < H - 20) {
    pdf.setDrawColor(200, 200, 200); pdf.line(margin, y, W - margin, y); y += 5;
    pdf.setFontSize(7); pdf.setFont('helvetica', 'italic'); pdf.setTextColor(140, 140, 140);
    const note = 'Methodology: shadows of taller buildings within 200 m are cast for every hour 6-18 (solar time) at Mumbai (19.076 N) and measured on a roof sample grid. '
      + 'Score = 50% sunlit hours + 20% area + 10% height + 20% irradiance (fixed 92). Yield 1500 kWh/kWp/yr, CO2 0.82 kg/kWh (CEA), tariff Rs 7/unit, install Rs 60,000/kWp. Screening estimate, not a site survey.';
    pdf.text(pdf.splitTextToSize(note, W - margin * 2), margin, y);
  }

  pdf.save(`SolarSight_Report_${buildingName.replace(/[\s/\\:*?"<>|]+/g, '_')}.pdf`);
}

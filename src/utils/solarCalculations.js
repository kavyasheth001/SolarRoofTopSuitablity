// solarCalculations.js

// --- CONFIG CONSTANTS ---
export const YIELD_KWH_PER_KWP_YEAR = 1500; // Expected yield per kWp per year (unshaded)
export const USABLE_AREA_FRACTION = 0.70;
export const KWP_PER_M2_USABLE = 0.15;
export const PANEL_WATT = 330;
export const DEFAULT_TARIFF = 7; // Rs per unit
export const DEFAULT_EXPORT_RATE = 0; // Rs per unit for surplus
export const CO2_KG_PER_KWH = 0.82;
export const INSTALL_COST_PER_KWP = 60000;
export const HOUSEHOLD_AVG_KWH_YR = 1200; // Mumbai average


// Relative monthly output factors, illustrative for Mumbai
// TODO: replace with precise PVGIS data for 19.076N, 72.877E
export const MONTH_FACTORS = [1.05, 1.12, 1.20, 1.22, 1.18, 0.80, 0.62, 0.65, 0.85, 1.00, 1.05, 1.05];
export const DAYS_IN_MONTH = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

// Helper to calculate solar position for a specific hour and day of the year
export function getSolarPosition(hour, dayOfYear) {
  if (dayOfYear == null) {
    const now = new Date();
    dayOfYear = Math.floor((now - new Date(now.getFullYear(), 0, 0)) / 86400000);
  }
  const lat = 19.076 * Math.PI / 180;
  const B = (360 / 365) * (dayOfYear - 81) * Math.PI / 180;
  const declination = 23.45 * Math.sin(B) * Math.PI / 180;
  const hourAngle = (hour - 12) * 15 * Math.PI / 180;

  const sinAlt = Math.sin(lat) * Math.sin(declination) +
    Math.cos(lat) * Math.cos(declination) * Math.cos(hourAngle);
  const altitude = Math.asin(Math.max(-1, Math.min(1, sinAlt)));

  const azimuth = Math.atan2(
    -Math.cos(declination) * Math.sin(hourAngle),
    Math.sin(declination) * Math.cos(lat) -
    Math.cos(declination) * Math.cos(hourAngle) * Math.sin(lat)
  );

  return {
    altitudeDeg: altitude * 180 / Math.PI,
    altitudeRad: altitude,
    azimuthRad: azimuth
  };
}

// 1. Compute Shade Factor (0 to 1) based on hourly results and solar altitude
export function computeShadeFactor(hourlyResults, seasonDayOfYear) {
  if (!hourlyResults || hourlyResults.length === 0) return 1.0;
  
  let numerator = 0;
  let denominator = 0;

  for (const hr of hourlyResults) {
    const solar = getSolarPosition(hr.hour, seasonDayOfYear);
    if (solar.altitudeDeg >= 5) {
      const sunlitFraction = Number(hr.sunlitPct) / 100;
      const sinAlt = Math.max(0, Math.sin(solar.altitudeRad));
      numerator += sunlitFraction * sinAlt;
      denominator += sinAlt;
    }
  }
  
  if (denominator === 0) return 1.0;
  return numerator / denominator;
}

// 2. Compute the full financial and energy scenario
export function computeScenario({ capacityKwp, shadeFactor, annualConsumptionKwh, tariff, exportRate }) {
  const sf = Number(shadeFactor);
  const annualGen = capacityKwp * YIELD_KWH_PER_KWP_YEAR * sf;
  
  const monthlyGen = [];
  const monthlyCons = [];
  
  const totalFactorDays = MONTH_FACTORS.reduce((sum, f, i) => sum + (f * DAYS_IN_MONTH[i]), 0);
  
  let assumedFullUse = false;
  let annualOffset = 0;
  let surplus = 0;
  let shortfall = 0;
  let coveragePct = 0;
  let billBefore = 0;
  let billAfter = 0;
  let annualSavings = 0;

  // Monthly generation arrays
  for (let m = 0; m < 12; m++) {
    const mg = annualGen * (MONTH_FACTORS[m] * DAYS_IN_MONTH[m]) / totalFactorDays;
    monthlyGen.push(mg);
    
    if (annualConsumptionKwh > 0) {
      const mc = annualConsumptionKwh * (DAYS_IN_MONTH[m] / 365);
      monthlyCons.push(mc);
      annualOffset += Math.min(mg, mc);
    }
  }

  if (annualConsumptionKwh > 0) {
    surplus = Math.max(0, annualGen - annualOffset);
    shortfall = Math.max(0, annualConsumptionKwh - annualOffset);
    coveragePct = Math.min(100, (annualOffset / annualConsumptionKwh) * 100);
    billBefore = annualConsumptionKwh * tariff;
    billAfter = Math.max(0, shortfall * tariff - surplus * exportRate);
    annualSavings = Math.max(0, billBefore - billAfter);
  } else {
    // If no consumption given, assume all generated units are consumed
    assumedFullUse = true;
    annualSavings = annualGen * tariff;
  }

  const installCost = capacityKwp * INSTALL_COST_PER_KWP;
  const paybackYears = annualSavings > 0 ? (installCost / annualSavings).toFixed(1) : null;
  const co2SavedTonnes = (annualConsumptionKwh > 0 ? annualOffset : annualGen) * CO2_KG_PER_KWH / 1000;
  
  const dailyAvgGen = annualGen / 365;

  return {
    annualGen,
    monthlyGen,
    dailyAvgGen,
    monthlyCons,
    annualOffset,
    surplus,
    shortfall,
    coveragePct,
    billBefore,
    billAfter,
    annualSavings,
    assumedFullUse,
    installCost,
    paybackYears,
    co2SavedTonnes,
  };
}

// 3. Compute system properties based on geometry area and analysis constraints
export function computeSystem(areaM2) {
  const usableArea = Math.max(0, areaM2) * USABLE_AREA_FRACTION;
  const roofCapacityKwp = usableArea * KWP_PER_M2_USABLE;
  const panelCount = Math.floor(roofCapacityKwp * 1000 / PANEL_WATT);
  
  return {
    usableArea,
    roofCapacityKwp,
    panelCount
  };
}

// 4. Recommend the optimal system size to avoid unnecessary oversizing
export function recommendSize({ roofCapacityKwp, annualConsumptionKwh, shadeFactor }) {
  if (!annualConsumptionKwh || annualConsumptionKwh <= 0) {
    return { neededKwp: roofCapacityKwp, recommendedKwp: roofCapacityKwp, roofIsLargerThanNeeded: false };
  }
  const neededKwp = annualConsumptionKwh / (YIELD_KWH_PER_KWP_YEAR * Number(shadeFactor));
  const recommendedKwp = Math.min(roofCapacityKwp, neededKwp);
  const roofIsLargerThanNeeded = roofCapacityKwp > neededKwp;
  
  return {
    neededKwp,
    recommendedKwp,
    roofIsLargerThanNeeded
  };
}

// 5. Standardized suitability class string based on final score
export function getSuitabilityClass(score) {
  if (score >= 70) return "Highly Suitable";
  if (score >= 55) return "Suitable";
  if (score >= 40) return "Moderately Suitable";
  return "Less Suitable";
}

// 6. Export PDF (shared)
export async function exportEntryPDF(entry, { jsPDF }) {
  const html2canvas = (await import('html2canvas')).default;

  // Recalculate full scenario to make sure fields are populated
  const shadeFactor = Number(entry.shadeFactor) || 1.0;
  const capacity = Number(entry.capacity);
  let annualConsumptionKwh = 0;
  if (entry.consumptionValue) {
    annualConsumptionKwh = entry.consumptionUnit === 'perMonth' ? Number(entry.consumptionValue) * 12 : Number(entry.consumptionValue);
  }
  const tariff = Number(entry.tariff) || DEFAULT_TARIFF;
  const exportRate = Number(entry.exportRate) || DEFAULT_EXPORT_RATE;

  const scenario = computeScenario({
    capacityKwp: capacity,
    shadeFactor,
    annualConsumptionKwh,
    tariff,
    exportRate
  });

  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const W = 210; const H = 297;
  const margin = 14;
  let y = 0;

  // -- COVER HEADER ----------------------------------------
  pdf.setFillColor(30, 58, 95);
  pdf.rect(0, 0, W, 38, 'F');
  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(22); pdf.setFont('helvetica', 'bold');
  pdf.text('SolarSight', margin, 16);
  pdf.setFontSize(10); pdf.setFont('helvetica', 'normal');
  pdf.text('Solar Rooftop Suitability Analysis Report', margin, 24);
  pdf.setFontSize(8); pdf.text(`Generated: ${new Date().toLocaleString('en-IN')}`, margin, 31);
  y = 44;

  // -- BUILDING INFO ----------------------------------------
  pdf.setTextColor(30, 58, 95);
  pdf.setFontSize(14); pdf.setFont('helvetica', 'bold');
  const buildingName = entry.address || `Building #${entry.bld_id || entry.id || 'Unknown'}`;
  pdf.text(buildingName, margin, y); y += 6;
  pdf.setFontSize(9); pdf.setFont('helvetica', 'normal'); pdf.setTextColor(80, 80, 80);
  pdf.text(`Floors: ${entry.floors}   Height: ${entry.height !== '—' ? entry.height + ' m' : '—'}   Neighbours analysed: ${entry.neighbourCount || 0}`, margin, y); y += 5;
  pdf.text(`Suitability Class: ${getSuitabilityClass(entry.score)}`, margin, y); y += 8;

  // -- MAP SCREENSHOT ---------------------------------------
  if (entry.screenshot) {
    pdf.addImage(entry.screenshot, 'PNG', margin, y, W - margin * 2, 55);
    y += 60;
  }

  // -- SCORE BANNER -----------------------------------------
  const scoreColor = entry.score > 70 ? [22, 163, 74] : entry.score > 40 ? [217, 119, 6] : [220, 38, 38];
  pdf.setFillColor(...scoreColor);
  pdf.rect(margin, y, W - margin * 2, 14, 'F');
  pdf.setTextColor(255, 255, 255); pdf.setFontSize(13); pdf.setFont('helvetica', 'bold');
  pdf.text(`Suitability Score: ${entry.score} / 100`, margin + 4, y + 9.5);
  y += 20;

  // -- METRICS TABLE ----------------------------------------
  pdf.setTextColor(30, 58, 95); pdf.setFontSize(11); pdf.setFont('helvetica', 'bold');
  pdf.text('Analysis Metrics', margin, y); y += 5;

  let metrics = [
    ['Total Rooftop Area', `${Number(entry.area).toFixed(1)} m²`],
    ['Usable Area (70%)', `${(Number(entry.area) * USABLE_AREA_FRACTION).toFixed(1)} m²`],
    ['Estimated Capacity', `${capacity.toFixed(1)} kWp`],
    ['Shade Factor', `${(shadeFactor * 100).toFixed(1)}%`],
    ['Daily Avg Generation', `${scenario.dailyAvgGen.toFixed(1)} kWh/day`],
    ['Estimated Annual Generation', `${scenario.annualGen.toFixed(0)} kWh/yr`],
    ['CO₂ Emission Saved', `${scenario.co2SavedTonnes.toFixed(1)} tonnes/yr`],
  ];

  if (annualConsumptionKwh > 0) {
    metrics.push(['Annual Consumption', `${annualConsumptionKwh.toFixed(0)} kWh/yr`]);
    metrics.push(['Solar Coverage', `${scenario.coveragePct.toFixed(1)}%`]);
    metrics.push(['Bill Before Solar', `₹${Math.round(scenario.billBefore).toLocaleString('en-IN')}/yr`]);
    metrics.push(['Bill After Solar', `₹${Math.round(scenario.billAfter).toLocaleString('en-IN')}/yr`]);
  }

  metrics.push(['Annual Electricity Savings', `₹${Math.round(scenario.annualSavings).toLocaleString('en-IN')}/yr`]);
  metrics.push(['Installation Cost (est.)', `₹${Math.round(scenario.installCost).toLocaleString('en-IN')}`]);
  metrics.push(['Estimated Payback Period', `${scenario.paybackYears} years`]);

  metrics.forEach(([label, value], i) => {
    const rowY = y + i * 7;
    pdf.setFillColor(i % 2 === 0 ? 248 : 255, i % 2 === 0 ? 250 : 255, i % 2 === 0 ? 252 : 255);
    pdf.rect(margin, rowY - 4, W - margin * 2, 7, 'F');
    pdf.setFontSize(9); pdf.setFont('helvetica', 'normal'); pdf.setTextColor(80, 80, 80);
    pdf.text(label, margin + 2, rowY);
    pdf.setFont('helvetica', 'bold'); pdf.setTextColor(30, 58, 95);
    pdf.text(value, W - margin - 2, rowY, { align: 'right' });
  });
  y += metrics.length * 7 + 6;

  // -- RIGHT SIZING SUGGESTION (IF APPLICABLE) -------------
  const recommendation = recommendSize({ roofCapacityKwp: capacity, annualConsumptionKwh, shadeFactor });
  if (recommendation.roofIsLargerThanNeeded && y < H - 40) {
    y += 4;
    pdf.setFillColor(240, 249, 255);
    pdf.rect(margin, y, W - margin * 2, 10, 'F');
    pdf.setFontSize(10); pdf.setFont('helvetica', 'bold'); pdf.setTextColor(2, 132, 199);
    pdf.text('Optimal System Size', margin + 4, y + 6);
    y += 14;
    pdf.setFontSize(9); pdf.setFont('helvetica', 'normal'); pdf.setTextColor(80, 80, 80);
    pdf.text(`Your roof can fit ${capacity.toFixed(1)} kWp, but to cover your usage we recommend a ${recommendation.recommendedKwp.toFixed(1)} kWp system.`, margin, y);
    y += 6;
  }

  // -- METHODOLOGY NOTE ------------------------------------
  if (y < H - 30) {
    pdf.setDrawColor(200, 200, 200); pdf.line(margin, y, W - margin, y); y += 5;
    pdf.setFontSize(7); pdf.setFont('helvetica', 'italic'); pdf.setTextColor(140, 140, 140);
    const note = `Methodology: Expected yield ${YIELD_KWH_PER_KWP_YEAR} kWh/kWp/yr. Tariff: ₹${tariff}/unit. Install cost: ₹${INSTALL_COST_PER_KWP.toLocaleString('en-IN')}/kWp. Shade Factor: ${(shadeFactor * 100).toFixed(1)}%.`;
    const lines = pdf.splitTextToSize(note, W - margin * 2);
    pdf.text(lines, margin, y);
  }

  pdf.save(`SolarSight_Report_${buildingName.replace(/[\s/\\:*?"<>|]+/g, '_')}.pdf`);
}

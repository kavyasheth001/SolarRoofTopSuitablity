// Panel options offered by the planner and the cost / policy assumptions used to price a plan.
// Panels are generic module classes common on Indian rooftops (no brands). Sizes and ratings follow typical
// datasheets; prices are indicative module prices in ₹ per watt-peak and can be edited in the planner.

export const PANELS = [
  { id: 'poly330', name: 'Polycrystalline 330 W', tech: 'Poly, 72-cell', watt: 330, lengthMm: 1956, widthMm: 992, tempCoeff: -0.4, pricePerWp: 20, degradation: 0.7, bifacialGain: 0, cells: [6, 12], color: '#1d4ed8', note: 'Lowest price, lower efficiency' },
  { id: 'mono400', name: 'Mono PERC 400 W', tech: 'Mono PERC, 108 half-cut', watt: 400, lengthMm: 1722, widthMm: 1134, tempCoeff: -0.35, pricePerWp: 25, degradation: 0.55, bifacialGain: 0, cells: [6, 18], color: '#0f172a', note: 'Compact, fits small terraces' },
  { id: 'mono445', name: 'Mono PERC 445 W', tech: 'Mono PERC, 144 half-cut', watt: 445, lengthMm: 2094, widthMm: 1038, tempCoeff: -0.35, pricePerWp: 24, degradation: 0.55, bifacialGain: 0, cells: [6, 24], color: '#0f172a', note: 'Common residential choice' },
  { id: 'mono540', name: 'Mono PERC 540 W', tech: 'Mono PERC, 144 half-cut', watt: 540, lengthMm: 2279, widthMm: 1134, tempCoeff: -0.35, pricePerWp: 23, degradation: 0.55, bifacialGain: 0, cells: [6, 24], color: '#0f172a', note: 'Large format, fewer panels' },
  { id: 'topcon580', name: 'N-type TOPCon 580 W', tech: 'TOPCon, 144 half-cut', watt: 580, lengthMm: 2278, widthMm: 1134, tempCoeff: -0.3, pricePerWp: 27, degradation: 0.4, bifacialGain: 0, cells: [6, 24], color: '#111827', note: 'High efficiency, handles heat better' },
  { id: 'bifacial590', name: 'Bifacial TOPCon 590 W', tech: 'TOPCon glass-glass, bifacial', watt: 590, lengthMm: 2278, widthMm: 1134, tempCoeff: -0.3, pricePerWp: 29, degradation: 0.4, bifacialGain: 0.05, cells: [6, 24], color: '#1e293b', note: 'Also uses light reflected off the roof' },
];

export const efficiencyOf = (p) => (p.watt / ((p.lengthMm / 1000) * (p.widthMm / 1000) * 1000)) * 100;

export function customPanel({ lengthMm, widthMm, watt, pricePerWp }) {
  const long = Math.max(lengthMm, widthMm); const short = Math.min(lengthMm, widthMm);
  return {
    id: 'custom', name: `Custom ${watt} W`, tech: `${long} × ${short} mm`, watt, lengthMm: long, widthMm: short,
    tempCoeff: -0.35, pricePerWp, degradation: 0.55, bifacialGain: 0, cells: [6, Math.max(6, Math.round((long / short) * 6))],
    color: '#0f172a', note: 'Your panel',
  };
}

export const DEFAULT_SETTINGS = {
  tariff: 7, // ₹ per unit saved, same default as the suitability report (editable: Mumbai bills run ₹7-12)
  bosPerWp: 30, // ₹/Wp: inverter, mounting structure, cabling, protection, installation, net-metering
  setback: 1.0, // m kept free along the roof edge (parapet, access, fire safety)
  subsidy: 'society', // 'home' | 'society' | 'none'
  sizing: 'fill', // 'fill' the sunny roof | 'bill' size to monthly consumption
  monthlyUnits: 300,
  losses: 0.14, // soiling, wiring, inverter, mismatch, ageing in year 1
};

export const SUBSIDIES = {
  home: 'Individual home (PM Surya Ghar)',
  society: 'Housing society common areas',
  none: 'No subsidy (commercial / industrial)',
};

// Central financial assistance as published for PM Surya Ghar (2024): homes ₹30,000/kW for the first 2 kW and
// ₹18,000 for the 3rd kW (max ₹78,000); housing societies ₹18,000/kW for common facilities, up to 3 kW per
// flat and 500 kW in all. Commercial and industrial roofs get none. Check the current rules before quoting.
export function subsidyFor(type, kw, flats = 0) {
  if (type === 'home') return Math.round(Math.min(kw, 2) * 30000 + Math.max(0, Math.min(kw, 3) - 2) * 18000);
  if (type === 'society') return Math.round(Math.min(kw, 500, flats > 0 ? flats * 3 : 500) * 18000);
  return 0;
}

// Subsidy that applies by default for a building class from the BMC data.
export const defaultSubsidy = (buildingClass = '') => (/resid/i.test(buildingClass) ? 'society' : 'none');

export const CO2_KG_PER_KWH = 0.82; // same grid factor as the suitability report
export const LIFETIME_YEARS = 25;

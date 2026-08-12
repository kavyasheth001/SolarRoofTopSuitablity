// fireIncidentPDFExport.js
// Place this file alongside FireIncidentMapping.jsx
// Usage: import { exportFireIncidentPDF } from './fireIncidentPDFExport';

import jsPDF from 'jspdf';
import bmcLogo from '../../images/logo/BMC.png';

// ── JWT decode (no library needed) ───────────────────────────────────────────
function decodeJWT(token) {
  try {
    const base64Payload = token.split('.')[1];
    const payload = JSON.parse(atob(base64Payload));
    return payload;
  } catch {
    return null;
  }
}

function getExportedByFromToken() {
  try {
    const token = localStorage.getItem('token');
    if (!token) return 'Unknown User';
    const payload = decodeJWT(token);
    if (!payload) return 'Unknown User';
    // Try common name fields in JWT payload
    return (
      payload.name ||
      payload.Name ||
      payload.username ||
      payload.email ||
      payload.sub ||
      'Unknown User'
    );
  } catch {
    return 'Unknown User';
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function formatDistance(km) {
  if (km == null) return 'N/A';
  return `${parseFloat(km).toFixed(2)} km`;
}

function formatTime(min) {
  if (min == null) return 'N/A';
  return `${parseFloat(min).toFixed(1)} min`;
}

// Vehicle icon text (emoji-safe for jsPDF)
function getVehicleIconText(vehicleType) {
  const type = (vehicleType || '').toLowerCase();
  if (type.includes('fire engine')) return '[Fire Engine]';
  if (type.includes('water tanker') || type.includes('tanker')) return '[Tanker]';
  if (type.includes('quick response') || type.includes('qrv')) return '[QRV]';
  if (type.includes('high rise') || type.includes('ladder')) return '[Ladder]';
  if (type.includes('jeep')) return '[Jeep]';
  if (type.includes('car')) return '[Car]';
  return '[Vehicle]';
}

// ── Colors ────────────────────────────────────────────────────────────────────
const COLOR = {
  headerBlue: [30, 77, 139],       // #1e4d8b — matches BMC header
  lightBlue: [230, 241, 255],
  accentRed: [185, 28, 28],
  sectionAccent: [43, 93, 177],
  rowEven: [247, 251, 255],
  rowOdd: [255, 255, 255],
  textDark: [15, 25, 50],
  textMuted: [100, 110, 130],
  textWhite: [255, 255, 255],
  borderGray: [200, 210, 225],
  greenAccent: [21, 128, 61],
  redBg: [254, 242, 242],
  redBorder: [252, 165, 165],
};

// ── PDF page layout constants ─────────────────────────────────────────────────
const MARGIN = 36;
const PAGE_W = 595.28;   // A4 portrait in points
const PAGE_H = 841.89;
const CONTENT_W = PAGE_W - MARGIN * 2;
const FOOTER_H = 30;
const SAFE_BOTTOM = PAGE_H - FOOTER_H - 10;

// ── Core export function ──────────────────────────────────────────────────────
/**
 * @param {object} params
 * @param {object} params.view                  - ArcGIS MapView
 * @param {object} params.selectedBuilding      - ArcGIS feature
 * @param {number|string} params.selectedBuildingFloorCount
 * @param {number} params.watchedFireFloor
 * @param {number} params.fireFloorHeight
 * @param {number} params.floorsInDanger
 * @param {object|null} params.selectedFacility - Routed facility (if any)
 * @param {object} params.facilityRouteDistances - { [facilityId]: { distance, time } }
 * @param {Array}  params.analysisSummary       - from getAnalysisSummary()
 * @param {Function} params.extractVehicles     - vehicle extractor fn
 * @param {Function} params.groupVehiclesByType - vehicle grouper fn
 * @param {object|null} params.jurisdictionInfo
 * @param {Function} params.onProgress          - optional (msg) => void
 */
export async function exportFireIncidentPDF({
  view,
  selectedBuilding,
  selectedBuildingFloorCount,
  watchedFireFloor,
  fireFloorHeight,
  floorsInDanger,
  selectedFacility,
  facilityRouteDistances,
  analysisSummary,
  extractVehicles,
  groupVehiclesByType,
  jurisdictionInfo,
  onProgress,
}) {
  const progress = onProgress || (() => {});

  // ── 1. Take map screenshot ─────────────────────────────────────────────────
  progress('Taking map screenshot…');
  let screenshotDataUrl = null;
  try {
    const screenshot = await view.takeScreenshot({
      format: 'png',
      quality: 90,
      width: 1600,
      height: 900,
    });
    screenshotDataUrl = screenshot.dataUrl;
  } catch (e) {
    console.warn('Screenshot failed:', e);
  }

  // ── 2. Resolve "Exported by" from JWT ─────────────────────────────────────
  const exportedBy = getExportedByFromToken();
  const exportedAt = new Date().toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });

  // ── 3. Build PDF ───────────────────────────────────────────────────────────
  progress('Building PDF…');
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4', compress: true });

  let Y = 0; // current Y cursor

  // Helper: add new page if needed
  const guard = (neededHeight = 40) => {
    if (Y + neededHeight > SAFE_BOTTOM) {
      drawFooter(pdf, exportedBy, exportedAt);
      pdf.addPage();
      Y = MARGIN;
    }
  };

    // ── Section title helper ─────────────────────────────────────────────────
    const sectionTitle = (text) => {
        guard(28);
        pdf.setFillColor(...COLOR.sectionAccent);
        pdf.rect(MARGIN, Y, 3, 14, 'F');
        pdf.setTextColor(...COLOR.sectionAccent);
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(11.5);
        pdf.text(text, MARGIN + 8, Y + 10.5);
        Y += 20;
    };

  // ── Key-value row helper ─────────────────────────────────────────────────
  const kvRow = (label, value, x, y, colW = 120, isOdd = false) => {
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8);
    pdf.setTextColor(...COLOR.textMuted);
    pdf.text(label, x, y);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(9.5);
    pdf.setTextColor(...COLOR.textDark);
    const lines = pdf.splitTextToSize(String(value ?? 'N/A'), colW);
    pdf.text(lines[0], x, y + 12);
    return lines.length * 12;
  };

  // ────────────────────────────────────────────────────────────────────────
  // HEADER BAND
  // ────────────────────────────────────────────────────────────────────────
   // ────────────────────────────────────────────────────────────────────────
  // HEADER BAND
  // ────────────────────────────────────────────────────────────────────────
    const HDR_H = 68;
    pdf.setFillColor(...COLOR.headerBlue);
    pdf.rect(0, 0, PAGE_W, HDR_H, 'F');

    // BMC Logo
    const logoImage = await new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => resolve(img);
        img.onerror = () => resolve(null);
        img.src = bmcLogo;
    });
    if (logoImage) {
        const lh = 50;
        const lw = (logoImage.width / logoImage.height) * lh;
        pdf.addImage(logoImage, 'PNG', 10, (HDR_H - lh) / 2, lw, lh);
    }

    // Title — pushed right to make room for logo
    const textStartX = logoImage ? 74 : MARGIN + 4;
    pdf.setTextColor(...COLOR.textWhite);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(18);
    pdf.text('Fire Emergency Response Report', textStartX, 28);

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(9);
    pdf.text('BMC - 3D Twin Mumbai  |  Fire Incident Analysis', textStartX, 44);
    pdf.text(`Generated: ${exportedAt}  |  Exported by: ${exportedBy}`, textStartX, 58);

    Y = HDR_H + 16;

  // ────────────────────────────────────────────────────────────────────────
  // SECTION 1 — Building Information
  // ────────────────────────────────────────────────────────────────────────
  if (selectedBuilding) {
    sectionTitle('Building Information', '🏢  ');

    const attrs = selectedBuilding.attributes;
    const buildingName = attrs.name || attrs.Name || 'Building';
    const roadName = attrs.rd_name || attrs.road_name || 'N/A';
    const address = attrs.address || attrs.Address || 'N/A';
    const height = attrs.height ? `${parseFloat(attrs.height).toFixed(2)} m` : 'N/A';
    const floorCount = selectedBuildingFloorCount || 'N/A';
    const subClass = attrs.sub_class || attrs.type || 'Residential';
    const bldgClass = attrs.class || attrs.type || 'Residential';
    const postalCode = attrs.postalCode || null;

    const CARD_H = postalCode ? 150 : 130;
    guard(CARD_H + 10);

    // Card background
    pdf.setFillColor(244, 248, 255);
    pdf.setDrawColor(...COLOR.borderGray);
    pdf.setLineWidth(0.4);
    pdf.roundedRect(MARGIN, Y, CONTENT_W, CARD_H, 3, 3, 'FD');

    const c1 = MARGIN + 14;
    const c2 = MARGIN + CONTENT_W / 2 + 10;
    const colW = CONTENT_W / 2 - 22;
    const rowH = 26;

    kvRow('Building Name', buildingName, c1, Y + 16, colW);
    kvRow('Road Name', roadName, c2, Y + 16, colW);

    kvRow('Address', address, c1, Y + 16 + rowH, colW);
    kvRow('Sub Class', subClass, c2, Y + 16 + rowH, colW);

    kvRow('Total Height', height, c1, Y + 16 + rowH * 2, colW);
    kvRow('Number of Floors', String(floorCount), c2, Y + 16 + rowH * 2, colW);

    kvRow('Class', bldgClass, c1, Y + 16 + rowH * 3, colW);
    if (postalCode) kvRow('Postal Code', postalCode, c2, Y + 16 + rowH * 3, colW);

    Y += CARD_H + 8;

    // Mumbai standard note
    guard(18);
    pdf.setFont('helvetica', 'italic');
    pdf.setFontSize(7.5);
    pdf.setTextColor(...COLOR.textMuted);
    pdf.text('Mumbai Standard: Ground floor 4.5 m, Regular floors 3.0 m each', MARGIN + 4, Y + 6);
    Y += 18;
  }

  // ────────────────────────────────────────────────────────────────────────
  // SECTION 2 — Fire Emergency Details
  // ────────────────────────────────────────────────────────────────────────
  guard(80);
  sectionTitle('Fire Emergency Details', '🔥  ');

  const fireCardH = 72;
  pdf.setFillColor(254, 242, 242);
  pdf.setDrawColor(252, 165, 165);
  pdf.setLineWidth(0.4);
  pdf.roundedRect(MARGIN, Y, CONTENT_W, fireCardH, 3, 3, 'FD');

  const fc1 = MARGIN + 14;
  const fc2 = MARGIN + CONTENT_W / 2 + 10;
  const fColW = CONTENT_W / 2 - 22;

  kvRow('Fire Floor (Ground = 0)', String(watchedFireFloor ?? 0), fc1, Y + 16, fColW);
  kvRow('Fire Floor Height', `${(fireFloorHeight || 0).toFixed(1)} m from ground`, fc2, Y + 16, fColW);
  kvRow('Floors in Danger', String(floorsInDanger ?? 0), fc1, Y + 42, fColW);

  if (jurisdictionInfo?.boundaryName) {
    kvRow('Fire Jurisdiction', jurisdictionInfo.boundaryName, fc2, Y + 42, fColW);
  }

  Y += fireCardH + 12;

  // Jurisdiction stations (if any)
  if (jurisdictionInfo?.stations?.length > 0) {
    guard(20 + jurisdictionInfo.stations.length * 14);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(8.5);
    pdf.setTextColor(...COLOR.sectionAccent);
    pdf.text('Stations in Jurisdiction:', MARGIN + 4, Y + 8);
    Y += 14;

    jurisdictionInfo.stations.forEach((station) => {
      guard(14);
      pdf.setFillColor(...COLOR.sectionAccent);
      pdf.circle(MARGIN + 12, Y + 3.5, 1.8, 'F');
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(9);
      pdf.setTextColor(...COLOR.textDark);
      pdf.text(station.name || 'Fire Station', MARGIN + 20, Y + 7);
      Y += 13;
    });
    Y += 6;
  }

  // ────────────────────────────────────────────────────────────────────────
  // SECTION 3 — Map Screenshot
  // ────────────────────────────────────────────────────────────────────────
  if (screenshotDataUrl) {
    guard(40);
    sectionTitle('Current Map View', '🗺️  ');

    const MAP_H = 190;
    guard(MAP_H + 10);

    pdf.setDrawColor(...COLOR.borderGray);
    pdf.setLineWidth(0.5);
    pdf.rect(MARGIN, Y, CONTENT_W, MAP_H);
    pdf.addImage(screenshotDataUrl, 'PNG', MARGIN, Y, CONTENT_W, MAP_H);
    Y += MAP_H + 14;

    // Legend note
    guard(14);
    pdf.setFont('helvetica', 'italic');
    pdf.setFontSize(7.5);
    pdf.setTextColor(...COLOR.textMuted);
    pdf.text('Blue line = Route  |  Cyan highlight = Selected building  |  Points = Nearest facilities', MARGIN + 4, Y + 6);
    Y += 16;
  }

  // ────────────────────────────────────────────────────────────────────────
  // SECTION 4 — Routed Facility Details
  // ────────────────────────────────────────────────────────────────────────
  if (selectedFacility) {
    guard(40);
    sectionTitle('Routed Facility Details', '🚒  ');

    const routeInfo = facilityRouteDistances?.[selectedFacility.id];
    const isFireStation =
      selectedFacility.category === 'fireStation' ||
      selectedFacility.category === 'miniFireStation';

    const RF_H = 60;
    guard(RF_H + 6);
    pdf.setFillColor(...COLOR.lightBlue);
    pdf.setDrawColor(...COLOR.borderGray);
    pdf.setLineWidth(0.4);
    pdf.roundedRect(MARGIN, Y, CONTENT_W, RF_H, 3, 3, 'FD');

    kvRow('Facility Name', selectedFacility.name, MARGIN + 14, Y + 14, CONTENT_W / 2 - 20);
    kvRow('Facility Type', selectedFacility.type || selectedFacility.category, MARGIN + CONTENT_W / 2 + 10, Y + 14, CONTENT_W / 2 - 20);

    if (routeInfo) {
      kvRow('Route Distance', formatDistance(routeInfo.distance), MARGIN + 14, Y + 40, CONTENT_W / 2 - 20);
      kvRow('Travel Time', formatTime(routeInfo.time), MARGIN + CONTENT_W / 2 + 10, Y + 40, CONTENT_W / 2 - 20);
    } else {
      kvRow('Route Distance', 'Not computed', MARGIN + 14, Y + 40, CONTENT_W / 2 - 20);
    }
    Y += RF_H + 10;

    // Vehicle fleet for fire stations
    if (isFireStation && extractVehicles && groupVehiclesByType) {
      const vehicles = extractVehicles(selectedFacility.attributes);
      if (vehicles.length > 0) {
        guard(30);
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(9.5);
        pdf.setTextColor(...COLOR.accentRed);
        pdf.text(`Vehicle Fleet  (${vehicles.length} vehicles available)`, MARGIN + 4, Y + 8);
        Y += 16;

        const grouped = groupVehiclesByType(vehicles);

        // Table header
        guard(18);
        pdf.setFillColor(220, 232, 255);
        pdf.setDrawColor(...COLOR.borderGray);
        pdf.setLineWidth(0.3);
        pdf.rect(MARGIN, Y, CONTENT_W, 16, 'FD');
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(8.5);
        pdf.setTextColor(...COLOR.sectionAccent);
        const col1 = MARGIN + 8;
        const col2 = MARGIN + CONTENT_W * 0.35;
        const col3 = MARGIN + CONTENT_W * 0.60;
        const col4 = MARGIN + CONTENT_W * 0.80;
        pdf.text('Vehicle Type', col1, Y + 11);
        pdf.text('Count', col2, Y + 11);
        pdf.text('Dept No', col3, Y + 11);
        pdf.text('Reg No', col4, Y + 11);
        Y += 16;

        grouped.forEach((group, gi) => {
          // Group header row
          guard(16);
          pdf.setFillColor(gi % 2 === 0 ? 247 : 255, gi % 2 === 0 ? 251 : 255, 255);
          pdf.rect(MARGIN, Y, CONTENT_W, 15, 'F');
          pdf.setDrawColor(...COLOR.borderGray);
          pdf.setLineWidth(0.2);
          pdf.line(MARGIN, Y + 15, MARGIN + CONTENT_W, Y + 15);

          pdf.setFont('helvetica', 'bold');
          pdf.setFontSize(8.5);
          pdf.setTextColor(...COLOR.textDark);
          pdf.text(`${getVehicleIconText(group.type)} ${group.type}`, col1, Y + 10);
          pdf.text(String(group.count), col2, Y + 10);

          // For single vehicle show dept/reg directly; for multiple show "see below"
          if (group.count === 1) {
            pdf.setFont('helvetica', 'normal');
            pdf.text(group.vehicles[0].dep_no || 'N/A', col3, Y + 10);
            pdf.text(group.vehicles[0].reg_no || 'N/A', col4, Y + 10);
          } else {
            pdf.setFont('helvetica', 'italic');
            pdf.setFontSize(7.5);
            pdf.setTextColor(...COLOR.textMuted);
            pdf.text('(multiple — see below)', col3, Y + 10);
          }
          Y += 15;

          // Individual vehicle rows for multi-count groups
          if (group.count > 1) {
            group.vehicles.forEach((v, vi) => {
              guard(13);
              pdf.setFillColor(250, 252, 255);
              pdf.rect(MARGIN, Y, CONTENT_W, 13, 'F');
              pdf.setDrawColor(...COLOR.borderGray);
              pdf.setLineWidth(0.15);
              pdf.line(MARGIN, Y + 13, MARGIN + CONTENT_W, Y + 13);

              pdf.setFont('helvetica', 'normal');
              pdf.setFontSize(8);
              pdf.setTextColor(...COLOR.textMuted);
              pdf.text(`  ${vi + 1}.`, col1, Y + 9);
              pdf.setTextColor(...COLOR.textDark);
              pdf.text(v.dep_no || 'N/A', col3, Y + 9);
              pdf.text(v.reg_no || 'N/A', col4, Y + 9);
              Y += 13;
            });
          }
        });
        Y += 8;

        // Equipment (if any)
        const equipment = selectedFacility.attributes?.equipment;
        if (equipment) {
          guard(30);
          pdf.setFont('helvetica', 'bold');
          pdf.setFontSize(8.5);
          pdf.setTextColor(...COLOR.sectionAccent);
          pdf.text('Equipment:', MARGIN + 4, Y + 9);
          Y += 13;

          guard(20);
          const eqLines = pdf.splitTextToSize(equipment, CONTENT_W - 12);
          pdf.setFont('helvetica', 'normal');
          pdf.setFontSize(8.5);
          pdf.setTextColor(...COLOR.textDark);
          eqLines.forEach((line) => {
            guard(12);
            pdf.text(line, MARGIN + 8, Y + 8);
            Y += 11;
          });
          Y += 6;
        }
      }
    }
  }

  // ────────────────────────────────────────────────────────────────────────
  // SECTION 5 — All Nearest Emergency Facilities
  // ────────────────────────────────────────────────────────────────────────
  if (analysisSummary && analysisSummary.length > 0) {
    guard(40);
    sectionTitle('Nearest Emergency Facilities', '📍  ');

    analysisSummary.forEach(({ name, count, key, features }) => {
      if (!features || features.length === 0) return;

      guard(28);

      // Category sub-header
      pdf.setFillColor(230, 241, 255);
      pdf.setDrawColor(...COLOR.borderGray);
      pdf.setLineWidth(0.3);
      pdf.rect(MARGIN, Y, CONTENT_W, 17, 'FD');
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(10);
      pdf.setTextColor(...COLOR.headerBlue);
      pdf.text(`${name}  (${count})`, MARGIN + 8, Y + 12);
      Y += 17;

      // Column headers
      guard(15);
      pdf.setFillColor(244, 248, 255);
      pdf.rect(MARGIN, Y, CONTENT_W, 14, 'F');
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(8);
      pdf.setTextColor(...COLOR.textMuted);

      const isFireCat = key === 'fireStation' || key === 'miniFireStation';
      const fCol1 = MARGIN + 6;
      const fCol2 = MARGIN + CONTENT_W * 0.55;
      const fCol3 = MARGIN + CONTENT_W * 0.80;

      pdf.text('Facility Name', fCol1, Y + 10);
      pdf.text('Distance', fCol2, Y + 10);
      if (isFireCat) pdf.text('Vehicles', fCol3, Y + 10);
      Y += 14;

      features.forEach((facility, idx) => {
        const ROW_H = 15;
        guard(ROW_H);

        // Alternating row color
        pdf.setFillColor(...(idx % 2 === 0 ? COLOR.rowEven : COLOR.rowOdd));
        pdf.rect(MARGIN, Y, CONTENT_W, ROW_H, 'F');

        pdf.setDrawColor(...COLOR.borderGray);
        pdf.setLineWidth(0.15);
        pdf.line(MARGIN, Y + ROW_H, MARGIN + CONTENT_W, Y + ROW_H);

        // Highlight routed facility
        const isRouted = selectedFacility?.id === facility.id;
        if (isRouted) {
          pdf.setFillColor(220, 252, 231); // light green
          pdf.rect(MARGIN, Y, CONTENT_W, ROW_H, 'F');
        }

        pdf.setFont('helvetica', isRouted ? 'bold' : 'normal');
        pdf.setFontSize(8.5);
        pdf.setTextColor(...COLOR.textDark);

        // Truncate long names
        const nameLines = pdf.splitTextToSize(facility.name, CONTENT_W * 0.50);
        pdf.text(nameLines[0], fCol1, Y + 10);

        // Distance
        const routeInfo = facilityRouteDistances?.[facility.id];
        const distLabel = routeInfo
          ? `${routeInfo.distance} km (${routeInfo.time} min)`
          : facility.attributes?.distance != null
          ? `${facility.attributes.distance.toFixed(2)} km (straight)`
          : 'N/A';

        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(8);
        pdf.setTextColor(routeInfo ? COLOR.greenAccent[0] : COLOR.textMuted[0], routeInfo ? COLOR.greenAccent[1] : COLOR.textMuted[1], routeInfo ? COLOR.greenAccent[2] : COLOR.textMuted[2]);
        pdf.text(distLabel, fCol2, Y + 10);

        // Vehicle count for fire stations
        if (isFireCat && extractVehicles) {
          const vCount = extractVehicles(facility.attributes).length;
          pdf.setFont('helvetica', 'bold');
          pdf.setFontSize(8.5);
          pdf.setTextColor(...COLOR.accentRed);
          pdf.text(vCount > 0 ? `${vCount} vehicles` : '-', fCol3, Y + 10);
        }

        // Routed badge
        if (isRouted) {
          pdf.setFont('helvetica', 'bold');
          pdf.setFontSize(7);
          pdf.setTextColor(...COLOR.greenAccent);
          pdf.text('ROUTED', MARGIN + CONTENT_W - 36, Y + 10);
        }

        Y += ROW_H;
      });

      Y += 8;
    });
  }

  // ────────────────────────────────────────────────────────────────────────
  // FOOTER on all pages
  // ────────────────────────────────────────────────────────────────────────
  const totalPages = pdf.internal.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    pdf.setPage(p);
    drawFooter(pdf, exportedBy, exportedAt, p, totalPages);
  }

  // ────────────────────────────────────────────────────────────────────────
  // SAVE
  // ────────────────────────────────────────────────────────────────────────
  const ts = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
  const buildingName =
    selectedBuilding?.attributes?.name ||
    selectedBuilding?.attributes?.Name ||
    'Building';
  const safeFileName = buildingName.replace(/[/\\:*?"<>|]/g, '_').substring(0, 40);
  pdf.save(`FireIncident_${safeFileName}_${ts}.pdf`);
  progress('Done!');
}

// ── Footer drawer (called per page) ─────────────────────────────────────────
function drawFooter(pdf, exportedBy, exportedAt, currentPage, totalPages) {
  pdf.setDrawColor(...[192, 208, 230]);
  pdf.setLineWidth(0.35);
  pdf.line(MARGIN, PAGE_H - 26, PAGE_W - MARGIN, PAGE_H - 26);

  pdf.setTextColor(148, 155, 170);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(7.5);
  pdf.text(
    `Fire Emergency Response Report  |  BMC – 3D Twin Mumbai  |  ${exportedAt}  |  Exported by: ${exportedBy}`,
    MARGIN,
    PAGE_H - 14,
  );

  if (currentPage && totalPages) {
    const pageLabel = `Page ${currentPage} of ${totalPages}`;
    const pgW =
      (pdf.getStringUnitWidth(pageLabel) * 7.5) / pdf.internal.scaleFactor;
    pdf.text(pageLabel, PAGE_W - MARGIN - pgW, PAGE_H - 14);
  }
}
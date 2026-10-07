import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, Trash2, CalendarDays, BarChart2, Zap, Leaf, DollarSign, Building2, Sun } from 'lucide-react';

/* ─── per-analysis PDF export ─────────────────────────────────── */
async function exportEntryPDF(entry) {
  const { jsPDF } = await import('jspdf');
  const r = entry.result;
  const now = new Date(entry.timestamp).toLocaleString('en-IN');
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const W = 210, margin = 14;
  let y = 0;

  pdf.setFillColor(30, 58, 95);
  pdf.rect(0, 0, W, 38, 'F');
  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(22); pdf.setFont('helvetica', 'bold'); pdf.text('SolarSight', margin, 16);
  pdf.setFontSize(10); pdf.setFont('helvetica', 'normal');
  pdf.text('Solar Rooftop Suitability Analysis Report', margin, 24);
  pdf.setFontSize(8); pdf.text(`Generated: ${now}`, margin, 31);
  y = 44;

  pdf.setTextColor(30, 58, 95); pdf.setFontSize(14); pdf.setFont('helvetica', 'bold');
  pdf.text(entry.buildingName, margin, y); y += 6;
  pdf.setFontSize(9); pdf.setFont('helvetica', 'normal'); pdf.setTextColor(80, 80, 80);
  pdf.text(`Floors: ${r.floors}   Height: ${r.height !== '\u2014' ? r.height + ' m' : '\u2014'}   Neighbours: ${r.neighbourCount}`, margin, y); y += 5;
  pdf.text(`Suitability Class: ${r.suitabilityClass || r.label}`, margin, y); y += 8;

  if (entry.mapScreenshot) {
    pdf.addImage(entry.mapScreenshot, 'PNG', margin, y, W - margin * 2, 55);
    y += 60;
  }

  const sc = r.score > 70 ? [29, 78, 216] : r.score > 40 ? [217, 119, 6] : [220, 38, 38];
  pdf.setFillColor(...sc);
  pdf.rect(margin, y, W - margin * 2, 14, 'F');
  pdf.setTextColor(255, 255, 255); pdf.setFontSize(13); pdf.setFont('helvetica', 'bold');
  pdf.text(`Suitability Score: ${r.score} / 100  \u2014  ${r.label}`, margin + 4, y + 9.5);
  y += 20;

  pdf.setTextColor(30, 58, 95); pdf.setFontSize(11); pdf.setFont('helvetica', 'bold');
  pdf.text('Analysis Metrics', margin, y); y += 5;

  const metrics = [
    ['Sunny Hours (out of 13)', `${r.sunnyHours} hrs`],
    ['Average Rooftop Sunlit', `${r.avgSunlit}%`],
    ['Total Rooftop Area', `${r.area} m\u00b2`],
    ['Usable Area (70%)', `${r.usableArea} m\u00b2`],
    ['Estimated Panel Count', `${r.panelCount || '\u2014'} panels (330W each)`],
    ['Estimated Capacity', `${r.capacity} kWp`],
    ['Estimated Annual Generation', `${r.generation} kWh/yr`],
    ['CO\u2082 Emission Saved', `${r.co2Saved || '\u2014'} tonnes/yr`],
    ['Annual Electricity Savings', `\u20b9${Number(r.annualSavings || 0).toLocaleString('en-IN')}/yr`],
    ['Installation Cost (est.)', `\u20b9${Number(r.installCost || 0).toLocaleString('en-IN')}`],
    ['Estimated Payback Period', `${r.paybackYears || '\u2014'} years`],
  ];

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

  if (r.simCount > 0 && r.baselineScore !== null) {
    pdf.setFillColor(29, 78, 216);
    pdf.rect(margin, y, W - margin * 2, 8, 'F');
    pdf.setTextColor(255, 255, 255); pdf.setFontSize(10); pdf.setFont('helvetica', 'bold');
    pdf.text('What-If Impact Analysis', margin + 4, y + 5.5);
    y += 12;
    pdf.setFontSize(9); pdf.setFont('helvetica', 'normal'); pdf.setTextColor(80, 80, 80);
    pdf.text(`Baseline score: ${r.baselineScore}/100  \u2192  With ${r.simCount} simulated building(s): ${r.score}/100`, margin + 4, y); y += 5;
    const imp = r.simImpact;
    pdf.setFont('helvetica', 'bold'); pdf.setTextColor(imp <= -5 ? 220 : 22, imp <= -5 ? 38 : 163, imp <= -5 ? 38 : 74);
    pdf.text(`Impact: ${imp > 0 ? '+' : ''}${imp} points`, margin + 4, y); y += 8;
  }

  if (y < 270) {
    pdf.setDrawColor(200, 200, 200); pdf.line(margin, y, W - margin, y); y += 5;
    pdf.setFontSize(7); pdf.setFont('helvetica', 'italic'); pdf.setTextColor(140, 140, 140);
    const note = 'Methodology: Shadow simulation at Mumbai (19.076\u00b0N, 72.877\u00b0E). Score = 50% sunlight + 20% area + 10% height + 20% irradiance. CO\u2082: 0.82 kg/kWh. Tariff: \u20b97/unit. Install: \u20b960,000/kWp.';
    pdf.text(pdf.splitTextToSize(note, W - margin * 2), margin, y);
  }

  pdf.save(`SolarSight_${entry.buildingName.replace(/\s+/g, '_')}.pdf`);
}

/* ─── suitability helpers ─────────────────────────────────────── */
function getSuitTag(score) {
  if (score >= 60) return { label: 'Suitable', cls: 'suitable' };
  if (score >= 35) return { label: 'Moderately Suitable', cls: 'moderate' };
  return { label: 'Unsuitable', cls: 'unsuitable' };
}

/* ─── analysis card — clean white design ─────────────────────── */
function AnalysisCard({ entry, onDelete }) {
  const r = entry.result;
  const date = new Date(entry.timestamp).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
  const suit = getSuitTag(r.score);

  const tagColors = {
    suitable: { bg: '#dcfce7', color: '#166534' },
    moderate: { bg: '#fef9c3', color: '#854d0e' },
    unsuitable: { bg: '#fee2e2', color: '#991b1b' },
  };
  const tag = tagColors[suit.cls];

  return (
    <div style={{
      background: '#ffffff',
      border: '1px solid #e2e8f0',
      borderRadius: 8,
      overflow: 'hidden',
      transition: 'box-shadow 0.2s ease',
    }}
      onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.08)'}
      onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}
    >
      {/* Thumbnail */}
      <div style={{ position: 'relative', height: 160, background: '#e2e8f0', overflow: 'hidden' }}>
        {entry.mapScreenshot
          ? <img src={entry.mapScreenshot} alt="map" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: 13 }}>No screenshot</div>
        }
        {/* Score badge */}
        <div style={{
          position: 'absolute', top: '0.75rem', right: '0.75rem',
          background: '#1d4ed8', color: '#ffffff',
          borderRadius: 4, padding: '0.2rem 0.5rem',
          fontSize: '0.8rem', fontWeight: 700,
        }}>
          {r.score}<span style={{ fontSize: '0.65rem', fontWeight: 400, marginLeft: 1 }}>/100</span>
        </div>
      </div>

      {/* Body */}
      <div style={{ padding: '1rem 1.25rem' }}>
        <h3 style={{ fontSize: '0.95rem', fontWeight: 600, color: '#0f172a', margin: '0 0 0.25rem 0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {entry.buildingName}
        </h3>

        <span style={{ fontSize: '0.72rem', fontWeight: 600, padding: '0.15rem 0.5rem', borderRadius: 3, display: 'inline-block', marginBottom: '0.75rem', background: tag.bg, color: tag.color }}>
          {suit.label}
        </span>

        {/* Date */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: '#94a3b8', marginBottom: '0.75rem' }}>
          <CalendarDays size={11} /> {date}
        </div>

        {/* Metrics grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem', marginBottom: '0.75rem' }}>
          {[
            { key: 'SUNNY HRS', val: `${r.sunnyHours}/13` },
            { key: 'SUNLIT', val: `${r.avgSunlit}%` },
            { key: 'CAPACITY', val: `${r.capacity} kWp` },
            { key: 'GENERATION', val: `${(Number(r.generation) / 1000).toFixed(1)} MWh` },
            { key: 'PANELS', val: r.panelCount || '\u2014' },
            { key: 'PAYBACK', val: r.paybackYears ? `${r.paybackYears} yr` : '\u2014' },
            { key: 'CO\u2082 SAVED', val: r.co2Saved ? `${r.co2Saved}t` : '\u2014' },
            { key: 'SAVINGS', val: r.annualSavings ? `\u20b9${(Number(r.annualSavings) / 1000).toFixed(0)}k` : '\u2014' },
          ].map(({ key, val }) => (
            <div key={key}>
              <div style={{ fontSize: '0.62rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{key}</div>
              <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#1e293b' }}>{val}</div>
            </div>
          ))}
        </div>

        {/* What-If row */}
        {r.simCount > 0 && r.baselineScore !== null && (
          <div style={{ fontSize: '0.78rem', color: '#475569', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 4, padding: '0.5rem 0.75rem', marginBottom: '0.75rem' }}>
            <strong style={{ color: '#1d4ed8' }}>What-If:</strong>{' '}
            {r.baselineScore} \u2192 {r.score}/100{' '}
            <span style={{ color: r.simImpact <= -5 ? '#ef4444' : '#16a34a', fontWeight: 700 }}>
              ({r.simImpact > 0 ? '+' : ''}{r.simImpact} pts)
            </span>
          </div>
        )}

        {/* Actions */}
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            onClick={() => exportEntryPDF(entry)}
            style={{ flex: 1, background: '#1d4ed8', color: '#ffffff', border: 'none', borderRadius: 5, padding: '0.55rem 1rem', fontSize: '0.8rem', fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, transition: 'background 0.15s' }}
            onMouseEnter={e => e.currentTarget.style.background = '#1e40af'}
            onMouseLeave={e => e.currentTarget.style.background = '#1d4ed8'}
          >
            <FileText size={13} /> Export PDF
          </button>
          <button
            onClick={() => onDelete(entry.id)}
            style={{ background: 'none', border: '1px solid #fecaca', borderRadius: 5, padding: '0.55rem 0.65rem', color: '#ef4444', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.15s' }}
            onMouseEnter={e => e.currentTarget.style.background = '#fee2e2'}
            onMouseLeave={e => e.currentTarget.style.background = 'none'}
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── summary stat cards ──────────────────────────────────────── */
function SummaryBar({ analyses }) {
  if (!analyses.length) return null;
  const avgScore = Math.round(analyses.reduce((s, a) => s + a.result.score, 0) / analyses.length);
  const totalGen = analyses.reduce((s, a) => s + Number(a.result.generation || 0), 0);
  const totalCO2 = analyses.reduce((s, a) => s + Number(a.result.co2Saved || 0), 0);
  const totalSavings = analyses.reduce((s, a) => s + Number(a.result.annualSavings || 0), 0);

  const cards = [
    { label: 'Avg Score', value: `${avgScore}/100`, primary: true },
    { label: 'Total Generation', value: `${(totalGen / 1000).toFixed(1)} MWh/yr` },
    { label: 'CO\u2082 Offset', value: `${totalCO2.toFixed(1)} t/yr` },
    { label: 'Total Savings', value: `\u20b9${(totalSavings / 1000).toFixed(0)}k/yr` },
    { label: 'Buildings Analysed', value: analyses.length },
  ];

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
      {cards.map(({ label, value, primary }) => (
        <div key={label} style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 8, padding: '1.25rem 1.5rem' }}>
          <div style={{ fontSize: '0.72rem', color: '#64748b', marginBottom: '0.4rem', fontWeight: 500 }}>{label}</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 700, color: primary ? '#1d4ed8' : '#0f172a', lineHeight: 1 }}>{value}</div>
        </div>
      ))}
    </div>
  );
}

/* ─── main dashboard ──────────────────────────────────────────── */
export default function SolarDashboard() {
  const navigate = useNavigate();
  const [analyses, setAnalyses] = useState([]);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('newest');

  const load = useCallback(() => {
    try { setAnalyses(JSON.parse(localStorage.getItem('solar_analyses') || '[]')); }
    catch { setAnalyses([]); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleDelete = (id) => {
    const updated = analyses.filter(a => a.id !== id);
    localStorage.setItem('solar_analyses', JSON.stringify(updated));
    setAnalyses(updated);
  };

  const filtered = analyses
    .filter(a => a.buildingName.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      if (sortBy === 'newest') return b.id - a.id;
      if (sortBy === 'oldest') return a.id - b.id;
      if (sortBy === 'score_desc') return b.result.score - a.result.score;
      if (sortBy === 'score_asc') return a.result.score - b.result.score;
      return 0;
    });

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', fontFamily: "'Inter','Segoe UI',sans-serif", color: '#0f172a' }}>

      {/* Top nav bar */}
      <div style={{
        background: '#ffffff', borderBottom: '1px solid #e2e8f0',
        padding: '0 2rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        height: 56, position: 'sticky', top: 0, zIndex: 100,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button
            onClick={() => navigate('/map')}
            style={{ background: 'none', border: '1px solid #cbd5e1', borderRadius: 4, padding: '0.4rem 0.75rem', fontSize: '0.8rem', color: '#475569', cursor: 'pointer', transition: 'border-color 0.15s' }}
            onMouseEnter={e => e.currentTarget.style.borderColor = '#94a3b8'}
            onMouseLeave={e => e.currentTarget.style.borderColor = '#cbd5e1'}
          >
            &larr; Back to Map
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Sun size={16} color="#1d4ed8" />
            <h2 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#0f172a', margin: 0 }}>
              SolarSight
            </h2>
            <span style={{ width: 1, height: 18, background: '#e2e8f0' }} />
            <span style={{ fontSize: '0.85rem', color: '#64748b' }}>Analysis Dashboard</span>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 13, color: '#64748b' }}>{analyses.length} saved</span>
          {analyses.length > 0 && (
            <button
              onClick={() => { if (window.confirm('Delete all saved analyses?')) { localStorage.removeItem('solar_analyses'); setAnalyses([]); } }}
              style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '0.4rem 0.75rem', borderRadius: 4, border: '1px solid #fecaca', background: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '0.8rem', transition: 'background 0.15s' }}
              onMouseEnter={e => e.currentTarget.style.background = '#fee2e2'}
              onMouseLeave={e => e.currentTarget.style.background = 'none'}
            >
              <Trash2 size={12} /> Clear All
            </button>
          )}
        </div>
      </div>

      {/* Body */}
      <div style={{ maxWidth: 1400, margin: '0 auto', padding: '2rem 2rem' }}>

        {analyses.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '120px 0' }}>
            <div style={{ marginBottom: 20, color: '#cbd5e1' }}><Sun size={48} /></div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#0f172a', marginBottom: 10 }}>No Saved Analyses Yet</div>
            <div style={{ fontSize: '0.95rem', color: '#64748b', marginBottom: 32, lineHeight: 1.7 }}>
              Run a Solar Suitability analysis on the map, then click<br />
              <strong style={{ color: '#1d4ed8' }}>Save Analysis</strong> to see your results here.
            </div>
            <button
              onClick={() => navigate('/map')}
              style={{ padding: '0.75rem 2rem', borderRadius: 6, border: 'none', background: '#1d4ed8', color: 'white', fontWeight: 600, fontSize: '0.95rem', cursor: 'pointer', transition: 'background 0.15s' }}
              onMouseEnter={e => e.currentTarget.style.background = '#1e40af'}
              onMouseLeave={e => e.currentTarget.style.background = '#1d4ed8'}
            >
              Go to Map &rarr;
            </button>
          </div>
        ) : (
          <>
            <SummaryBar analyses={analyses} />

            {/* Search / sort controls */}
            <div style={{ display: 'flex', gap: 12, marginBottom: '1.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search by building name..."
                style={{ flex: 1, minWidth: 220, padding: '0.55rem 0.875rem', borderRadius: 6, border: '1px solid #e2e8f0', background: '#ffffff', color: '#0f172a', fontSize: '0.875rem', outline: 'none' }}
              />
              <select
                value={sortBy}
                onChange={e => setSortBy(e.target.value)}
                style={{ padding: '0.55rem 0.875rem', borderRadius: 6, border: '1px solid #e2e8f0', background: '#ffffff', color: '#0f172a', fontSize: '0.875rem', cursor: 'pointer' }}
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
                <option value="score_desc">Highest Score</option>
                <option value="score_asc">Lowest Score</option>
              </select>
              <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>{filtered.length} result{filtered.length !== 1 ? 's' : ''}</span>
            </div>

            {/* Cards grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1rem' }}>
              {filtered.map(entry => (
                <AnalysisCard key={entry.id} entry={entry} onDelete={handleDelete} />
              ))}
            </div>

            {filtered.length === 0 && (
              <div style={{ textAlign: 'center', padding: '60px 0', color: '#94a3b8', fontSize: '0.95rem' }}>
                No analyses match &ldquo;<strong style={{ color: '#64748b' }}>{search}</strong>&rdquo;
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

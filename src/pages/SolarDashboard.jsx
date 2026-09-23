import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

/* ─── tiny circular gauge ─────────────────────────────────────── */
function MiniGauge({ score }) {
  const r = 28, cx = 34, cy = 34;
  const circ = 2 * Math.PI * r;
  const dash = (score / 100) * circ;
  const color = score > 70 ? '#22c55e' : score > 40 ? '#f59e0b' : '#ef4444';
  return (
    <svg width={68} height={68} viewBox="0 0 68 68">
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#1e3a5f" strokeWidth={6} />
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth={6}
        strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
        transform={`rotate(-90 ${cx} ${cy})`} style={{ transition: 'stroke-dasharray 1s ease' }} />
      <text x={cx} y={cy + 5} textAnchor="middle" fontSize={14} fontWeight="bold" fill={color}>{score}</text>
    </svg>
  );
}

/* ─── metric chip ─────────────────────────────────────────────── */
function Chip({ label, value, color }) {
  return (
    <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 6, padding: '5px 10px', minWidth: 86 }}>
      <div style={{ fontSize: 9, color: color || '#94a3b8', letterSpacing: '0.05em', marginBottom: 2, textTransform: 'uppercase' }}>{label}</div>
      <div style={{ fontSize: 13, fontWeight: 700, color: '#f1f5f9' }}>{value}</div>
    </div>
  );
}

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

  const sc = r.score > 70 ? [22, 163, 74] : r.score > 40 ? [217, 119, 6] : [220, 38, 38];
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
    pdf.setFillColor(245, 158, 11);
    pdf.rect(margin, y, W - margin * 2, 8, 'F');
    pdf.setTextColor(255, 255, 255); pdf.setFontSize(10); pdf.setFont('helvetica', 'bold');
    pdf.text('\u26a1 What-If Impact Analysis', margin + 4, y + 5.5);
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

/* ─── analysis card ───────────────────────────────────────────── */
function AnalysisCard({ entry, onDelete }) {
  const r = entry.result;
  const date = new Date(entry.timestamp).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
  const scoreColor = r.score > 70 ? '#22c55e' : r.score > 40 ? '#f59e0b' : '#ef4444';
  const [hovered, setHovered] = useState(false);

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: 'linear-gradient(145deg, rgba(255,255,255,0.07), rgba(255,255,255,0.03))',
        border: `1px solid ${hovered ? scoreColor + '50' : 'rgba(255,255,255,0.1)'}`,
        borderRadius: 16, overflow: 'hidden',
        boxShadow: hovered ? `0 20px 60px rgba(0,0,0,0.6), 0 0 0 1px ${scoreColor}30` : '0 8px 32px rgba(0,0,0,0.4)',
        transform: hovered ? 'translateY(-6px)' : 'translateY(0)',
        transition: 'all 0.25s ease',
        backdropFilter: 'blur(10px)',
      }}
    >
      {/* Map thumbnail */}
      <div style={{ position: 'relative', height: 170, background: '#0f172a', overflow: 'hidden' }}>
        {entry.mapScreenshot
          ? <img src={entry.mapScreenshot} alt="map" style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.85 }} />
          : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#475569', fontSize: 13 }}>No screenshot</div>
        }
        <div style={{
          position: 'absolute', top: 10, right: 10,
          background: 'rgba(0,0,0,0.75)', borderRadius: 10, padding: '4px 10px',
          border: `1px solid ${scoreColor}`, backdropFilter: 'blur(8px)',
        }}>
          <span style={{ fontSize: 20, fontWeight: 900, color: scoreColor }}>{r.score}</span>
          <span style={{ fontSize: 10, color: '#94a3b8', marginLeft: 2 }}>/100</span>
        </div>
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0,
          background: 'linear-gradient(transparent, rgba(0,0,0,0.88))',
          padding: '20px 12px 8px',
        }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#f1f5f9', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {entry.buildingName}
          </div>
          <div style={{ fontSize: 11, color: scoreColor, fontWeight: 600 }}>{r.suitabilityClass || r.label}</div>
        </div>
      </div>

      {/* Body */}
      <div style={{ padding: '14px 14px 12px' }}>
        <div style={{ fontSize: 11, color: '#475569', marginBottom: 10 }}>📅 {date}</div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
          <Chip label="Sunny Hrs" value={`${r.sunnyHours}/13`} color="#60a5fa" />
          <Chip label="Sunlit" value={`${r.avgSunlit}%`} color="#34d399" />
          <Chip label="Capacity" value={`${r.capacity} kWp`} color="#fbbf24" />
          <Chip label="Generation" value={`${(Number(r.generation)/1000).toFixed(1)} MWh`} color="#a78bfa" />
          <Chip label="Panels" value={r.panelCount || '\u2014'} color="#f472b6" />
          <Chip label="Payback" value={r.paybackYears ? `${r.paybackYears} yr` : '\u2014'} color="#fb923c" />
          <Chip label="CO\u2082 Saved" value={r.co2Saved ? `${r.co2Saved}t` : '\u2014'} color="#4ade80" />
          <Chip label="Savings" value={r.annualSavings ? `\u20b9${(Number(r.annualSavings)/1000).toFixed(0)}k` : '\u2014'} color="#e879f9" />
        </div>

        {r.simCount > 0 && r.baselineScore !== null && (
          <div style={{ background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.28)', borderRadius: 8, padding: '6px 10px', marginBottom: 10, fontSize: 12 }}>
            <span style={{ color: '#fbbf24', fontWeight: 700 }}>⚡ What-If: </span>
            <span style={{ color: '#cbd5e1' }}>{r.baselineScore} \u2192 {r.score}/100 </span>
            <span style={{ color: r.simImpact <= -5 ? '#ef4444' : '#22c55e', fontWeight: 700 }}>
              ({r.simImpact > 0 ? '+' : ''}{r.simImpact} pts)
            </span>
          </div>
        )}

        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => exportEntryPDF(entry)}
            style={{ flex: 1, padding: '9px 0', borderRadius: 8, border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(30,58,95,0.8)', color: '#e2e8f0', fontWeight: 600, fontSize: 12, cursor: 'pointer', transition: 'background 0.2s' }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(37,99,235,0.85)'}
            onMouseLeave={e => e.currentTarget.style.background = 'rgba(30,58,95,0.8)'}
          >
            📄 Export PDF
          </button>
          <button
            onClick={() => onDelete(entry.id)}
            style={{ padding: '9px 14px', borderRadius: 8, border: '1px solid rgba(220,38,38,0.22)', background: 'rgba(220,38,38,0.08)', color: '#fca5a5', fontWeight: 600, fontSize: 13, cursor: 'pointer', transition: 'background 0.2s' }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(220,38,38,0.28)'}
            onMouseLeave={e => e.currentTarget.style.background = 'rgba(220,38,38,0.08)'}
          >
            🗑
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── summary stats bar ───────────────────────────────────────── */
function SummaryBar({ analyses }) {
  if (!analyses.length) return null;
  const avgScore = Math.round(analyses.reduce((s, a) => s + a.result.score, 0) / analyses.length);
  const totalGen = analyses.reduce((s, a) => s + Number(a.result.generation || 0), 0);
  const totalCO2 = analyses.reduce((s, a) => s + Number(a.result.co2Saved || 0), 0);
  const totalSavings = analyses.reduce((s, a) => s + Number(a.result.annualSavings || 0), 0);
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 16, marginBottom: 36 }}>
      {[
        { label: 'Avg Score', value: `${avgScore}/100`, icon: '🎯', color: '#60a5fa' },
        { label: 'Total Generation', value: `${(totalGen / 1000).toFixed(1)} MWh/yr`, icon: '⚡', color: '#fbbf24' },
        { label: 'CO\u2082 Offset', value: `${totalCO2.toFixed(1)} t/yr`, icon: '🌱', color: '#4ade80' },
        { label: 'Total Savings', value: `\u20b9${(totalSavings / 1000).toFixed(0)}k/yr`, icon: '💰', color: '#e879f9' },
        { label: 'Buildings Analysed', value: analyses.length, icon: '🏢', color: '#fb923c' },
      ].map(({ label, value, icon, color }) => (
        <div key={label} style={{
          background: 'linear-gradient(135deg, rgba(255,255,255,0.07), rgba(255,255,255,0.02))',
          border: `1px solid ${color}28`, borderRadius: 14, padding: '18px 18px',
          boxShadow: `0 4px 24px ${color}15`,
        }}>
          <div style={{ fontSize: 26, marginBottom: 8 }}>{icon}</div>
          <div style={{ fontSize: 22, fontWeight: 900, color, letterSpacing: '-0.5px', lineHeight: 1 }}>{value}</div>
          <div style={{ fontSize: 11, color: '#64748b', marginTop: 5, letterSpacing: '0.04em' }}>{label}</div>
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
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #050d1a 0%, #0a1628 50%, #0f2235 100%)', fontFamily: "'Inter','Segoe UI',sans-serif", color: '#f1f5f9' }}>

      {/* Header */}
      <div style={{
        background: 'rgba(255,255,255,0.035)', borderBottom: '1px solid rgba(255,255,255,0.07)',
        padding: '0 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        height: 64, backdropFilter: 'blur(16px)', position: 'sticky', top: 0, zIndex: 100,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <button onClick={() => navigate('/map')}
            style={{ padding: '6px 14px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.12)', background: 'transparent', color: '#94a3b8', cursor: 'pointer', fontSize: 13, transition: 'border-color 0.2s' }}
            onMouseEnter={e => e.currentTarget.style.borderColor = '#60a5fa'}
            onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)'}
          >
            &larr; Back to Map
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 21, fontWeight: 900, background: 'linear-gradient(90deg, #60a5fa, #a78bfa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              SolarSight
            </span>
            <span style={{ width: 1, height: 20, background: 'rgba(255,255,255,0.15)' }} />
            <span style={{ fontSize: 14, color: '#64748b' }}>Analysis Dashboard</span>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 13, color: '#475569' }}>{analyses.length} saved</span>
          {analyses.length > 0 && (
            <button
              onClick={() => { if (window.confirm('Delete all saved analyses?')) { localStorage.removeItem('solar_analyses'); setAnalyses([]); } }}
              style={{ padding: '6px 14px', borderRadius: 8, border: '1px solid rgba(220,38,38,0.28)', background: 'rgba(220,38,38,0.08)', color: '#fca5a5', cursor: 'pointer', fontSize: 12 }}
            >
              🗑 Clear All
            </button>
          )}
        </div>
      </div>

      {/* Body */}
      <div style={{ maxWidth: 1400, margin: '0 auto', padding: '40px 32px' }}>

        {analyses.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '120px 0' }}>
            <div style={{ fontSize: 80, marginBottom: 24 }}>☀️</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: '#1e293b', marginBottom: 12 }}>No Saved Analyses Yet</div>
            <div style={{ fontSize: 15, color: '#475569', marginBottom: 36, lineHeight: 1.7 }}>
              Run a Solar Suitability analysis on the map, then click<br />
              <strong style={{ color: '#60a5fa' }}>💾 Save Analysis</strong> to see your results here.
            </div>
            <button onClick={() => navigate('/map')}
              style={{ padding: '13px 32px', borderRadius: 12, border: 'none', background: 'linear-gradient(135deg, #2563eb, #7c3aed)', color: 'white', fontWeight: 700, fontSize: 15, cursor: 'pointer', boxShadow: '0 8px 32px rgba(37,99,235,0.4)' }}
            >
              Go to Map &rarr;
            </button>
          </div>
        ) : (
          <>
            <SummaryBar analyses={analyses} />

            {/* Controls */}
            <div style={{ display: 'flex', gap: 12, marginBottom: 28, flexWrap: 'wrap', alignItems: 'center' }}>
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="\uD83D\uDD0D Search by building name..."
                style={{ flex: 1, minWidth: 220, padding: '10px 14px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)', color: '#f1f5f9', fontSize: 13, outline: 'none' }}
              />
              <select value={sortBy} onChange={e => setSortBy(e.target.value)}
                style={{ padding: '10px 14px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(10,22,40,0.9)', color: '#f1f5f9', fontSize: 13, cursor: 'pointer' }}
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
                <option value="score_desc">Highest Score</option>
                <option value="score_asc">Lowest Score</option>
              </select>
              <span style={{ fontSize: 13, color: '#475569' }}>{filtered.length} result{filtered.length !== 1 ? 's' : ''}</span>
            </div>

            {/* Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 24 }}>
              {filtered.map(entry => (
                <AnalysisCard key={entry.id} entry={entry} onDelete={handleDelete} />
              ))}
            </div>

            {filtered.length === 0 && (
              <div style={{ textAlign: 'center', padding: '60px 0', color: '#475569', fontSize: 15 }}>
                No analyses match &ldquo;<strong style={{ color: '#94a3b8' }}>{search}</strong>&rdquo;
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

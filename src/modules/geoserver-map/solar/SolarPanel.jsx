// Solar Suitability tool for the GeoServer map: same workflow as the ArcGIS tool (pick or search a building,
// or design a new one; choose the day; optionally add proposed towers; run the hourly shadow analysis),
// driven entirely by GeoServer WFS data and drawn in CesiumJS.
import { useEffect, useRef, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, CartesianGrid } from 'recharts';
import { SEASONS, seasonDayOfYear } from '../config';
import {
  ANALYSIS_HOURS, METERS_PER_FLOOR, analyseRooftop, buildResult, featureHeight, geometryCentroid, solarHourToIst,
} from './solarAnalysis';
import { fetchNeighbours, gidOf, searchBuildings } from './buildingQueries';
import { RAMP_CSS, addBlockEntity, captureView, drawFootprint, groundHeightAt, roofHeatmapPrimitive, setBlockHeight } from './cesiumOverlays';
import { exportPdf, saveToDashboard } from './report';

const NAVY = '#1e3a5f';
const STEP_MS = 140;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export function buildingName(props = {}) {
  return props.name?.trim() || props.address?.trim() || `Building #${props.bld_id ?? '?'}`;
}

const scoreColor = (s) => (s > 70 ? '#22c55e' : s > 40 ? '#f59e0b' : '#ef4444');
const sunColor = (pct) => (pct >= 70 ? '#22c55e' : pct >= 40 ? '#f59e0b' : pct > 0 ? '#f97316' : '#374151');
const hourLabel = (h) => (h < 12 ? `${h} AM` : h === 12 ? '12 PM' : `${h - 12} PM`);

function Gauge({ score }) {
  const [shown, setShown] = useState(0);
  useEffect(() => {
    let frame;
    const start = performance.now();
    const tick = (now) => {
      const p = Math.min((now - start) / 1200, 1);
      setShown(Math.round((1 - (1 - p) ** 3) * score));
      if (p < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [score]);
  const r = 38; const c = 2 * Math.PI * r;
  return (
    <svg width="96" height="96" viewBox="0 0 96 96" style={{ flexShrink: 0 }}>
      <circle cx="48" cy="48" r={r} stroke="#e2e8f0" strokeWidth="8" fill="none" />
      <circle cx="48" cy="48" r={r} stroke={scoreColor(shown)} strokeWidth="8" fill="none" strokeLinecap="round"
        strokeDasharray={c} strokeDashoffset={c - (shown / 100) * c} transform="rotate(-90 48 48)" />
      <text x="48" y="54" textAnchor="middle" fontSize="22" fontWeight="700" fill="#0f172a">{shown}</text>
    </svg>
  );
}

function recommendations(r) {
  const recs = [];
  const homes = Math.round(Number(r.generation) / 1200);
  const trees = Math.round((Number(r.co2Saved) * 1000) / 22);
  if (r.score >= 80) recs.push(['#16a34a', 'Excellent solar candidate', `Highly suitable roof. Expected generation can power about ${homes} average Mumbai household${homes === 1 ? '' : 's'} a year.`]);
  else if (r.score >= 55) recs.push(['#d97706', 'Good potential with optimisation', 'Some shading from neighbours. Tilt panels 15–20° and use micro-inverters or optimisers to limit losses from partial shade.']);
  else if (r.score >= 40) recs.push(['#ea580c', 'Moderate potential — needs assessment', 'Neighbouring buildings shade a large part of the roof. A site survey is advised; place panels on the sunniest part of the roof (see the heatmap).']);
  else recs.push(['#dc2626', 'Low solar potential', 'Heavy shading makes this roof less viable. Consider community or group solar on a sunnier rooftop nearby.']);
  if (trees > 0) recs.push(['#059669', 'Environmental impact', `Saves ${r.co2Saved} t of CO₂ a year — about the same as ${trees} trees.`]);
  const pb = Number(r.paybackYears);
  if (pb > 0 && pb <= 6) recs.push(['#7c3aed', 'Strong return', `Pays back in ${r.paybackYears} years, then saves ₹${Number(r.annualSavings).toLocaleString('en-IN')} every year.`]);
  else if (pb > 6) recs.push(['#6366f1', 'Long-term investment', `Payback ${r.paybackYears} years. The PM Surya Ghar subsidy can cut this considerably for homes.`]);
  if (r.sunnyHours <= 5) recs.push(['#b45309', 'Seasonal consideration', `Only ${r.sunnyHours} sunny hours on this day. Try other days to see the seasonal range.`]);
  return recs;
}

const Section = ({ title, children, right }) => (
  <div style={{ padding: '10px 12px', borderTop: '1px solid #e2e8f0' }}>
    <div style={{ display: 'flex', alignItems: 'center', fontSize: 10, fontWeight: 700, letterSpacing: '0.07em', color: '#64748b', textTransform: 'uppercase', marginBottom: 6 }}>
      <span style={{ flex: 1 }}>{title}</span>{right}
    </div>
    {children}
  </div>
);

const btn = (bg = NAVY, fg = '#fff') => ({ padding: '7px 10px', background: bg, color: fg, border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 600, fontSize: 12 });

export default function SolarPanel({ viewerRef, interactionRef, selected, onSelectFeature, onFocusKey, groundOf, tintBuildings, season, setSeason, setHour, onClose }) {
  const [mode, setMode] = useState('existing');
  const [term, setTerm] = useState('');
  const [results, setResults] = useState(null);
  const [searching, setSearching] = useState(false);
  const [designed, setDesigned] = useState(null);
  const [designFloors, setDesignFloors] = useState(4);
  const [sims, setSims] = useState([]);
  const [simFloors, setSimFloors] = useState(20);
  const [drawing, setDrawing] = useState(null); // { kind: 'design' | 'sim', points }
  const [progress, setProgress] = useState(null);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
  const [blockers, setBlockers] = useState([]);
  const [saved, setSaved] = useState('');
  const drawRef = useRef(null);
  const heatmapRef = useRef(null);
  const runIdRef = useRef(0);
  const entitiesRef = useRef({ sims: [], designed: null }); // for cleanup on close
  entitiesRef.current = { sims, designed };

  const viewer = () => viewerRef.current;

  const clearOutput = () => {
    runIdRef.current++;
    setResult(null); setBlockers([]); setProgress(null); setSaved('');
    tintBuildings([]);
    const v = viewer();
    if (heatmapRef.current && v && !v.isDestroyed()) v.scene.primitives.remove(heatmapRef.current);
    heatmapRef.current = null;
  };

  // A new target (or a different day / set of proposed towers) invalidates the previous result.
  useEffect(clearOutput, [selected?.index, mode, designed, season, sims]); // eslint-disable-line react-hooks/exhaustive-deps

  // Leave the map clean when the tool closes.
  useEffect(() => () => {
    clearOutput();
    drawRef.current?.cancel();
    interactionRef.current = null;
    const v = viewer();
    if (v && !v.isDestroyed()) {
      const { sims: list, designed: d } = entitiesRef.current;
      list.forEach((s) => v.entities.remove(s.entity));
      if (d) v.entities.remove(d.entity);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') stopDrawing(); if (e.key === 'Enter') drawRef.current?.finish(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const stopDrawing = () => {
    drawRef.current?.cancel();
    drawRef.current = null;
    interactionRef.current = null;
    setDrawing(null);
  };

  const startDrawing = (kind) => {
    stopDrawing();
    const v = viewer();
    if (!v) return;
    interactionRef.current = 'draw';
    setDrawing({ kind, points: 0 });
    drawRef.current = drawFootprint(v, {
      color: kind === 'design' ? '#22d3ee' : '#f59e0b',
      onChange: (points) => setDrawing({ kind, points }),
      onFinish: async (ring) => {
        drawRef.current = null;
        interactionRef.current = null;
        setDrawing(null);
        const geometry = { type: 'Polygon', coordinates: [ring] };
        const base = await groundHeightAt(v, geometryCentroid(geometry));
        if (kind === 'design') {
          const height = designFloors * METERS_PER_FLOOR;
          setDesigned((d) => {
            if (d) v.entities.remove(d.entity);
            return { geometry, ring, base, floors: designFloors, height, entity: addBlockEntity(v, { ring, base, height, color: '#22d3ee', label: `New G+${designFloors - 1}` }) };
          });
        } else {
          const height = simFloors * METERS_PER_FLOOR;
          const id = `sim-${Date.now()}`;
          setSims((list) => [...list, { id, geometry, ring, base, floors: simFloors, height, entity: addBlockEntity(v, { ring, base, height, color: '#f59e0b', label: `Proposed G+${simFloors - 1}` }) }]);
        }
      },
    });
  };

  const setSimFloorsFor = (id, floors) => setSims((list) => list.map((s) => {
    if (s.id !== id) return s;
    const f = Math.max(1, Math.min(80, Math.round(floors) || 1));
    const height = f * METERS_PER_FLOOR;
    setBlockHeight(s.entity, { ring: s.ring, base: s.base, height, label: `Proposed G+${f - 1}` });
    return { ...s, floors: f, height };
  }));

  const removeSim = (id) => setSims((list) => list.filter((s) => {
    if (s.id === id) viewer()?.entities.remove(s.entity);
    return s.id !== id;
  }));

  const doSearch = async (e) => {
    e?.preventDefault();
    if (!term.trim()) return;
    setSearching(true); setError('');
    try { setResults(await searchBuildings(term)); } catch (err) { setError(`Search failed: ${err.message}`); }
    setSearching(false);
  };

  const target = mode === 'existing'
    ? selected && { geometry: selected.feature.geometry, props: selected.feature.properties, index: selected.index }
    : designed && { geometry: designed.geometry, props: { height: designed.height, no_floors: `G+${designed.floors - 1}` } };

  const run = async () => {
    if (!target) return;
    clearOutput();
    const runId = runIdRef.current;
    setError(''); setProgress(0);
    try {
      const heightM = featureHeight(target.props);
      const doy = seasonDayOfYear(season);
      const nbFeatures = await fetchNeighbours({
        geometry: target.geometry,
        minHeight: heightM,
        excludeGid: mode === 'existing' ? gidOf(selected.feature) : undefined,
        replaceUnder: mode === 'designed',
      });
      const neighbours = nbFeatures.map((f) => ({ key: f.id, geometry: f.geometry, height: featureHeight(f.properties), name: buildingName(f.properties) }));
      const proposed = sims.map((s) => ({ key: s.id, geometry: s.geometry, height: s.height, name: `Proposed tower G+${s.floors - 1}`, sim: true }));
      const t = { geometry: target.geometry, height: heightM, area: target.props.area_sqmtr };
      const analysis = analyseRooftop({ target: t, neighbours: [...neighbours, ...proposed], dayOfYear: doy });
      const baseline = proposed.length ? analyseRooftop({ target: t, neighbours, dayOfYear: doy }) : null;

      // Walk the 3D sun through the analysed hours so the visitor sees the shadows move.
      for (let i = 0; i < ANALYSIS_HOURS.length; i++) {
        if (runIdRef.current !== runId) return;
        setHour(solarHourToIst(ANALYSIS_HOURS[i], doy));
        setProgress(Math.round(((i + 1) / ANALYSIS_HOURS.length) * 100));
        await sleep(STEP_MS);
      }
      if (runIdRef.current !== runId) return;
      setHour(solarHourToIst(12, doy));

      const v = viewer();
      const base = mode === 'existing' ? groundOf(target.index) : designed.base;
      const roofZ = base + (mode === 'existing' ? Math.max(heightM, 3) : heightM);
      heatmapRef.current = v.scene.primitives.add(roofHeatmapPrimitive(analysis, roofZ));
      tintBuildings(analysis.blockers.filter((b) => !b.sim).slice(0, 5).map((b) => b.key));
      if (mode === 'existing') onFocusKey(selected.feature.id, -62); // look down onto the roof heatmap

      setBlockers(analysis.blockers);
      setResult(buildResult({
        analysis, baseline, heightM, dayOfYear: doy,
        floors: target.props.no_floors?.trim?.() || null,
        seasonLabel: SEASONS[season].label,
        neighbourCount: neighbours.length,
        simCount: proposed.length,
      }));
      setProgress(null);
    } catch (err) {
      setError(`Analysis failed: ${err.message}`);
      setProgress(null);
    }
  };

  const nameOfTarget = () => (mode === 'existing' ? buildingName(selected?.feature.properties) : `Designed building (G+${designed?.floors - 1})`);

  const save = () => {
    try {
      saveToDashboard({
        buildingName: nameOfTarget(),
        buildingInfo: mode === 'existing'
          ? { name: nameOfTarget(), floors: selected.feature.properties.no_floors, height: selected.feature.properties.height, id: selected.feature.properties.bld_id }
          : { name: nameOfTarget(), floors: designed.floors, height: designed.height },
        result,
        mapScreenshot: captureView(viewer()),
      });
      setSaved('Saved to dashboard');
    } catch (err) {
      setSaved(`Could not save: ${err.message}`);
    }
    setTimeout(() => setSaved(''), 3500);
  };

  const pdf = () => exportPdf({ buildingName: nameOfTarget(), result, mapScreenshot: captureView(viewer(), 900, 500), blockers: blockers.filter((b) => !b.sim) });

  const props = selected?.feature.properties;

  return (
    <div style={{ width: 390, flexShrink: 0, background: '#fff', borderLeft: `2px solid ${NAVY}`, display: 'flex', flexDirection: 'column', fontSize: 12, color: '#0f172a', minHeight: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', padding: '10px 12px', background: NAVY, color: '#fff' }}>
        <strong style={{ fontSize: 14, flex: 1 }}>☀ Solar Suitability</strong>
        <span style={{ fontSize: 10, opacity: 0.75, marginRight: 10 }}>GeoServer WFS · F/S ward</span>
        <button onClick={onClose} title="Close" style={{ ...btn('transparent'), padding: '2px 6px', fontSize: 16 }}>×</button>
      </div>

      <div style={{ overflowY: 'auto', flex: 1 }}>
        <div style={{ display: 'flex', gap: 6, padding: '10px 12px 4px' }}>
          {[['existing', 'Existing building'], ['designed', 'Design new building']].map(([id, label]) => (
            <button key={id} onClick={() => { stopDrawing(); setMode(id); }} style={{ ...btn(mode === id ? NAVY : '#e2e8f0', mode === id ? '#fff' : '#334155'), flex: 1 }}>{label}</button>
          ))}
        </div>

        {mode === 'existing' ? (
          <Section title="1 · Building">
            <form onSubmit={doSearch} style={{ display: 'flex', gap: 6 }}>
              <input value={term} onChange={(e) => setTerm(e.target.value)} placeholder="Search name, address or building ID" style={{ flex: 1, padding: '6px 8px', border: '1px solid #cbd5e1', borderRadius: 6, fontSize: 12 }} />
              <button type="submit" style={btn()} disabled={searching}>{searching ? '…' : 'Search'}</button>
            </form>
            {results && (
              <div style={{ marginTop: 6, border: '1px solid #e2e8f0', borderRadius: 6, maxHeight: 170, overflowY: 'auto' }}>
                {results.length === 0 && <div style={{ padding: 8, color: '#64748b' }}>No buildings found in F/S ward.</div>}
                {results.map((f) => (
                  <button key={f.id} onClick={() => { onSelectFeature(f); setResults(null); }} style={{ display: 'flex', width: '100%', textAlign: 'left', gap: 8, padding: '6px 8px', border: 'none', borderBottom: '1px solid #f1f5f9', background: '#fff', cursor: 'pointer', fontSize: 12 }}>
                    <span style={{ flex: 1 }}>{buildingName(f.properties)}</span>
                    <span style={{ color: '#64748b' }}>{Number(f.properties.height).toFixed(0)} m</span>
                  </button>
                ))}
              </div>
            )}
            <div style={{ marginTop: 6, color: '#64748b' }}>…or click any building in the 3D view.</div>
            {props && (
              <div style={{ marginTop: 8, padding: '8px 10px', background: '#ecfeff', border: '1px solid #a5f3fc', borderRadius: 6 }}>
                <div style={{ fontWeight: 700, fontSize: 13 }}>{buildingName(props)}</div>
                <div style={{ color: '#475569', marginTop: 2 }}>
                  {props.no_floors || '—'} · {Number(props.height).toFixed(1)} m · {Math.round(props.area_sqmtr || 0).toLocaleString('en-IN')} m² · {props.class || '—'}
                </div>
              </div>
            )}
          </Section>
        ) : (
          <Section title="1 · New building">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <label>Floors <input type="number" min={1} max={80} value={designFloors} onChange={(e) => setDesignFloors(Math.max(1, Math.min(80, Number(e.target.value) || 1)))} style={{ width: 56, padding: 4 }} /></label>
              <span style={{ color: '#64748b' }}>= {(designFloors * METERS_PER_FLOOR).toFixed(1)} m</span>
              <button onClick={() => startDrawing('design')} style={{ ...btn('#0891b2'), marginLeft: 'auto' }}>{designed ? 'Redraw footprint' : 'Draw footprint'}</button>
            </div>
            {designed && (
              <div style={{ marginTop: 8, padding: '8px 10px', background: '#ecfeff', border: '1px solid #a5f3fc', borderRadius: 6 }}>
                <strong>Designed building</strong> · G+{designed.floors - 1} · {designed.height.toFixed(1)} m. Existing buildings under the footprint are treated as demolished.
              </div>
            )}
          </Section>
        )}

        {drawing && (
          <div style={{ margin: '0 12px 8px', padding: '8px 10px', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 6 }}>
            <strong>Drawing {drawing.kind === 'design' ? 'footprint' : 'proposed tower'}:</strong> click corners in the 3D view ({drawing.points} placed). Double-click or Enter to finish, right-click to undo, Esc to cancel.
            <div style={{ marginTop: 6, display: 'flex', gap: 6 }}>
              <button onClick={() => drawRef.current?.finish()} disabled={drawing.points < 3} style={btn(drawing.points < 3 ? '#94a3b8' : '#16a34a')}>Finish</button>
              <button onClick={stopDrawing} style={btn('#e2e8f0', '#334155')}>Cancel</button>
            </div>
          </div>
        )}

        <Section title="2 · Day">
          <select value={season} onChange={(e) => setSeason(e.target.value)} style={{ width: '100%', padding: 5 }}>
            {Object.entries(SEASONS).map(([id, s]) => <option key={id} value={id}>{s.label}</option>)}
          </select>
        </Section>

        <Section title="3 · What-if: proposed towers (optional)">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <label>Floors <input type="number" min={1} max={80} value={simFloors} onChange={(e) => setSimFloors(Math.max(1, Math.min(80, Number(e.target.value) || 1)))} style={{ width: 56, padding: 4 }} /></label>
            <button onClick={() => startDrawing('sim')} style={{ ...btn('#d97706'), marginLeft: 'auto' }}>+ Draw tower</button>
          </div>
          {sims.map((s) => (
            <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6, padding: '4px 8px', background: '#fffbeb', borderRadius: 6 }}>
              <span style={{ flex: 1 }}>Proposed tower</span>
              <input type="number" min={1} max={80} value={s.floors} onChange={(e) => setSimFloorsFor(s.id, Number(e.target.value))} style={{ width: 50, padding: 2 }} /> floors
              <button onClick={() => removeSim(s.id)} style={{ ...btn('#fee2e2', '#b91c1c'), padding: '2px 8px' }}>Remove</button>
            </div>
          ))}
        </Section>

        <div style={{ padding: '10px 12px', borderTop: '1px solid #e2e8f0' }}>
          <button onClick={run} disabled={!target || progress !== null} style={{ ...btn(!target ? '#94a3b8' : '#16a34a'), width: '100%', padding: 10, fontSize: 13 }}>
            {progress !== null ? `Simulating sun path… ${progress}%` : target ? 'Run solar analysis' : mode === 'existing' ? 'Select a building first' : 'Draw a footprint first'}
          </button>
          {progress !== null && <div style={{ marginTop: 6, height: 4, background: '#e2e8f0', borderRadius: 2 }}><div style={{ width: `${progress}%`, height: '100%', background: '#16a34a', borderRadius: 2, transition: 'width 0.12s' }} /></div>}
          {error && <div style={{ marginTop: 6, color: '#b91c1c' }}>{error}</div>}
        </div>

        {result && (
          <>
            <Section title={`Result · ${result.seasonLabel}`}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <Gauge score={result.score} />
                <div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: scoreColor(result.score) }}>{result.label}</div>
                  <div style={{ color: '#475569', marginTop: 2 }}>{result.suitabilityClass}</div>
                  <div style={{ color: '#475569', marginTop: 2 }}>{result.sunnyHours} of {result.eligibleHours} hours sunny · {result.avgSunlit}% sunlit on average</div>
                  <div style={{ color: '#64748b', marginTop: 2 }}>{result.neighbourCount} taller buildings within 200 m checked</div>
                </div>
              </div>
              {result.baselineScore !== null && (
                <div style={{ marginTop: 8, padding: '6px 8px', borderRadius: 6, background: result.simImpact <= -5 ? '#fef2f2' : '#f0fdf4', color: result.simImpact <= -5 ? '#b91c1c' : '#15803d', fontWeight: 600 }}>
                  What-if: {result.baselineScore} → {result.score} ({result.simImpact > 0 ? '+' : ''}{result.simImpact} points) with {result.simCount} proposed tower{result.simCount > 1 ? 's' : ''}
                </div>
              )}
            </Section>

            <Section title="Hourly sunlight on the roof (solar time)">
              <div style={{ width: '100%', height: 150 }}>
                <ResponsiveContainer>
                  <BarChart data={result.hourlyResults.map((h) => ({ label: hourLabel(h.hour), sunlit: Number(h.sunlitPct) }))} margin={{ top: 4, right: 4, left: -22, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 9, fill: '#64748b' }} tickLine={false} interval={1} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 9, fill: '#64748b' }} tickLine={false} axisLine={false} tickFormatter={(v) => `${v}%`} />
                    <Tooltip formatter={(v) => [`${v}% sunlit`, 'Roof']} contentStyle={{ fontSize: 11 }} />
                    <Bar dataKey="sunlit" radius={[3, 3, 0, 0]} isAnimationActive>
                      {result.hourlyResults.map((h) => <Cell key={h.hour} fill={sunColor(Number(h.sunlitPct))} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div style={{ marginTop: 6 }}>
                <div style={{ color: '#475569', marginBottom: 3 }}>Roof heatmap in 3D: sun-hours per spot</div>
                <div style={{ height: 8, borderRadius: 4, background: RAMP_CSS }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b', fontSize: 10, marginTop: 2 }}><span>0 h (always shaded)</span><span>{result.eligibleHours} h (full sun)</span></div>
              </div>
            </Section>

            <Section title="Energy & money">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                {[
                  ['Roof area', `${Number(result.area).toLocaleString('en-IN')} m²`],
                  ['Usable (70 %)', `${Number(result.usableArea).toLocaleString('en-IN')} m²`],
                  ['Panels (330 W)', result.panelCount.toLocaleString('en-IN')],
                  ['Capacity', `${result.capacity} kWp`],
                  ['Generation', `${Number(result.generation).toLocaleString('en-IN')} kWh/yr`],
                  ['Shade-adjusted', `${Number(result.shadedGeneration).toLocaleString('en-IN')} kWh/yr`],
                  ['Savings', `₹${Number(result.annualSavings).toLocaleString('en-IN')}/yr`],
                  ['Install cost', `₹${Number(result.installCost).toLocaleString('en-IN')}`],
                  ['Payback', `${result.paybackYears} yrs`],
                  ['CO₂ saved', `${result.co2Saved} t/yr`],
                ].map(([k, v]) => (
                  <div key={k} style={{ padding: '6px 8px', background: '#f8fafc', borderRadius: 6 }}>
                    <div style={{ color: '#64748b', fontSize: 10 }}>{k}</div>
                    <div style={{ fontWeight: 700 }}>{v}</div>
                  </div>
                ))}
              </div>
              <div style={{ color: '#64748b', marginTop: 6 }}>Shade factor {(Number(result.shadeFactor) * 100).toFixed(1)} % (sun-weighted share of the roof in sun).</div>
            </Section>

            {blockers.length > 0 && (
              <Section title="Who blocks the sun" right={<span style={{ textTransform: 'none', letterSpacing: 0, fontWeight: 500, color: '#e11d48' }}>red in 3D</span>}>
                {blockers.slice(0, 5).map((b) => (
                  <button key={b.key} onClick={() => !b.sim && onFocusKey(b.key)} style={{ display: 'flex', width: '100%', gap: 8, alignItems: 'center', padding: '5px 0', border: 'none', borderBottom: '1px solid #f1f5f9', background: 'none', cursor: b.sim ? 'default' : 'pointer', fontSize: 12, textAlign: 'left' }}>
                    <span style={{ flex: 1 }}>{b.name} <span style={{ color: '#64748b' }}>· {b.height.toFixed(0)} m</span></span>
                    <span style={{ width: 70, height: 6, background: '#f1f5f9', borderRadius: 3 }}><span style={{ display: 'block', width: `${Math.min(100, b.share * 100)}%`, height: '100%', background: b.sim ? '#d97706' : '#e11d48', borderRadius: 3 }} /></span>
                    <span style={{ width: 42, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{(b.share * 100).toFixed(1)}%</span>
                  </button>
                ))}
                <div style={{ color: '#64748b', marginTop: 4 }}>Share of the roof's sun-hours each building shades.</div>
              </Section>
            )}

            <Section title="Recommendations">
              {recommendations(result).map(([color, title, text]) => (
                <div key={title} style={{ padding: '7px 10px', marginBottom: 6, borderLeft: `4px solid ${color}`, background: '#f8fafc', borderRadius: 6 }}>
                  <div style={{ fontWeight: 700, color }}>{title}</div>
                  <div style={{ color: '#374151', marginTop: 2, lineHeight: 1.45 }}>{text}</div>
                </div>
              ))}
            </Section>

            <div style={{ display: 'flex', gap: 6, padding: '10px 12px', borderTop: '1px solid #e2e8f0' }}>
              <button onClick={save} style={{ ...btn(), flex: 1 }}>Save to dashboard</button>
              <button onClick={pdf} style={{ ...btn('#7c3aed'), flex: 1 }}>Export PDF</button>
            </div>
            {saved && <div style={{ padding: '0 12px 8px', color: saved.startsWith('Saved') ? '#15803d' : '#b91c1c' }}>{saved} · <a href={`${import.meta.env.BASE_URL}dashboard`} target="_blank" rel="noreferrer">open</a></div>}
            <div style={{ padding: '0 12px 14px', color: '#94a3b8', fontSize: 10, lineHeight: 1.5 }}>
              Shadows of taller buildings within 200 m, hourly 6:00–18:00 solar time (3D sun shown in IST). Score = 50 % sunlit hours + 20 % area + 10 % height + 20 % irradiance. Yield 1,500 kWh/kWp/yr, ₹7/unit, ₹60,000/kWp, 0.82 kg CO₂/kWh. Screening estimate, not a site survey.
            </div>
          </>
        )}
      </div>
    </div>
  );
}

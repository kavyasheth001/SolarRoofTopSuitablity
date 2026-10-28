// Solar analysis panel: pick (or design) a building, choose the day, optionally add proposed towers, run the
// hourly shadow analysis, then plan panels. All data comes from GeoServer; drawing is CesiumJS.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import {
  Building2, CheckCircle2, Download, Leaf, PencilRuler, Plus, Save, TowerControl, Trash2, X,
} from 'lucide-react';
import { SEASONS, seasonDayOfYear } from '../config';
import {
  ANALYSIS_HOURS, METERS_PER_FLOOR, buildResult, featureHeight, geometryCentroid, solarHourToIst,
} from './solarAnalysis';
import { analyseRoof } from './roofAnalysis';
import { buildRoofModel, describeRoof } from './roofModel';
import { flatRoofGrid, sampleRoofFromLod2 } from './roofSampling';
import { fetchNeighbours, gidOf } from './buildingQueries';
import { RAMP_CSS, addBlockEntity, captureView, drawFootprint, groundHeightAt, roofHeatmapPrimitive, setBlockHeight } from './cesiumOverlays';
import { exportPdf, saveToDashboard } from './report';
import { buildingName } from './names';
import PlannerSection from '../planner/PlannerSection';
import { Button, SectionTitle, Segmented, Stat, cx, inr, num } from '../ui/kit';

const STEP_MS = 140;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const scoreTone = (s) => (s > 70 ? '#16a34a' : s > 40 ? '#d97706' : '#dc2626');
const sunTone = (pct) => (pct >= 70 ? '#22c55e' : pct >= 40 ? '#f59e0b' : pct > 0 ? '#f97316' : '#334155');
const hourLabel = (h) => (h < 12 ? `${h}a` : h === 12 ? '12p' : `${h - 12}p`);

function Gauge({ score }) {
  const [shown, setShown] = useState(0);
  useEffect(() => {
    let frame;
    const start = performance.now();
    const step = (now) => {
      const p = Math.min((now - start) / 1100, 1);
      setShown(Math.round((1 - (1 - p) ** 3) * score));
      if (p < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [score]);
  const r = 40; const c = 2 * Math.PI * r;
  return (
    <svg width="104" height="104" viewBox="0 0 104 104" className="shrink-0">
      <circle cx="52" cy="52" r={r} stroke="#e2e8f0" strokeWidth="10" fill="none" />
      <circle cx="52" cy="52" r={r} stroke={scoreTone(shown)} strokeWidth="10" fill="none" strokeLinecap="round"
        strokeDasharray={c} strokeDashoffset={c - (shown / 100) * c} transform="rotate(-90 52 52)" />
      <text x="52" y="56" textAnchor="middle" fontSize="26" fontWeight="800" fill="#0b1220">{shown}</text>
      <text x="52" y="72" textAnchor="middle" fontSize="10" fill="#64748b">of 100</text>
    </svg>
  );
}

export default function AnalysisPanel({ engine, picked, season, setSeason, setHour, onClose }) {
  const [mode, setMode] = useState('existing');
  const [designed, setDesigned] = useState(null);
  const [designFloors, setDesignFloors] = useState(4);
  const [sims, setSims] = useState([]);
  const [simFloors, setSimFloors] = useState(20);
  const [showSims, setShowSims] = useState(false);
  const [drawing, setDrawing] = useState(null);
  const [progress, setProgress] = useState(null);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
  const [blockers, setBlockers] = useState([]);
  const [ctx, setCtx] = useState(null); // roof context handed to the panel planner
  const [plan, setPlan] = useState(null);
  const [phase, setPhase] = useState(null); // 'roof' while reading LoD2, 'sun' while following the sun
  const [roof, setRoof] = useState(null); // plain-language roof summary
  const [heatmapOn, setHeatmapOn] = useState(true);
  const [saved, setSaved] = useState('');
  const drawRef = useRef(null);
  const heatmapRef = useRef(null);
  const runIdRef = useRef(0);
  const entitiesRef = useRef({ sims: [], designed: null });
  entitiesRef.current = { sims, designed };
  const { viewer } = engine;
  const feature = picked != null ? engine.features[picked] : null;

  const clearOutput = () => {
    runIdRef.current++;
    setResult(null); setBlockers([]); setProgress(null); setSaved(''); setCtx(null); setPlan(null); setRoof(null); setPhase(null);
    engine.tint([]);
    if (heatmapRef.current && !viewer.isDestroyed()) viewer.scene.primitives.remove(heatmapRef.current);
    heatmapRef.current = null;
    engine.requestRender();
  };

  // A new target, day or set of proposed towers invalidates the previous result.
  useEffect(clearOutput, [picked, mode, designed, season, sims]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    engine.keepSelectionOnEmptyClick = true;
    const onKey = (e) => { if (e.key === 'Escape') stopDrawing(); if (e.key === 'Enter') drawRef.current?.finish(); };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      engine.keepSelectionOnEmptyClick = false;
      clearOutput();
      drawRef.current?.cancel();
      engine.interaction = null;
      if (!viewer.isDestroyed()) {
        const { sims: list, designed: d } = entitiesRef.current;
        list.forEach((s) => viewer.entities.remove(s.entity));
        if (d) viewer.entities.remove(d.entity);
        engine.requestRender();
      }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (heatmapRef.current) { heatmapRef.current.show = heatmapOn; engine.requestRender(); }
  }, [heatmapOn, engine]);

  const stopDrawing = () => {
    drawRef.current?.cancel();
    drawRef.current = null;
    engine.interaction = null;
    setDrawing(null);
  };

  const startDrawing = (kind) => {
    stopDrawing();
    engine.interaction = 'draw';
    setDrawing({ kind, points: 0 });
    drawRef.current = drawFootprint(viewer, {
      color: kind === 'design' ? '#22d3ee' : '#f59e0b',
      onChange: (points) => setDrawing({ kind, points }),
      onFinish: async (ring) => {
        drawRef.current = null;
        engine.interaction = null;
        setDrawing(null);
        const geometry = { type: 'Polygon', coordinates: [ring] };
        const base = await groundHeightAt(viewer, geometryCentroid(geometry));
        if (kind === 'design') {
          const height = designFloors * METERS_PER_FLOOR;
          setDesigned((d) => {
            if (d) viewer.entities.remove(d.entity);
            return { geometry, ring, base, floors: designFloors, height, entity: addBlockEntity(viewer, { ring, base, height, color: '#22d3ee', label: `New G+${designFloors - 1}` }) };
          });
        } else {
          const height = simFloors * METERS_PER_FLOOR;
          setSims((list) => [...list, { id: `sim-${Date.now()}`, geometry, ring, base, floors: simFloors, height, entity: addBlockEntity(viewer, { ring, base, height, color: '#f59e0b', label: `Proposed G+${simFloors - 1}` }) }]);
        }
        engine.requestRender();
      },
    });
  };

  const setSimFloorsFor = (id, floors) => setSims((list) => list.map((s) => {
    if (s.id !== id) return s;
    const f = Math.max(1, Math.min(80, Math.round(floors) || 1));
    const height = f * METERS_PER_FLOOR;
    setBlockHeight(s.entity, { ring: s.ring, base: s.base, height, label: `Proposed G+${f - 1}` });
    engine.requestRender();
    return { ...s, floors: f, height };
  }));

  const removeSim = (id) => setSims((list) => list.filter((s) => {
    if (s.id === id) viewer.entities.remove(s.entity);
    return s.id !== id;
  }));

  const target = mode === 'existing'
    ? feature && { geometry: feature.geometry, props: feature.properties }
    : designed && { geometry: designed.geometry, props: { height: designed.height, no_floors: `G+${designed.floors - 1}` } };
  const targetName = mode === 'existing' ? buildingName(feature?.properties) : `New building (G+${(designed?.floors || 1) - 1})`;

  const run = async () => {
    if (!target) return;
    clearOutput();
    const runId = runIdRef.current;
    setError(''); setProgress(0);
    try {
      const doy = seasonDayOfYear(season);
      // 1. The real roof: LoD2 heights over the footprint, split into levels, slopes and obstacles.
      setPhase('roof');
      const grid = mode === 'existing'
        ? await sampleRoofFromLod2(engine, picked, (p) => setProgress(Math.round(p * 100)))
        : flatRoofGrid(designed.geometry, featureHeight(target.props), designed.base);
      if (runIdRef.current !== runId) return;
      const model = buildRoofModel(grid);
      const heightM = grid.source === 'lod2' ? model.mainLevel : featureHeight(target.props);
      setPhase('sun'); setProgress(0);
      const nbFeatures = await fetchNeighbours({
        geometry: target.geometry,
        minHeight: Math.min(heightM, model.grid.z.reduce((m, v) => (Number.isFinite(v) ? Math.min(m, v) : m), heightM)),
        excludeGid: mode === 'existing' ? gidOf(feature) : undefined,
        replaceUnder: mode === 'designed',
      });
      const neighbours = nbFeatures.map((f) => ({ key: f.id, geometry: f.geometry, height: featureHeight(f.properties), name: buildingName(f.properties) }));
      const proposed = sims.map((s) => ({ key: s.id, geometry: s.geometry, height: s.height, name: `Proposed tower G+${s.floors - 1}`, sim: true }));
      const analysis = analyseRoof({ model, neighbours: [...neighbours, ...proposed], dayOfYear: doy });
      const baseline = proposed.length ? analyseRoof({ model, neighbours, dayOfYear: doy }) : null;

      // Walk the 3D sun through the analysed hours so the visitor sees the shadows move.
      for (let i = 0; i < ANALYSIS_HOURS.length; i++) {
        if (runIdRef.current !== runId) return;
        setHour(solarHourToIst(ANALYSIS_HOURS[i], doy));
        setProgress(Math.round(((i + 1) / ANALYSIS_HOURS.length) * 100));
        await sleep(STEP_MS);
      }
      if (runIdRef.current !== runId) return;
      setHour(solarHourToIst(12, doy));

      const roofZ = grid.ground + heightM;
      heatmapRef.current = viewer.scene.primitives.add(roofHeatmapPrimitive(analysis, roofZ));
      heatmapRef.current.show = heatmapOn;
      engine.tint(analysis.blockers.filter((b) => !b.sim && !b.own).slice(0, 5).map((b) => b.key));
      const focus = (pitch = -62) => {
        if (mode === 'existing') engine.flyToFeatureId(feature.id, pitch);
        else engine.flyToLonLat(...geometryCentroid(designed.geometry), 260);
      };
      focus();
      engine.requestRender();

      setBlockers(analysis.blockers);
      setRoof(describeRoof(model));
      setResult(buildResult({
        analysis, baseline, heightM, dayOfYear: doy,
        floors: target.props.no_floors?.trim?.() || null,
        seasonLabel: SEASONS[season].label,
        neighbourCount: neighbours.length,
        simCount: proposed.length,
      }));
      setCtx({
        center: grid.center,
        roofParts: grid.parts,
        model, heightM, roofZ, groundAbs: grid.ground, focus,
        neighbours: [...neighbours, ...proposed],
        buildingClass: mode === 'existing' ? feature.properties.class : 'Residential',
        flats: mode === 'existing' ? feature.properties.flat_count : 0,
      });
      setProgress(null); setPhase(null);
    } catch (err) {
      setError(`Analysis failed: ${err.message}`);
      setProgress(null); setPhase(null);
    }
  };

  const onPlan = useCallback((p) => setPlan(p), []);

  const planSummary = useMemo(() => plan && plan.count > 0 && ({
    panel: plan.spec.name, watt: plan.spec.watt, count: plan.count, kw: plan.kw, tilt: plan.tilt, azimuth: plan.azimuth,
    orientation: plan.orientation, rows: plan.rows, rowGap: plan.rowGap, annualKwh: plan.annualKwh, monthlyKwh: plan.monthlyKwh,
    specificYield: plan.specificYield, shadingLoss: plan.shadingLoss, panelArea: plan.panelArea, finance: plan.finance,
    settings: plan.settings, pricePerWp: plan.spec.pricePerWp, degradation: plan.spec.degradation,
  }), [plan]);

  const save = () => {
    try {
      saveToDashboard({
        buildingName: targetName,
        buildingInfo: mode === 'existing'
          ? { name: targetName, floors: feature.properties.no_floors, height: feature.properties.height, id: feature.properties.bld_id, featureId: feature.id }
          : { name: targetName, floors: designed.floors, height: designed.height },
        result,
        plan: planSummary || null,
        mapScreenshot: captureView(viewer),
      });
      setSaved('saved');
    } catch (err) {
      setSaved(`Could not save: ${err.message}`);
    }
    setTimeout(() => setSaved(''), 4000);
  };

  const pdf = () => exportPdf({
    buildingName: targetName, result, plan: planSummary || null,
    mapScreenshot: captureView(viewer, 900, 500), blockers: blockers.filter((b) => !b.sim),
  });

  const props = feature?.properties;

  return (
    <aside className="flex w-[440px] shrink-0 flex-col border-l border-slate-200 bg-white">
      <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-4">
        <div className="min-w-0 flex-1">
          <div className="text-[11px] font-bold uppercase tracking-wider text-sun-600">Solar analysis</div>
          <div className="truncate text-base font-extrabold text-ink">{target ? targetName : 'Choose a building'}</div>
        </div>
        <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-ink" aria-label="Close"><X className="h-5 w-5" /></button>
      </div>

      <div className="panel-scroll min-h-0 flex-1 overflow-y-auto">
        <div className="space-y-5 px-5 py-5">
          <Segmented value={mode} onChange={(m) => { stopDrawing(); setMode(m); }} options={[['existing', 'Existing building'], ['designed', 'New building']]} />

          {mode === 'existing' ? (
            <div>
              <SectionTitle step="1" title="Building" />
              {props ? (
                <div className="rounded-xl border border-cyan-200 bg-cyan-50/60 p-3">
                  <div className="flex items-start gap-2.5">
                    <Building2 className="mt-0.5 h-4 w-4 shrink-0 text-cyan-700" />
                    <div className="min-w-0">
                      <div className="truncate text-sm font-bold text-ink">{buildingName(props)}</div>
                      <div className="mt-0.5 text-xs text-slate-600">
                        {[props.no_floors, `${num(props.height, 1)} m tall`, `${num(props.area_sqmtr)} m² footprint`, props.class].filter(Boolean).join(' · ')}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-slate-300 p-4 text-sm text-slate-500">
                  Click a building on the map, or search for it in the bar above.
                </div>
              )}
            </div>
          ) : (
            <div>
              <SectionTitle step="1" title="New building" />
              <div className="flex items-end gap-3">
                <label className="w-24"><span className="label">Floors</span>
                  <input type="number" min={1} max={80} value={designFloors} onChange={(e) => setDesignFloors(Math.max(1, Math.min(80, Number(e.target.value) || 1)))} className="field" /></label>
                <span className="pb-2 text-xs text-slate-500">{num(designFloors * METERS_PER_FLOOR, 1)} m tall</span>
                <Button variant="dark" className="ml-auto" onClick={() => startDrawing('design')}><PencilRuler className="h-4 w-4" /> {designed ? 'Redraw' : 'Draw footprint'}</Button>
              </div>
              {designed && <p className="mt-2 text-xs text-slate-500">Existing buildings under the new footprint are treated as demolished.</p>}
            </div>
          )}

          {drawing && (
            <div className="rounded-xl border border-sun-300 bg-sun-50 p-3 text-xs text-slate-700">
              <b>Drawing {drawing.kind === 'design' ? 'the footprint' : 'a proposed tower'}:</b> click the corners on the map ({drawing.points} placed).
              Double-click or Enter to finish, right-click to undo, Esc to cancel.
              <div className="mt-2 flex gap-2">
                <Button size="sm" disabled={drawing.points < 3} onClick={() => drawRef.current?.finish()}>Finish</Button>
                <Button size="sm" variant="outline" onClick={stopDrawing}>Cancel</Button>
              </div>
            </div>
          )}

          <div>
            <SectionTitle step="2" title="Day to simulate" />
            <select value={season} onChange={(e) => setSeason(e.target.value)} className="field">
              {Object.entries(SEASONS).map(([id, s]) => <option key={id} value={id}>{s.label}</option>)}
            </select>
          </div>

          <div>
            <button type="button" onClick={() => setShowSims((s) => !s)} className="flex w-full items-center gap-2 text-left">
              <TowerControl className="h-4 w-4 text-slate-400" />
              <span className="flex-1 text-[13px] font-bold uppercase tracking-wide text-slate-500">What if a tower is built nearby?</span>
              <span className="text-xs font-semibold text-sun-600">{sims.length ? `${sims.length} added` : 'Optional'}</span>
            </button>
            {(showSims || sims.length > 0) && (
              <div className="mt-3 space-y-2">
                <div className="flex items-end gap-2">
                  <label className="w-24"><span className="label">Floors</span>
                    <input type="number" min={1} max={80} value={simFloors} onChange={(e) => setSimFloors(Math.max(1, Math.min(80, Number(e.target.value) || 1)))} className="field" /></label>
                  <Button variant="outline" onClick={() => startDrawing('sim')}><Plus className="h-4 w-4" /> Draw tower</Button>
                </div>
                {sims.map((s) => (
                  <div key={s.id} className="flex items-center gap-2 rounded-lg bg-amber-50 px-3 py-2 text-xs">
                    <span className="flex-1 font-semibold text-amber-900">Proposed tower</span>
                    <input type="number" min={1} max={80} value={s.floors} onChange={(e) => setSimFloorsFor(s.id, Number(e.target.value))} className="w-14 rounded-md border border-amber-200 px-1.5 py-1" /> floors
                    <button type="button" onClick={() => removeSim(s.id)} className="text-rose-600 hover:text-rose-700" aria-label="Remove"><Trash2 className="h-4 w-4" /></button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <Button size="lg" className="w-full" disabled={!target || progress !== null} onClick={run}>
              {progress !== null ? (phase === 'roof' ? `Reading the roof from LoD2… ${progress}%` : `Following the sun… ${progress}%`) : target ? 'Analyse solar potential' : mode === 'existing' ? 'Select a building first' : 'Draw a footprint first'}
            </Button>
            {progress !== null && <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-sun-500 transition-all" style={{ width: `${progress}%` }} /></div>}
            {error && <p className="mt-2 text-xs text-rose-600">{error}</p>}
          </div>
        </div>

        {result && (
          <>
            <div className="border-t-8 border-slate-100 px-5 py-5">
              <SectionTitle step="3" title={`Sunlight · ${result.seasonLabel}`} />
              <div className="flex items-center gap-4">
                <Gauge score={result.score} />
                <div className="min-w-0">
                  <div className="text-lg font-extrabold" style={{ color: scoreTone(result.score) }}>{result.label}</div>
                  <div className="text-sm text-slate-600">{result.suitabilityClass}</div>
                  <div className="mt-1 text-xs text-slate-500">{result.sunnyHours} of {result.eligibleHours} daylight hours in good sun · {result.avgSunlit}% of the roof lit on average</div>
                </div>
              </div>
              {result.baselineScore !== null && (
                <div className={cx('mt-3 rounded-xl px-3 py-2 text-sm font-semibold', result.simImpact <= -5 ? 'bg-rose-50 text-rose-700' : 'bg-emerald-50 text-emerald-700')}>
                  With the proposed tower{result.simCount > 1 ? 's' : ''}: {result.baselineScore} → {result.score} ({result.simImpact > 0 ? '+' : ''}{result.simImpact} points)
                </div>
              )}

              <div className="mt-4 h-32">
                <ResponsiveContainer>
                  <BarChart data={result.hourlyResults.map((h) => ({ h: hourLabel(h.hour), sunlit: Number(h.sunlitPct) }))} margin={{ top: 4, right: 0, left: -22, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis dataKey="h" tick={{ fontSize: 10, fill: '#64748b' }} tickLine={false} axisLine={false} interval={0} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: '#64748b' }} tickLine={false} axisLine={false} tickFormatter={(v) => `${v}%`} />
                    <Tooltip formatter={(v) => [`${v}% of the roof in sun`, 'Sunlight']} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                    <Bar dataKey="sunlit" radius={[3, 3, 0, 0]}>
                      {result.hourlyResults.map((h) => <Cell key={h.hour} fill={sunTone(Number(h.sunlitPct))} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-2 flex items-center gap-2 text-[11px] text-slate-500">
                <label className="flex items-center gap-1.5"><input type="checkbox" checked={heatmapOn} onChange={(e) => setHeatmapOn(e.target.checked)} className="accent-amber-500" /> Roof sun-hours</label>
                <span>0 h</span><span className="h-2 flex-1 rounded-full" style={{ background: RAMP_CSS }} /><span>{result.eligibleHours} h</span>
              </div>

              {blockers.length > 0 && (
                <div className="mt-4">
                  <div className="mb-1.5 flex items-center text-[11px] font-semibold text-slate-500">Who blocks the sun <span className="ml-auto text-rose-600">red on the map</span></div>
                  {blockers.slice(0, 4).map((b) => (
                    <button key={b.key} type="button" onClick={() => !b.sim && engine.flyToFeatureId(b.key)} className="flex w-full items-center gap-2 py-1 text-left text-xs">
                      <span className="min-w-0 flex-1 truncate text-slate-700">{b.name}{!b.own && <span className="text-slate-400"> · {num(b.height)} m</span>}</span>
                      <span className="h-1.5 w-16 rounded-full bg-slate-100"><span className="block h-full rounded-full" style={{ width: `${Math.min(100, b.share * 100)}%`, background: b.own ? '#64748b' : b.sim ? '#d97706' : '#e11d48' }} /></span>
                      <span className="w-10 text-right tabular-nums text-slate-500">{num(b.share * 100, 1)}%</span>
                    </button>
                  ))}
                </div>
              )}

              {roof && (
                <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2.5 text-xs">
                  <div className="font-semibold text-ink">Roof read from the {roof.source}</div>
                  <div className="mt-0.5 leading-relaxed text-slate-500">{roof.text}</div>
                </div>
              )}
              <div className="mt-2 grid grid-cols-3 gap-2">
                <Stat label="Usable roof" value={`${num(result.area)} m²`} />
                <Stat label="Shade factor" value={`${num(Number(result.shadeFactor) * 100)}%`} sub="sun-weighted" />
                <Stat label="Neighbours" value={result.neighbourCount} sub="taller, ≤200 m" />
              </div>
            </div>

            {ctx && <PlannerSection engine={engine} ctx={ctx} onPlan={onPlan} />}

            <div className="sticky bottom-0 flex items-center gap-2 border-t border-slate-200 bg-white/95 px-5 py-3 backdrop-blur">
              <Button variant="outline" className="flex-1" onClick={save}><Save className="h-4 w-4" /> Save</Button>
              <Button variant="dark" className="flex-1" onClick={pdf}><Download className="h-4 w-4" /> PDF report</Button>
            </div>
            {saved && (
              <div className={cx('mx-5 mb-4 flex items-center gap-2 rounded-lg px-3 py-2 text-xs', saved === 'saved' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700')}>
                {saved === 'saved' ? <><CheckCircle2 className="h-4 w-4" /> Saved. See it under Saved plans.</> : saved}
              </div>
            )}
            {planSummary && (
              <div className="mx-5 mb-5 flex items-center gap-2 rounded-xl bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
                <Leaf className="h-4 w-4 shrink-0" /> This plan avoids about {num(planSummary.finance.co2Tonnes, 1)} t of CO₂ a year and saves {inr(planSummary.finance.annualSavings)} a year.
              </div>
            )}
          </>
        )}
      </div>
    </aside>
  );
}

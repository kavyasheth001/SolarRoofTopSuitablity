// Panel planner: compares panel options for this roof, lays the chosen one out in 3D at the best angle,
// and shows generation from those exact positions with costs, subsidy and payback.
import { useEffect, useMemo, useRef, useState } from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Check, ChevronDown, Crosshair, Loader2, Plus, Sparkles } from 'lucide-react';
import { Button, SectionTitle, Segmented, Stat, cx, inr, num } from '../ui/kit';
import { DEFAULT_SETTINGS, PANELS, SUBSIDIES, customPanel, defaultSubsidy, efficiencyOf } from './catalogue';
import { MONTHS } from './irradiance';
import { buildShadeMap } from './shadeMap';
import { facingLabel, planForPanel } from './plan';
import { buildPanelPrimitives } from './panels3d';

const tick = () => new Promise((r) => setTimeout(r, 0));

function Badge({ children, tone = 'sun' }) {
  return (
    <span className={cx('rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide',
      tone === 'sun' && 'bg-sun-100 text-sun-600', tone === 'green' && 'bg-emerald-50 text-emerald-700', tone === 'sky' && 'bg-sky-50 text-sky-700')}>
      {children}
    </span>
  );
}

export default function PlannerSection({ engine, ctx, onPlan }) {
  // Subsidy follows the building class (society for residential, none for commercial); flats cap a society's claim.
  const [settings, setSettings] = useState(() => ({ ...DEFAULT_SETTINGS, subsidy: defaultSubsidy(ctx.buildingClass), flats: Number(ctx.flats) || 0 }));
  const [custom, setCustom] = useState(null);
  const [customForm, setCustomForm] = useState({ lengthMm: 2000, widthMm: 1000, watt: 400, pricePerWp: 25 });
  const [showCustom, setShowCustom] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [options, setOptions] = useState([]);
  const [busy, setBusy] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const [fixed, setFixed] = useState({}); // manual tilt / facing / orientation for the selected panel
  const [view, setView] = useState('panels');
  const drawn = useRef(null);
  const set = (patch) => setSettings((s) => ({ ...s, ...patch }));

  // Shadows on every roof cell for every month × hour (neighbours and the roof's own structures).
  const [shadeMap, setShadeMap] = useState(null);
  const [shadeProgress, setShadeProgress] = useState(0);
  useEffect(() => {
    let stop = false;
    setShadeMap(null);
    buildShadeMap({ model: ctx.model, neighbours: ctx.neighbours }, (p) => !stop && setShadeProgress(p))
      .then((m) => { if (!stop) setShadeMap(m); });
    return () => { stop = true; };
  }, [ctx]);
  const specs = useMemo(() => (custom ? [...PANELS, custom] : PANELS), [custom]);

  // Plan every panel option for this roof (one at a time, so the panel stays responsive).
  useEffect(() => {
    if (!shadeMap) return undefined;
    let stop = false;
    (async () => {
      setBusy(true);
      const out = [];
      for (const spec of specs) {
        await tick();
        if (stop) return;
        out.push({ spec, plan: planForPanel({ model: ctx.model, roofParts: ctx.roofParts, shadeMap, spec, settings }) });
      }
      if (stop) return;
      setOptions(out);
      setBusy(false);
    })();
    return () => { stop = true; };
  }, [specs, settings, shadeMap, ctx]);

  const usable = options.filter((o) => o.plan.count > 0);
  const bestValue = usable.reduce((b, o) => (!b || o.plan.finance.lcoe < b.plan.finance.lcoe ? o : b), null);
  const mostEnergy = usable.reduce((b, o) => (!b || o.plan.annualKwh > b.plan.annualKwh ? o : b), null);
  const lowestCost = usable.reduce((b, o) => (!b || o.plan.finance.net < b.plan.finance.net ? o : b), null);
  const activeId = selectedId && options.some((o) => o.spec.id === selectedId) ? selectedId : bestValue?.spec.id;
  const active = options.find((o) => o.spec.id === activeId);

  const plan = useMemo(() => {
    if (!active) return null;
    if (!Object.keys(fixed).length) return active.plan;
    return planForPanel({ model: ctx.model, roofParts: ctx.roofParts, shadeMap, spec: active.spec, settings, fixed });
  }, [active, fixed, ctx, shadeMap, settings]);

  useEffect(() => { onPlan?.(plan); }, [plan, onPlan]);

  // Draw the chosen plan on the roof.
  useEffect(() => {
    const { scene } = engine.viewer;
    drawn.current?.remove(scene);
    drawn.current = null;
    if (plan?.count) {
      drawn.current = buildPanelPrimitives(plan, ctx.center, ctx.groundAbs, view);
      drawn.current.primitives.forEach((p) => scene.primitives.add(p));
    }
    engine.requestRender();
  }, [plan, view, engine, ctx]);
  useEffect(() => () => { if (!engine.viewer.isDestroyed()) drawn.current?.remove(engine.viewer.scene); engine.requestRender(); }, [engine]);

  const billCover = plan?.targetKwh ? Math.min(100, (plan.annualKwh / plan.targetKwh) * 100) : null;

  return (
    <div className="border-t-8 border-slate-100">
      <div className="px-5 pt-5">
        <SectionTitle step="4" title="Plan your panels" right={busy && <Loader2 className="h-4 w-4 animate-spin text-slate-400" />} />
        <p className="-mt-1 mb-4 text-xs leading-relaxed text-slate-500">
          Every option below is laid out automatically on this roof: best tilt and facing, rows spaced so they never shade each
          other, panels only on the sunny part. Pick one to see it in 3D.
        </p>

        <div className="grid grid-cols-2 gap-3">
          <label><span className="label">Electricity tariff (₹/unit)</span>
            <input type="number" min={1} step={0.5} value={settings.tariff} onChange={(e) => set({ tariff: Number(e.target.value) || 0 })} className="field" /></label>
          <label><span className="label">Subsidy</span>
            <select value={settings.subsidy} onChange={(e) => set({ subsidy: e.target.value })} className="field">
              {Object.entries(SUBSIDIES).map(([id, label]) => <option key={id} value={id}>{label}</option>)}
            </select>
            {settings.subsidy === 'society' && settings.flats > 0 && <span className="mt-1 block text-[11px] text-slate-400">Capped at 3 kW × {settings.flats} flats</span>}
          </label>
        </div>
        <div className="mt-3">
          <span className="label">System size</span>
          <Segmented value={settings.sizing} onChange={(v) => set({ sizing: v })} options={[['fill', 'Use the sunny roof'], ['bill', 'Match my consumption']]} />
          {settings.sizing === 'bill' && (
            <label className="mt-2 flex items-center gap-2 text-xs text-slate-500">Monthly consumption
              <input type="number" min={10} step={10} value={settings.monthlyUnits} onChange={(e) => set({ monthlyUnits: Number(e.target.value) || 0 })} className="field w-24 py-1" /> units
            </label>
          )}
        </div>
        <button type="button" onClick={() => setShowAdvanced((s) => !s)} className="mt-3 flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-ink">
          <ChevronDown className={cx('h-3.5 w-3.5 transition', !showAdvanced && '-rotate-90')} /> Installation assumptions
        </button>
        {showAdvanced && (
          <div className="mt-2 grid grid-cols-3 gap-2">
            <label><span className="label">Edge setback (m)</span>
              <input type="number" min={0} max={3} step={0.1} value={settings.setback} onChange={(e) => set({ setback: Math.max(0, Number(e.target.value) || 0) })} className="field" /></label>
            <label><span className="label">Inverter, structure, install (₹/Wp)</span>
              <input type="number" min={0} step={1} value={settings.bosPerWp} onChange={(e) => set({ bosPerWp: Number(e.target.value) || 0 })} className="field" /></label>
            <label><span className="label">System losses (%)</span>
              <input type="number" min={0} max={40} step={1} value={Math.round(settings.losses * 100)} onChange={(e) => set({ losses: (Number(e.target.value) || 0) / 100 })} className="field" /></label>
          </div>
        )}
      </div>

      <div className="mt-4 space-y-2 px-5">
        {options.map(({ spec, plan: p }) => {
          const isActive = spec.id === activeId;
          return (
            <button key={spec.id} type="button" disabled={!p.count} onClick={() => { setSelectedId(spec.id); setFixed({}); }}
              className={cx('w-full rounded-xl border p-3 text-left transition',
                isActive ? 'border-sun-500 bg-sun-50/60 ring-2 ring-sun-100' : 'border-slate-200 bg-white hover:border-slate-300', !p.count && 'opacity-50')}>
              <div className="flex items-start gap-2">
                <span className={cx('mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full border', isActive ? 'border-sun-500 bg-sun-500 text-white' : 'border-slate-300')}>
                  {isActive && <Check className="h-3 w-3" strokeWidth={3} />}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-sm font-bold text-ink">{spec.name}</span>
                    {bestValue?.spec.id === spec.id && <Badge>Best value</Badge>}
                    {mostEnergy?.spec.id === spec.id && <Badge tone="green">Most energy</Badge>}
                    {lowestCost?.spec.id === spec.id && bestValue?.spec.id !== spec.id && <Badge tone="sky">Lowest cost</Badge>}
                  </div>
                  <div className="mt-0.5 text-[11px] text-slate-500">
                    {spec.lengthMm} × {spec.widthMm} mm · {efficiencyOf(spec).toFixed(1)}% efficient · ₹{spec.pricePerWp}/Wp · {spec.note}
                  </div>
                  {p.count > 0 ? (
                    <div className="mt-2 grid grid-cols-4 gap-2 text-[11px]">
                      <div><div className="text-slate-400">Panels</div><div className="font-bold text-ink">{p.count} · {num(p.kw, 1)} kWp</div></div>
                      <div><div className="text-slate-400">Energy/yr</div><div className="font-bold text-ink">{num(p.annualKwh)} kWh</div></div>
                      <div><div className="text-slate-400">Net cost</div><div className="font-bold text-ink">{inr(p.finance.net)}</div></div>
                      <div><div className="text-slate-400">Payback</div><div className="font-bold text-ink">{p.finance.paybackYears ? `${p.finance.paybackYears.toFixed(1)} yrs` : '—'}</div></div>
                    </div>
                  ) : <div className="mt-2 text-[11px] text-rose-600">Does not fit the sunny part of this roof.</div>}
                </div>
              </div>
            </button>
          );
        })}
        {!options.length && (
          <div className="flex items-center gap-2 py-6 text-sm text-slate-500"><Loader2 className="h-4 w-4 animate-spin" />
            {shadeMap ? 'Laying out panel options…' : `Tracing shadows over the year… ${Math.round(shadeProgress * 100)}%`}
          </div>
        )}

        <button type="button" onClick={() => setShowCustom((s) => !s)} className="flex items-center gap-1.5 py-1 text-xs font-semibold text-sun-600 hover:text-sun-500">
          <Plus className="h-3.5 w-3.5" /> {custom ? 'Change your own panel' : 'Add your own panel'}
        </button>
        {showCustom && (
          <div className="rounded-xl border border-dashed border-slate-300 p-3">
            <div className="grid grid-cols-4 gap-2">
              {[['lengthMm', 'Length (mm)'], ['widthMm', 'Width (mm)'], ['watt', 'Power (W)'], ['pricePerWp', '₹ per Wp']].map(([k, label]) => (
                <label key={k}><span className="label">{label}</span>
                  <input type="number" min={1} value={customForm[k]} onChange={(e) => setCustomForm((f) => ({ ...f, [k]: Number(e.target.value) || 0 }))} className="field px-2" /></label>
              ))}
            </div>
            {(() => {
              const eff = customForm.watt / ((customForm.lengthMm / 1000) * (customForm.widthMm / 1000) * 10);
              return Number.isFinite(eff) && (eff < 12 || eff > 25) && (
                <p className="mt-2 text-[11px] text-amber-700">That size and power give {eff.toFixed(1)}% efficiency; real panels are 15-23%. Check the size is in millimetres.</p>
              );
            })()}
            <Button size="sm" className="mt-2" onClick={() => {
              const p = customPanel(customForm);
              if (p.watt > 0 && p.lengthMm > 200 && p.widthMm > 200) { setCustom(p); setSelectedId('custom'); setFixed({}); setShowCustom(false); }
            }}>Plan with this panel</Button>
          </div>
        )}
      </div>

      {plan && plan.count > 0 && (
        <div className="mt-4 px-5 pb-5">
          <div className="rounded-2xl bg-ink p-4 text-white">
            <div className="flex items-start gap-2">
              <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-sun-400" />
              <div className="text-sm">
                <div className="font-bold">{plan.count} × {plan.spec.name} = {num(plan.kw, 1)} kWp</div>
                <div className="mt-1 space-y-0.5 text-xs leading-relaxed text-slate-300">
                  {plan.parts.map((r, i) => (
                    <div key={i}>
                      {r.mount === 'flush'
                        ? <>{r.count} flush on the {Math.round(r.tilt)}° slope facing {facingLabel(r.azimuth)}</>
                        : <>{r.count} on racks, tilted {r.tilt}° facing {facingLabel(r.azimuth)}, {r.orientation}{plan.parts.length > 1 && ` (roof level ${num(r.level, 1)} m)`}</>}
                    </div>
                  ))}
                  <div>{num(plan.rowGap, 2)} m between rows, {num(settings.setback, 1)} m from the roof edge, clear of tanks and stair rooms.
                    {!Object.keys(fixed).length && ' Chosen automatically for the most energy.'}</div>
                </div>
              </div>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2">
              <label className="col-span-1 text-[11px] text-slate-400">Tilt {fixed.tilt != null ? `${fixed.tilt}°` : '(auto)'}
                <input type="range" min={0} max={35} value={fixed.tilt ?? plan.tilt} onChange={(e) => setFixed((f) => ({ ...f, tilt: Number(e.target.value) }))} className="mt-1 w-full accent-amber-500" /></label>
              <label className="text-[11px] text-slate-400">Facing
                <select value={fixed.azimuth ?? ''} onChange={(e) => setFixed((f) => { const n = { ...f }; if (e.target.value === '') delete n.azimuth; else n.azimuth = Number(e.target.value); return n; })}
                  className="mt-1 w-full rounded-md border-0 bg-white/10 px-1.5 py-1 text-xs text-white">
                  <option value="" className="text-ink">Auto</option>
                  {[[180, 'South'], [135, 'South-east'], [225, 'South-west'], [90, 'East'], [270, 'West']].map(([v, l]) => <option key={v} value={v} className="text-ink">{l}</option>)}
                </select></label>
              <label className="text-[11px] text-slate-400">Panel
                <select value={fixed.orientation ?? ''} onChange={(e) => setFixed((f) => { const n = { ...f }; if (e.target.value === '') delete n.orientation; else n.orientation = e.target.value; return n; })}
                  className="mt-1 w-full rounded-md border-0 bg-white/10 px-1.5 py-1 text-xs text-white">
                  <option value="" className="text-ink">Auto</option>
                  <option value="portrait" className="text-ink">Portrait</option>
                  <option value="landscape" className="text-ink">Landscape</option>
                </select></label>
            </div>
            {Object.keys(fixed).length > 0 && <button type="button" onClick={() => setFixed({})} className="mt-2 text-[11px] font-semibold text-sun-300 hover:text-sun-100">Back to automatic</button>}
          </div>

          <div className="mt-3 flex items-center gap-2">
            <Segmented value={view} onChange={setView} options={[['panels', '3D panels'], ['yield', 'Colour by yield']]} />
            <Button variant="outline" size="sm" onClick={() => ctx.focus(-58)} title="Look at the roof"><Crosshair className="h-3.5 w-3.5" /></Button>
          </div>
          {view === 'yield' && (
            <div className="mt-2 flex items-center gap-2 text-[11px] text-slate-500">
              <span>{num(Math.min(...plan.panels.map((p) => p.annual)))} kWh</span><span className="h-2 flex-1 rounded-full" style={{ background: 'linear-gradient(90deg,#ef4444,#f59e0b,#facc15,#22c55e)' }} /><span>{num(Math.max(...plan.panels.map((p) => p.annual)))} kWh per panel/yr</span>
            </div>
          )}

          <div className="mt-4 grid grid-cols-2 gap-2">
            <Stat label="Generation" value={`${num(plan.annualKwh)} kWh/yr`} sub={`${num(plan.annualKwh / 365, 1)} kWh a day on average`} accent="text-emerald-700" />
            <Stat label="Yield" value={`${num(plan.specificYield)} kWh/kWp`} sub={`${num(plan.shadingLoss * 100, 1)}% lost to neighbour shade`} />
            <Stat label="Panel area" value={`${num(plan.panelArea)} m²`} sub={`${plan.count} panels`} />
            {billCover != null
              ? <Stat label="Covers" value={`${num(billCover)}% of use`} sub={`${num(settings.monthlyUnits)} units/month`} />
              : <Stat label="CO₂ avoided" value={`${num(plan.finance.co2Tonnes, 1)} t/yr`} sub="0.82 kg per unit (grid)" />}
          </div>

          <div className="mt-4">
            <div className="mb-1 text-[11px] font-semibold text-slate-500">Monthly generation (kWh)</div>
            <div className="h-36">
              <ResponsiveContainer>
                <BarChart data={plan.monthlyKwh.map((v, m) => ({ m: MONTHS[m], kwh: Math.round(v) }))} margin={{ top: 4, right: 0, left: -18, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="m" tick={{ fontSize: 10, fill: '#64748b' }} tickLine={false} axisLine={false} interval={0} />
                  <YAxis tick={{ fontSize: 10, fill: '#64748b' }} tickLine={false} axisLine={false} />
                  <Tooltip formatter={(v) => [`${num(v)} kWh`, 'Generation']} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                  <Bar dataKey="kwh" fill="#f5a400" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <p className="text-[11px] text-slate-400">The June-September dip is the monsoon.</p>
          </div>

          <div className="mt-4 overflow-hidden rounded-xl border border-slate-200 text-sm">
            {[
              ['Panels', inr(plan.finance.moduleCost), `${num(plan.kw * 1000)} Wp × ₹${plan.spec.pricePerWp}`],
              ['Inverter, structure, installation', inr(plan.finance.bosCost), `₹${settings.bosPerWp}/Wp`],
              ['System cost', inr(plan.finance.total), null, true],
              ['Subsidy', `− ${inr(plan.finance.subsidy)}`, SUBSIDIES[settings.subsidy]],
              ['Your cost', inr(plan.finance.net), null, true],
              ['Savings per year', inr(plan.finance.annualSavings), `at ₹${settings.tariff}/unit`],
              ['Payback', plan.finance.paybackYears ? `${plan.finance.paybackYears.toFixed(1)} years` : '—'],
              ['Savings over 25 years', inr(plan.finance.lifetimeSavings), `${plan.spec.degradation}%/yr panel ageing`],
              ['Cost per unit generated', plan.finance.lcoe ? `₹${plan.finance.lcoe.toFixed(2)}` : '—', 'over 25 years'],
            ].map(([k, v, sub, strong]) => (
              <div key={k} className={cx('flex items-baseline gap-2 border-b border-slate-100 px-3 py-2 last:border-0', strong && 'bg-slate-50')}>
                <span className={cx('flex-1', strong ? 'font-bold text-ink' : 'text-slate-600')}>{k}{sub && <span className="block text-[11px] font-normal text-slate-400">{sub}</span>}</span>
                <span className={cx('tabular-nums', strong ? 'font-extrabold text-ink' : 'font-semibold text-slate-700')}>{v}</span>
              </div>
            ))}
          </div>
          <p className="mt-2 text-[11px] leading-relaxed text-slate-400">
            Generation uses Mumbai's monthly sunlight (NASA POWER), panel heat losses, {Math.round(settings.losses * 100)}% system losses and the
            shadow of every taller building within 200 m at each panel. Prices are indicative; subsidy rules as published for
            PM Surya Ghar (2024). Confirm with an installer's site survey.
          </p>
        </div>
      )}
    </div>
  );
}

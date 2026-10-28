// Saved analyses and panel plans (this browser), with totals, PDF re-export and a link back to the map.
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Download, FolderOpen, Sun, Trash2 } from 'lucide-react';
import { exportPdf, loadSaved, storeSaved } from '../solar/report';
import { Button, Logo, NavLinks, cx, inr, num } from '../ui/kit';

const tone = (s) => (s > 70 ? 'bg-emerald-50 text-emerald-700' : s > 40 ? 'bg-amber-50 text-amber-700' : 'bg-rose-50 text-rose-700');

export default function Plans() {
  const [items, setItems] = useState(loadSaved);
  const [sort, setSort] = useState('newest');

  const sorted = useMemo(() => [...items].sort((a, b) => (
    sort === 'score' ? b.result.score - a.result.score
      : sort === 'energy' ? (b.plan?.annualKwh || 0) - (a.plan?.annualKwh || 0)
        : b.id - a.id)), [items, sort]);

  const withPlan = items.filter((e) => e.plan);
  const totals = {
    kw: withPlan.reduce((s, e) => s + e.plan.kw, 0),
    kwh: withPlan.reduce((s, e) => s + e.plan.annualKwh, 0),
    savings: withPlan.reduce((s, e) => s + e.plan.finance.annualSavings, 0),
    co2: withPlan.reduce((s, e) => s + e.plan.finance.co2Tonnes, 0),
  };

  const remove = (id) => {
    const next = items.filter((e) => e.id !== id);
    storeSaved(next);
    setItems(next);
  };

  return (
    <div className="min-h-full bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Logo />
          <div className="flex items-center gap-4"><NavLinks /><Link to="/map" className="rounded-xl bg-sun-500 px-4 py-2 text-sm font-bold text-ink hover:bg-sun-400">Open the map</Link></div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-10">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-ink">Saved plans</h1>
            <p className="mt-1 text-sm text-slate-500">Analyses and panel plans saved in this browser.</p>
          </div>
          {items.length > 0 && (
            <select value={sort} onChange={(e) => setSort(e.target.value)} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm">
              <option value="newest">Newest first</option>
              <option value="score">Best score</option>
              <option value="energy">Most energy</option>
            </select>
          )}
        </div>

        {withPlan.length > 0 && (
          <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
            {[['Planned capacity', `${num(totals.kw, 1)} kWp`], ['Energy per year', `${num(totals.kwh)} kWh`], ['Savings per year', inr(totals.savings)], ['CO₂ avoided', `${num(totals.co2, 1)} t/yr`]].map(([k, v]) => (
              <div key={k} className="rounded-2xl border border-slate-200 bg-white p-4">
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">{k}</div>
                <div className="mt-1 text-2xl font-extrabold tabular-nums text-ink">{v}</div>
              </div>
            ))}
          </div>
        )}

        {items.length === 0 ? (
          <div className="mt-10 flex flex-col items-center rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
            <FolderOpen className="h-10 w-10 text-slate-300" />
            <h2 className="mt-4 text-lg font-bold text-ink">Nothing saved yet</h2>
            <p className="mt-1 max-w-sm text-sm text-slate-500">Analyse a building on the map, choose a panel plan and press Save.</p>
            <Link to="/map" className="mt-6 inline-flex items-center gap-2 rounded-xl bg-sun-500 px-5 py-2.5 font-bold text-ink hover:bg-sun-400">Open the map <ArrowRight className="h-4 w-4" /></Link>
          </div>
        ) : (
          <div className="mt-6 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {sorted.map((e) => (
              <article key={e.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                <div className="relative h-40 bg-slate-100">
                  {e.mapScreenshot ? <img src={e.mapScreenshot} alt="" className="h-full w-full object-cover" /> : <div className="grid h-full place-items-center text-slate-300"><Sun className="h-8 w-8" /></div>}
                  <span className={cx('absolute left-3 top-3 rounded-full px-2.5 py-1 text-xs font-bold', tone(e.result.score))}>Score {e.result.score}</span>
                </div>
                <div className="p-4">
                  <h3 className="truncate font-bold text-ink">{e.buildingName}</h3>
                  <p className="text-xs text-slate-500">{new Date(e.timestamp).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })} · {e.result.seasonLabel}</p>
                  {e.plan ? (
                    <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                      {[['System', `${num(e.plan.kw, 1)} kWp`], ['Energy', `${num(e.plan.annualKwh / 1000, 1)} MWh`], ['Payback', e.plan.finance.paybackYears ? `${e.plan.finance.paybackYears.toFixed(1)} y` : '—']].map(([k, v]) => (
                        <div key={k} className="rounded-lg bg-slate-50 py-1.5"><div className="text-[10px] font-semibold uppercase text-slate-400">{k}</div><div className="text-sm font-bold text-ink">{v}</div></div>
                      ))}
                      <div className="col-span-3 truncate text-left text-xs text-slate-500">{e.plan.count} × {e.plan.panel} · net {inr(e.plan.finance.net)}</div>
                    </div>
                  ) : <p className="mt-3 text-xs text-slate-500">Suitability only · {e.result.suitabilityClass}</p>}
                  <div className="mt-4 flex gap-2">
                    <Button variant="outline" size="sm" className="flex-1" onClick={() => exportPdf({ buildingName: e.buildingName, result: e.result, plan: e.plan, mapScreenshot: e.mapScreenshot })}>
                      <Download className="h-3.5 w-3.5" /> PDF
                    </Button>
                    <Button variant="danger" size="sm" onClick={() => remove(e.id)} aria-label="Delete"><Trash2 className="h-3.5 w-3.5" /></Button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

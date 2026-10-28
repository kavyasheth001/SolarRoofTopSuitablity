// Building search (name, address or building ID) against GeoServer WFS, as you type.
import { useEffect, useRef, useState } from 'react';
import { Building2, Loader2, Search, X } from 'lucide-react';
import { searchBuildings } from '../solar/buildingQueries';
import { buildingName } from '../solar/names';

export default function SearchBox({ onPick }) {
  const [term, setTerm] = useState('');
  const [results, setResults] = useState(null);
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);
  const box = useRef(null);

  useEffect(() => {
    if (term.trim().length < 2) { setResults(null); return undefined; }
    setBusy(true);
    const id = setTimeout(() => {
      searchBuildings(term).then(setResults).catch(() => setResults([])).finally(() => setBusy(false));
    }, 250);
    return () => clearTimeout(id);
  }, [term]);

  useEffect(() => {
    const close = (e) => { if (!box.current?.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  return (
    <div ref={box} className="relative w-full max-w-md">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
      <input
        value={term}
        onChange={(e) => { setTerm(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        placeholder="Search a building, society or address in F/S ward"
        className="w-full rounded-xl border border-white/10 bg-white/10 py-2 pl-9 pr-9 text-sm text-white placeholder:text-slate-400 outline-none transition focus:border-sun-400/60 focus:bg-white/15"
      />
      {busy ? <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-slate-400" />
        : term && <button type="button" onClick={() => { setTerm(''); setResults(null); }} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white" aria-label="Clear"><X className="h-4 w-4" /></button>}
      {open && results && (
        <div className="absolute left-0 right-0 top-full z-30 mt-2 max-h-80 overflow-y-auto rounded-xl border border-slate-200 bg-white py-1 shadow-float">
          {results.length === 0 && <div className="px-4 py-3 text-sm text-slate-500">No buildings found in F/S ward.</div>}
          {results.map((f) => (
            <button key={f.id} type="button" onClick={() => { onPick(f); setOpen(false); }}
              className="flex w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-slate-50">
              <Building2 className="h-4 w-4 shrink-0 text-slate-400" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold text-ink">{buildingName(f.properties)}</span>
                <span className="block truncate text-xs text-slate-500">{[f.properties.no_floors, f.properties.class, f.properties.address].filter(Boolean).join(' · ')}</span>
              </span>
              <span className="shrink-0 text-xs font-semibold tabular-nums text-slate-400">{Number(f.properties.height).toFixed(0)} m</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// Layer list: 3D models (drawn by Cesium) and the GeoServer layers in their groups, with live feature counts.
import { useEffect, useState } from 'react';
import { ChevronDown, Layers } from 'lucide-react';
import registry from '../layers/registry.json';
import { OWS_URL } from '../config';
import { cx, num } from '../ui/kit';

const swatch = (l) => l.fill || l.point || l.rules?.[0]?.fill || l.stroke;

const MODELS = [
  ['lod1', 'Buildings (LoD1 blocks)', '#cbd5e1', 'From GeoServer WFS, coloured by height'],
  ['lod2', 'Buildings (LoD2 roofs)', '#e2e8f0', 'Detailed roof shapes'],
  ['reality', 'Reality mesh', 'linear-gradient(135deg,#a3a380,#5b6b4f)', 'Photoreal 3D city'],
];

function Row({ checked, onChange, color, round, title, note }) {
  return (
    <label className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2 py-1.5 hover:bg-slate-50">
      <input type="checkbox" autoComplete="off" checked={checked} onChange={onChange} className="h-3.5 w-3.5 shrink-0 accent-amber-500" />
      <span className={cx('h-3 w-3 shrink-0 border border-black/10', round ? 'rounded-full' : 'rounded-[3px]')} style={{ background: color }} />
      <span className="min-w-0 flex-1 truncate text-[13px] text-slate-700">{title}</span>
      {note != null && <span className="shrink-0 text-[11px] tabular-nums text-slate-400">{note}</span>}
    </label>
  );
}

export default function LayersPanel({ visible, onToggle, models, onToggleModel, modelStatus, buildingCount, collapse }) {
  const [open, setOpen] = useState(true);
  // Fold away when the analysis panel opens, so the 3D view keeps its room.
  useEffect(() => { if (collapse) setOpen(false); }, [collapse]);
  const [counts, setCounts] = useState({});

  // Feature count per published layer, straight from GeoServer WFS.
  useEffect(() => {
    registry.layers.forEach(async (l) => {
      try {
        const res = await fetch(`${OWS_URL}?service=WFS&version=2.0.0&request=GetFeature&typeNames=${registry.workspace}:${l.id}&resultType=hits`);
        const n = Number((await res.text()).match(/numberMatched="(\d+)"/)?.[1]);
        setCounts((c) => ({ ...c, [l.id]: Number.isFinite(n) ? n : null }));
      } catch { /* count stays blank */ }
    });
  }, []);

  return (
    <div className="glass pointer-events-auto flex max-h-full w-72 flex-col overflow-hidden rounded-2xl border border-slate-200/70 shadow-float">
      <button type="button" onClick={() => setOpen((o) => !o)} className="flex items-center gap-2 px-4 py-3 text-sm font-bold text-ink">
        <Layers className="h-4 w-4 text-sun-600" /> Layers
        <span className="text-xs font-medium text-slate-400">{registry.area}</span>
        <ChevronDown className={cx('ml-auto h-4 w-4 text-slate-400 transition', !open && '-rotate-90')} />
      </button>
      {open && (
        <div className="panel-scroll min-h-0 flex-1 overflow-y-auto border-t border-slate-100 px-2 pb-3">
          <div className="px-2 pb-1 pt-3 text-[11px] font-bold uppercase tracking-wider text-slate-400">3D models</div>
          {MODELS.map(([id, title, color]) => (
            <Row key={id} checked={models[id]} onChange={() => onToggleModel(id)} color={color} title={title}
              note={id === 'lod1' ? (buildingCount ? num(buildingCount) : '…') : modelStatus[id]} />
          ))}
          {registry.groups.map((g) => (
            <div key={g}>
              <div className="px-2 pb-1 pt-3 text-[11px] font-bold uppercase tracking-wider text-slate-400">{g}</div>
              {registry.layers.filter((l) => l.group === g).map((l) => (
                <Row key={l.id} checked={visible.has(l.id)} onChange={() => onToggle(l.id)} color={swatch(l)} round={Boolean(l.point)}
                  title={l.title} note={counts[l.id] == null ? '' : num(counts[l.id])} />
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

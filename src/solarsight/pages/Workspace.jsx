// SolarSight map workspace: full-screen 3D city (CesiumJS) with search, layers, sun controls, a 2D overview
// (OpenLayers) and the solar analysis + panel planner on the right. All data from our GeoServer.
import { useCallback, useEffect, useRef, useState } from 'react';
import { Building2, Gauge, Home as HomeIcon, Loader2, Sun, TriangleAlert } from 'lucide-react';
import { MapEngine, QUALITY } from '../map/engine';
import LayersPanel from '../map/LayersPanel';
import MiniMap from '../map/MiniMap';
import SearchBox from '../map/SearchBox';
import SunBar from '../map/SunBar';
import AnalysisPanel from '../solar/AnalysisPanel';
import { buildingName } from '../solar/names';
import registry from '../layers/registry.json';
import { Button, Logo, NavLinks, cx, num } from '../ui/kit';

const readPref = (key, fallback) => { try { return localStorage.getItem(key) || fallback; } catch { return fallback; } };
const writePref = (key, value) => { try { localStorage.setItem(key, value); } catch { /* private mode */ } };

function BuildingCard({ feature, onAnalyse, onClose }) {
  const p = feature.properties;
  return (
    <div className="glass pointer-events-auto w-80 rounded-2xl border border-slate-200/70 p-4 shadow-float">
      <div className="flex items-start gap-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-cyan-50 text-cyan-700"><Building2 className="h-4 w-4" /></span>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-extrabold text-ink">{buildingName(p)}</div>
          <div className="truncate text-xs text-slate-500">{p.address || p.class || 'F/S ward'}</div>
        </div>
        <button type="button" onClick={onClose} className="text-slate-400 hover:text-ink" aria-label="Close">×</button>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2 text-center">
        {[['Floors', p.no_floors || '—'], ['Height', `${num(p.height, 1)} m`], ['Footprint', `${num(p.area_sqmtr)} m²`]].map(([k, v]) => (
          <div key={k} className="rounded-lg bg-slate-50 px-2 py-1.5"><div className="text-[10px] font-semibold uppercase text-slate-400">{k}</div><div className="text-sm font-bold text-ink">{v}</div></div>
        ))}
      </div>
      <Button className="mt-3 w-full" onClick={onAnalyse}><Sun className="h-4 w-4" /> Check solar potential</Button>
    </div>
  );
}

export default function Workspace() {
  const mapEl = useRef(null);
  const [engine, setEngine] = useState(null);
  const [status, setStatus] = useState({ text: 'Starting the 3D map…', state: 'loading' });
  const [buildingCount, setBuildingCount] = useState(0);
  const [picked, setPicked] = useState(null);
  const [visible, setVisible] = useState(() => new Set(registry.layers.filter((l) => l.visible).map((l) => l.id)));
  const [models, setModels] = useState({ lod1: false, lod2: true, reality: false }); // LoD2 roofs by default
  const [modelStatus, setModelStatus] = useState({});
  const [season, setSeason] = useState('today');
  const [hour, setHour] = useState(10);
  const [shadows, setShadows] = useState(true);
  const [playing, setPlaying] = useState(false);
  const [quality, setQuality] = useState(() => readPref('solarsight.quality', 'balanced'));
  const [analysisOpen, setAnalysisOpen] = useState(false);
  const [cameraTarget, setCameraTarget] = useState(null);

  useEffect(() => {
    const e = new MapEngine(mapEl.current, {
      status: (text, state) => setStatus({ text, state }),
      buildings: setBuildingCount,
      pick: setPicked,
      models: setModelStatus,
      camera: setCameraTarget,
    });
    setEngine(e);
    return () => e.destroy();
  }, []);

  useEffect(() => { engine?.setSun(season, hour, shadows); }, [engine, season, hour, shadows]);
  useEffect(() => { engine?.setDrapedLayers(visible); }, [engine, visible]);
  useEffect(() => { engine?.setModels(models); }, [engine, models]);
  useEffect(() => { engine?.setQuality(quality); writePref('solarsight.quality', quality); }, [engine, quality]);

  const toggleLayer = (id) => setVisible((prev) => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const flyTo = useCallback(([lon, lat]) => engine?.flyToLonLat(lon, lat), [engine]);
  const pickFeature = (f) => { engine?.selectFeatureId(f.id, { fly: true }); };
  const feature = picked != null && engine ? engine.features[picked] : null;

  return (
    <div className="flex h-full flex-col bg-ink">
      <header className="relative z-30 flex h-14 shrink-0 items-center gap-4 border-b border-white/5 bg-ink px-4">
        <Logo dark />
        <div className="hidden lg:block"><NavLinks dark /></div>
        <div className="flex flex-1 justify-center"><SearchBox onPick={pickFeature} /></div>
        <label className="hidden items-center gap-1.5 text-xs text-slate-400 md:flex" title="Rendering quality: lower is smoother on laptops">
          <Gauge className="h-4 w-4" />
          <select value={quality} onChange={(e) => setQuality(e.target.value)} className="rounded-lg border border-white/10 bg-white/5 px-2 py-1.5 text-xs font-semibold text-slate-200">
            {Object.entries(QUALITY).map(([id, q]) => <option key={id} value={id} className="text-ink">{q.label}</option>)}
          </select>
        </label>
        <button type="button" onClick={() => setAnalysisOpen((o) => !o)}
          className={cx('inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold transition', analysisOpen ? 'bg-white text-ink' : 'bg-sun-500 text-ink hover:bg-sun-400')}>
          <Sun className="h-4 w-4" /> Solar analysis
        </button>
      </header>

      <div className="relative flex min-h-0 flex-1">
        <div className="relative min-w-0 flex-1">
          <div ref={mapEl} className="absolute inset-0" />

          <div className="pointer-events-none absolute bottom-[236px] left-3 top-3 flex items-start">
            {engine && <LayersPanel visible={visible} onToggle={toggleLayer} models={models} onToggleModel={(id) => setModels((m) => ({ ...m, [id]: !m[id] }))} modelStatus={modelStatus} buildingCount={buildingCount} collapse={analysisOpen} />}
          </div>

          <div className="pointer-events-none absolute right-3 top-3 flex flex-col items-end gap-2">
            <div className={cx('glass pointer-events-auto flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold shadow-float',
              status.state === 'error' ? 'border-rose-200 text-rose-700' : 'border-slate-200/70 text-slate-600')}>
              {status.state === 'loading' && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {status.state === 'error' && <TriangleAlert className="h-3.5 w-3.5" />}
              {status.state === 'ready' && <span className="h-2 w-2 rounded-full bg-emerald-500" />}
              {status.text}
            </div>
            {feature && !analysisOpen && (
              <BuildingCard feature={feature} onAnalyse={() => setAnalysisOpen(true)} onClose={() => engine.select(null)} />
            )}
          </div>

          <div className="pointer-events-none absolute bottom-3 left-3">
            <MiniMap visible={visible} target={cameraTarget} onFly={flyTo} />
          </div>
          <div className="pointer-events-none absolute bottom-3 left-[290px] right-3 flex items-end justify-center gap-2">
            <SunBar season={season} setSeason={setSeason} hour={hour} setHour={setHour} shadows={shadows} setShadows={setShadows} playing={playing} setPlaying={setPlaying} />
            <button type="button" onClick={() => engine?.goHome()} title="Back to the whole ward"
              className="glass pointer-events-auto grid h-11 w-11 place-items-center rounded-2xl border border-slate-200/70 text-slate-600 shadow-float hover:text-ink">
              <HomeIcon className="h-4 w-4" />
            </button>
          </div>
        </div>

        {analysisOpen && engine && (
          <AnalysisPanel engine={engine} picked={picked} season={season} setSeason={setSeason} setHour={(h) => { setPlaying(false); setHour(h); }} onClose={() => setAnalysisOpen(false)} />
        )}
      </div>
    </div>
  );
}

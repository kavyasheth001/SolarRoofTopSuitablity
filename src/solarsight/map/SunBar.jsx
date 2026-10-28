// Sun controls: day of the year, time of day (IST) with play, and shadows on/off.
import { useEffect } from 'react';
import { Pause, Play, Sunrise, Sunset } from 'lucide-react';
import { SEASONS } from '../config';
import { cx } from '../ui/kit';

export const clock = (hour) => {
  const m = Math.round(hour * 60);
  const h = Math.floor(m / 60);
  return `${h % 12 || 12}:${String(m % 60).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`;
};

export default function SunBar({ season, setSeason, hour, setHour, shadows, setShadows, playing, setPlaying }) {
  useEffect(() => {
    if (!playing) return undefined;
    const id = setInterval(() => setHour((h) => (h >= 19 ? 6 : Math.round((h + 0.1) * 100) / 100)), 90);
    return () => clearInterval(id);
  }, [playing, setHour]);

  return (
    <div className="glass pointer-events-auto flex flex-wrap items-center gap-x-4 gap-y-2 rounded-2xl border border-slate-200/70 px-4 py-2.5 shadow-float">
      <select value={season} onChange={(e) => setSeason(e.target.value)} className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs font-semibold text-slate-700">
        {Object.entries(SEASONS).map(([id, s]) => <option key={id} value={id}>{s.label}</option>)}
      </select>
      <button type="button" onClick={() => setPlaying((p) => !p)} title={playing ? 'Pause' : 'Play the day'}
        className="grid h-8 w-8 place-items-center rounded-full bg-ink text-white hover:bg-ink-700">
        {playing ? <Pause className="h-3.5 w-3.5" /> : <Play className="ml-0.5 h-3.5 w-3.5" />}
      </button>
      <div className="flex items-center gap-2">
        <Sunrise className="h-4 w-4 text-sun-500" />
        <input type="range" min={6} max={19} step={0.05} value={hour} onChange={(e) => { setPlaying(false); setHour(Number(e.target.value)); }}
          className="w-44 accent-amber-500 sm:w-56" aria-label="Time of day" />
        <Sunset className="h-4 w-4 text-orange-500" />
      </div>
      <span className="w-[70px] text-sm font-bold tabular-nums text-ink">{clock(hour)}</span>
      <button type="button" onClick={() => setShadows((s) => !s)}
        className={cx('rounded-lg px-2.5 py-1.5 text-xs font-semibold transition', shadows ? 'bg-sun-100 text-sun-600' : 'bg-slate-100 text-slate-500')}>
        Shadows {shadows ? 'on' : 'off'}
      </button>
    </div>
  );
}

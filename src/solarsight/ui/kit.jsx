// Small shared UI pieces for SolarSight.
import clsx from 'clsx';
import { Link, NavLink } from 'react-router-dom';
import { Sun } from 'lucide-react';

export const cx = clsx;

export function Logo({ dark = false, compact = false }) {
  return (
    <Link to="/" className="flex items-center gap-2.5" aria-label="SolarSight home">
      <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-sun-300 to-sun-600 shadow-[0_0_24px_-4px_rgba(245,164,0,0.7)]">
        <Sun className="h-5 w-5 text-ink" strokeWidth={2.5} />
      </span>
      {!compact && (
        <span className={cx('text-lg font-extrabold tracking-tight', dark ? 'text-white' : 'text-ink')}>
          Solar<span className="text-sun-500">Sight</span>
        </span>
      )}
    </Link>
  );
}

export function NavLinks({ dark = false }) {
  const item = ({ isActive }) => cx(
    'rounded-lg px-3 py-1.5 text-sm font-semibold transition',
    dark
      ? isActive ? 'bg-white/10 text-white' : 'text-slate-300 hover:bg-white/5 hover:text-white'
      : isActive ? 'bg-slate-900/5 text-ink' : 'text-slate-500 hover:text-ink',
  );
  return (
    <nav className="flex items-center gap-1">
      <NavLink to="/" end className={item}>Home</NavLink>
      <NavLink to="/map" className={item}>Map</NavLink>
      <NavLink to="/plans" className={item}>Saved plans</NavLink>
    </nav>
  );
}

export function Button({ variant = 'primary', size = 'md', className, children, ...props }) {
  return (
    <button
      type="button"
      className={cx(
        'inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition disabled:cursor-not-allowed disabled:opacity-50',
        size === 'sm' ? 'px-3 py-1.5 text-xs' : size === 'lg' ? 'px-5 py-3 text-base' : 'px-4 py-2 text-sm',
        variant === 'primary' && 'bg-sun-500 text-ink shadow-sm hover:bg-sun-400',
        variant === 'dark' && 'bg-ink text-white hover:bg-ink-700',
        variant === 'ghost' && 'text-slate-600 hover:bg-slate-100',
        variant === 'outline' && 'border border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50',
        variant === 'danger' && 'bg-rose-50 text-rose-700 hover:bg-rose-100',
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export function Stat({ label, value, sub, accent }) {
  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50/70 px-3 py-2.5">
      <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{label}</div>
      <div className={cx('mt-0.5 text-[15px] font-bold tabular-nums', accent || 'text-ink')}>{value}</div>
      {sub && <div className="text-[11px] text-slate-500">{sub}</div>}
    </div>
  );
}

export function SectionTitle({ step, title, right }) {
  return (
    <div className="mb-3 flex items-center gap-2">
      {step && <span className="grid h-5 w-5 place-items-center rounded-full bg-ink text-[11px] font-bold text-white">{step}</span>}
      <h3 className="flex-1 text-[13px] font-bold uppercase tracking-wide text-slate-500">{title}</h3>
      {right}
    </div>
  );
}

export function Segmented({ value, onChange, options }) {
  return (
    <div className="flex rounded-xl bg-slate-100 p-1">
      {options.map(([id, label]) => (
        <button key={id} type="button" onClick={() => onChange(id)}
          className={cx('flex-1 rounded-lg px-3 py-1.5 text-xs font-semibold transition', value === id ? 'bg-white text-ink shadow-sm' : 'text-slate-500 hover:text-ink')}>
          {label}
        </button>
      ))}
    </div>
  );
}

export const inr = (v) => `₹${Math.round(Number(v) || 0).toLocaleString('en-IN')}`;
export const num = (v, d = 0) => (Number(v) || 0).toLocaleString('en-IN', { maximumFractionDigits: d, minimumFractionDigits: d });

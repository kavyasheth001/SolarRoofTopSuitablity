// SolarSight routes. The map workspace (CesiumJS, OpenLayers) is loaded only when opened, so the home page
// and saved plans load fast.
import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import Home from './pages/Home';
import Plans from './pages/Plans';
import { Logo } from './ui/kit';

const Workspace = lazy(() => import('./pages/Workspace'));

function Loading() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 bg-ink text-white">
      <Logo dark />
      <div className="h-1 w-40 overflow-hidden rounded-full bg-white/10"><div className="h-full w-1/2 animate-pulse rounded-full bg-sun-400" /></div>
      <p className="text-sm text-slate-400">Opening the 3D map…</p>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/map" element={<Suspense fallback={<Loading />}><Workspace /></Suspense>} />
      <Route path="/plans" element={<Plans />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

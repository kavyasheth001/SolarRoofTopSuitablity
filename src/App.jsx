import { useEffect, useState, lazy, Suspense } from 'react';
import { Route, Routes, useLocation } from 'react-router-dom';
import Loader from './common/Loader';
import PageTitle from './components/PageTitle';
import DefaultLayout from './layout/DefaultLayout';

// Lazy-load heavy route components — they're only fetched when first navigated to
const NewLogin = lazy(() => import('./components/Login/NewLogin'));
const TwoDMap = lazy(() => import('./components/Maps/TwoDMap'));
const SolarDashboard = lazy(() => import('./pages/SolarDashboard'));
const Methodology = lazy(() => import('./pages/Methodology'));

function App() {
  const { pathname } = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isHeaderCollapsed, setIsHeaderCollapsed] = useState(false);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  const excludedRoutes = ['/', '/dashboard', '/methodology'];
  const isExcludedRoute = excludedRoutes.includes(pathname);

  const appContent = (
    <Suspense fallback={<Loader />}>
      <Routes>
        <Route
          index
          element={
            <>
              <PageTitle title="Login" />
              <NewLogin />
            </>
          }
        />
        <Route
          path="/map"
          element={
            <>
              <PageTitle title="Map" />
              <TwoDMap isSidebarCollapsed={!sidebarOpen} />
            </>
          }
        />
        <Route
          path="/dashboard"
          element={
            <>
              <PageTitle title="SolarSight Dashboard" />
              <SolarDashboard />
            </>
          }
        />
        <Route
          path="/methodology"
          element={
            <>
              <PageTitle title="Solar Methodology | SolarSight" />
              <Methodology />
            </>
          }
        />
      </Routes>
    </Suspense>
  );

  return isExcludedRoute ? (
    appContent
  ) : (
    <DefaultLayout sidebarOpen={sidebarOpen}
      setSidebarOpen={setSidebarOpen}
      isHeaderCollapsed={isHeaderCollapsed}
      setIsHeaderCollapsed={setIsHeaderCollapsed}>{appContent}</DefaultLayout>
  );
}

export default App;

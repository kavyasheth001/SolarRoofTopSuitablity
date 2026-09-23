import { useEffect, useState } from 'react';
import { Route, Routes, useLocation } from 'react-router-dom';
import Loader from './common/Loader';
import PageTitle from './components/PageTitle';
import NewLogin from './components/Login/NewLogin';
import TwoDMap from './components/Maps/TwoDMap';
import SolarDashboard from './pages/SolarDashboard';
import ProtectedRoute from './ProtectedRoute';
import DefaultLayout from './layout/DefaultLayout';

function App() {
  const [loading, setLoading] = useState(true);
  const { pathname } = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isHeaderCollapsed, setIsHeaderCollapsed] = useState(false);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  useEffect(() => {
    setTimeout(() => setLoading(false), 1000);
  }, []);

  const excludedRoutes = ['/', '/dashboard'];
  const isExcludedRoute = excludedRoutes.includes(pathname);

  const appContent = (
    <>
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
      </Routes>
    </>
  );

  return loading ? (
    <Loader />
  ) : isExcludedRoute ? (
    appContent
  ) : (
    <DefaultLayout sidebarOpen={sidebarOpen}
      setSidebarOpen={setSidebarOpen}
      isHeaderCollapsed={isHeaderCollapsed}
      setIsHeaderCollapsed={setIsHeaderCollapsed} >{appContent}</DefaultLayout>
  );
}

export default App;

import React, { useState, ReactNode } from 'react';
import Header from '../components/Header/index';
import Sidebar from '../components/Sidebar/index';
import { useLocation } from 'react-router-dom';

const DefaultLayout = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
   const location = useLocation();
  const isMapRoute = location.pathname.endsWith('/map') || location.pathname === '/';
  const isOtherRoute = location.pathname ==='/messages' || location.pathname === '/inbox' || location.pathname === '/calendar' || location.pathname === '/projects';

  return (
    <div className="dark:bg-boxdark-2 dark:text-bodydark">
      {/* <!-- ===== Page Wrapper Start ===== --> */}
      <div className="flex h-screen overflow-hidden">
        {/* <!-- ===== Sidebar Start ===== --> */}
        <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
        {/* <!-- ===== Sidebar End ===== --> */}

        {/* <!-- ===== Content Area Start ===== --> */}
        <div className={isMapRoute ? 'relative flex flex-1 flex-col overflow-x-hidden overflow-y-hidden' : isOtherRoute ? 'relative flex flex-1 flex-col overflow-x-hidden overflow-y-auto' : ' relative flex flex-1 flex-col overflow-x-hidden overflow-y-auto'}>
          {/* <!-- ===== Header Start ===== --> */}
          <Header sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
          {/* <!-- ===== Header End ===== --> */}

          {/* <!-- ===== Main Content Start ===== --> */}
          <main className="flex-1 overflow-hidden flex flex-col">
            <div className={isMapRoute ? 'flex-1 w-full relative' : 'relative mx-auto p-2 md:p-2 2xl:p-2 flex-1'}>
      {children}
    </div>
          </main>
          {/* <!-- ===== Main Content End ===== --> */}
        </div>
        {/* <!-- ===== Content Area End ===== --> */}
      </div>
      {/* <!-- ===== Page Wrapper End ===== --> */}
    </div>
  );
};

export default DefaultLayout;

import React, { useEffect, useRef, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import SidebarLinkGroup from './SidebarLinkGroup';
import log from '../../images/logo/BMC.png';
import mumbai from '../../images/logo/mumbaimap.png';
import { useAuth, useSessionTimer } from '../../context/AuthContext';
import { useMap } from '../../context/MapContext';
import { LogOut, ChevronDown, ChevronUp } from 'lucide-react';
import { FaBarcode, FaBuilding, FaExclamationTriangle, FaFileInvoiceDollar, FaFireAlt, FaLeaf, FaRoad, FaTree, FaWater, FaCalendarAlt, FaCubes, FaCloudSun, FaSolarPanel, FaMousePointer } from 'react-icons/fa';
import { MdFlood, MdWater } from 'react-icons/md';

const Sidebar = ({ sidebarOpen, setSidebarOpen }) => {
  const { callQuickAccessButtonFunction, getQuickAccessButtonState, registerQuickAccessButtonState } = useMap();
  const { auth, logout } = useAuth();
  const { timeLeft, tokenTimeLeft } = useSessionTimer();
  const [userRole, setUserRole] = useState('');
  const [userDepartment, setUserDepartment] = useState('');
  const [assessmentDropdownOpen, setAssessmentDropdownOpen] = useState(false);

  const location = useLocation();
  const { pathname } = location;

  const trigger = useRef(null);
  const sidebar = useRef(null);

  const storedSidebarExpanded = localStorage.getItem('sidebar-expanded');
  const [sidebarExpanded, setSidebarExpanded] = useState(
    storedSidebarExpanded === null ? false : storedSidebarExpanded === 'true',
  );


  // Close sidebar on outside click for small devices
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        sidebarOpen &&
        sidebar.current &&
        !sidebar.current.contains(event.target) &&
        trigger.current &&
        !trigger.current.contains(event.target)
      ) {
        setSidebarOpen(false);
      }
    };

    // Only add listener on small devices
    const mediaQuery = window.matchMedia('(max-width: 1024px)');
    if (mediaQuery.matches) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [sidebarOpen, setSidebarOpen]);

  const decodeToken = (token) => {
    try {
      const base64Payload = token.split('.')[1];
      const payload = atob(base64Payload);
      return JSON.parse(payload);
    } catch (e) {
      return null;
    }
  };

  const token = localStorage.getItem('token');
  const user = token ? JSON.stringify(decodeToken(token)) : null;
  const parsedUser = user ? JSON.parse(user) : null;

  const formatTime = (ms) => {
    const totalSec = Math.floor(ms / 1000);
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const formatTokenTime = (ms) => {
    if (ms === null) return '--:--:--';
    const totalSec = Math.floor(ms / 1000);
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  useEffect(() => {
    if (user) {
      const parsedUser = JSON.parse(user);
      setUserRole(parsedUser?.role?.trim().toLowerCase() || '');
      setUserDepartment(parsedUser?.tag?.trim().toLowerCase() || '');
    }
  }, [user]);

  const isAdmin = userRole == 'super admin' || userRole == 'admin';



  useEffect(() => {
    localStorage.setItem('sidebar-expanded', sidebarExpanded.toString());
    if (sidebarExpanded) {
      document.querySelector('body')?.classList.add('sidebar-expanded');
    } else {
      document.querySelector('body')?.classList.remove('sidebar-expanded');
    }
  }, [sidebarExpanded]);

  // Custom active link style with vertical colored border
  const activeNavLinkStyle = {
    position: 'relative',
    backgroundColor: 'transparent',
  };

  const hasDashboardAccess = isAdmin ||
    userDepartment === 'assessment' ||
    userDepartment === 'buid' ||
    userDepartment === 'bridge' ||
    userDepartment === 'fire' ||
    userDepartment === 'hydraulic' ||
    userDepartment === 'road' ||
    userDepartment === 'trees' ||
    userDepartment === 'developement' ||
    userDepartment === 'environment' ||
    userDepartment === 'Sewerage';

  // Vertical colored border for active links
  const activeIndicatorStyle = {
    content: '""',
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: '4px',
    backgroundColor: '#2B5DB1',
    borderRadius: '0 2px 2px 0',
  };

  // Secondary color for text and icons — neutral slate grey, not amber
  const secondaryColor = '#64748b';

  return (
    <aside
      ref={sidebar}
      className={`absolute z-[99999] lg:static left-0 top-0 flex h-screen flex-col overflow-y-hidden bg-white bg-no-repeat bg-cover bg-center duration-200 ease-linear dark:bg-boxdark ${sidebarOpen ? 'w-72.5 translate-x-0' : 'w-0 translate-x-[-100%]'}`}
    >
      {/* SIDEBAR HEADER */}
      {/* SIDEBAR HEADER */}
      <div className="flex items-center border-b border-gray-100 px-4 py-4 gap-3">


        {/* User Info — right of logo */}
        

        {/* Mobile close button */}
        <button
          ref={trigger}
          onClick={() => setSidebarOpen(!sidebarOpen)}
          aria-controls="sidebar"
          aria-expanded={sidebarOpen}
          className="block lg:hidden flex-shrink-0 p-1.5 rounded-md hover:bg-gray-100 transition-colors self-start"
        >
          <svg className="fill-current" width="18" height="16" viewBox="0 0 20 18" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M19 8.175H2.98748L9.36248 1.6875C9.69998 1.35 9.69998 0.825 9.36248 0.4875C9.02498 0.15 8.49998 0.15 8.16248 0.4875L0.399976 8.3625C0.0624756 8.7 0.0624756 9.225 0.399976 9.5625L8.16248 17.4375C8.31248 17.5875 8.53748 17.7 8.76248 17.7C8.98748 17.7 9.17498 17.625 9.36248 17.475C9.69998 17.1375 9.69998 16.6125 9.36248 16.275L3.02498 9.8625H19C19.45 9.8625 19.825 9.4875 19.825 9.0375C19.825 8.55 19.45 8.175 19 8.175Z" fill="" />
          </svg>
        </button>
      </div>

      {/* User Info Card */}
      {/*  */}
      <div className="no-scrollbar flex flex-col overflow-y-auto duration-300 ease-linear">
        <nav className="py-6 px-4">
          <div>
            <h3 className="mb-5 px-4 text-sm font-bold uppercase tracking-wider" style={{ color: secondaryColor }}>
              MAP TOOLS
            </h3>
            <ul className="mb-6 flex flex-col gap-2">
              <li>
                <button
                  onClick={() => {
                    callQuickAccessButtonFunction('realityModel');
                  }}
                  className={`group relative flex items-center gap-3.5 rounded-lg py-3 px-4 font-medium text-base duration-200 ease-in-out hover:bg-[#eff6ff] transition-all w-full text-left ${getQuickAccessButtonState('realityModel') ? 'bg-blue-50 text-[#2B5DB1]' : 'text-gray-600'
                    }`}
                >
                  {getQuickAccessButtonState('realityModel') && <span style={activeIndicatorStyle} />}
                  <FaCubes className="text-lg" style={{ color: secondaryColor }} />
                  Reality Model
                </button>
              </li>
              <li>
                <button
                  onClick={() => {
                    callQuickAccessButtonFunction('lodModel');
                  }}
                  className={`group relative flex items-center gap-3.5 rounded-lg py-3 px-4 font-medium text-base duration-200 ease-in-out hover:bg-[#eff6ff] transition-all w-full text-left ${getQuickAccessButtonState('lodModel') ? 'bg-blue-50 text-[#2B5DB1]' : 'text-gray-600'
                    }`}
                >
                  {getQuickAccessButtonState('lodModel') && <span style={activeIndicatorStyle} />}
                  <FaBuilding className="text-lg" style={{ color: secondaryColor }} />
                  LOD Model
                </button>
              </li>
              <li>
                <button
                  onClick={() => {
                    callQuickAccessButtonFunction('shadowAnalysis');
                  }}
                  className={`group relative flex items-center gap-3.5 rounded-lg py-3 px-4 font-medium text-base duration-200 ease-in-out hover:bg-[#eff6ff] transition-all w-full text-left ${getQuickAccessButtonState('shadowAnalysis') ? 'bg-blue-50 text-[#2B5DB1]' : 'text-gray-600'
                    }`}
                >
                  {getQuickAccessButtonState('shadowAnalysis') && <span style={activeIndicatorStyle} />}
                  <FaCloudSun className="text-lg" style={{ color: secondaryColor }} />
                  Shadow Analysis
                </button>
              </li>
              <li>
                <button
                  onClick={() => {
                    callQuickAccessButtonFunction('solarSuitability');
                  }}
                  className={`group relative flex items-center gap-3.5 rounded-lg py-3 px-4 font-medium text-base duration-200 ease-in-out hover:bg-[#eff6ff] transition-all w-full text-left ${getQuickAccessButtonState('solarSuitability') ? 'bg-blue-50 text-[#2B5DB1]' : 'text-gray-600'
                    }`}
                >
                  {getQuickAccessButtonState('solarSuitability') && <span style={activeIndicatorStyle} />}
                  <FaSolarPanel className="text-lg" style={{ color: secondaryColor }} />
                  Solar Suitability
                </button>
              </li>
              <li>
                <button
                  onClick={() => {
                    callQuickAccessButtonFunction('identify');
                  }}
                  className={`group relative flex items-center gap-3.5 rounded-lg py-3 px-4 font-medium text-base duration-200 ease-in-out hover:bg-[#eff6ff] transition-all w-full text-left ${getQuickAccessButtonState('identify') ? 'bg-blue-50 text-[#2B5DB1]' : 'text-gray-600'
                    }`}
                >
                  {getQuickAccessButtonState('identify') && <span style={activeIndicatorStyle} />}
                  <FaMousePointer className="text-lg" style={{ color: secondaryColor }} />
                  Identify
                </button>
              </li>
            </ul>

            <h3 className="mb-5 px-4 text-sm font-bold uppercase tracking-wider" style={{ color: secondaryColor }}>
              PAGES
            </h3>
            <ul className="mb-6 flex flex-col gap-2">
              <li>
                <NavLink
                  to="/map"
                  className={({ isActive }) => `group relative flex items-center gap-3.5 rounded-lg py-3 px-4 font-medium text-base duration-200 ease-in-out hover:bg-[#eff6ff] transition-all ${isActive ? 'bg-blue-50 text-[#2B5DB1]' : 'text-gray-600'}`}
                >
                  {({ isActive }) => (
                    <>
                      {isActive && <span style={activeIndicatorStyle} />}
                      Map
                    </>
                  )}
                </NavLink>
              </li>
              <li>
                <NavLink
                  to="/dashboard"
                  className={({ isActive }) => `group relative flex items-center gap-3.5 rounded-lg py-3 px-4 font-medium text-base duration-200 ease-in-out hover:bg-[#eff6ff] transition-all ${isActive ? 'bg-blue-50 text-[#2B5DB1]' : 'text-gray-600'}`}
                >
                  {({ isActive }) => (
                    <>
                      {isActive && <span style={activeIndicatorStyle} />}
                      Dashboard
                    </>
                  )}
                </NavLink>
              </li>
              <li>
                <NavLink
                  to="/map?tool=solar"
                  className={({ isActive }) => `group relative flex items-center gap-3.5 rounded-lg py-3 px-4 font-medium text-base duration-200 ease-in-out hover:bg-[#eff6ff] transition-all ${isActive ? 'bg-blue-50 text-[#2B5DB1]' : 'text-gray-600'}`}
                >
                  <FaSolarPanel className="text-lg" style={{ color: secondaryColor }} />
                  Solar Analysis
                </NavLink>
              </li>
            </ul>

            </div>
        </nav>
      </div>
    </aside>
  );
};

export default Sidebar;

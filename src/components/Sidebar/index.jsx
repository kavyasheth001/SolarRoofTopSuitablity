import React, { useEffect, useRef, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import SidebarLinkGroup from './SidebarLinkGroup';
import log from '../../images/logo/BMC.png';
import mumbai from '../../images/logo/mumbaimap.png';
import { useAuth, useSessionTimer } from '../../context/AuthContext';
import { LogOut } from 'lucide-react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { FaBarcode, FaBuilding, FaExclamationTriangle, FaFileInvoiceDollar, FaFireAlt, FaLeaf, FaRoad, FaTree, FaWater, FaCalendarAlt } from 'react-icons/fa';
import { MdFlood, MdWater } from 'react-icons/md';

const Sidebar = ({ sidebarOpen, setSidebarOpen }) => {
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

  // Secondary color for text and icons
  const secondaryColor = '#c2a01e';

  return (
    <aside
      ref={sidebar}
      className={`absolute z-[99999] lg:static left-0 top-0 flex h-screen flex-col overflow-y-hidden bg-white bg-no-repeat bg-cover bg-center duration-200 ease-linear dark:bg-boxdark ${sidebarOpen ? 'w-72.5 translate-x-0' : 'w-0 translate-x-[-100%]'}`}
    >
      {/* SIDEBAR HEADER */}
      {/* SIDEBAR HEADER */}
      <div className="flex items-center border-b border-gray-100 px-4 py-4 gap-3">

        {/* Logo */}
        <NavLink to="/map" className="flex-shrink-0">
          <img
            src={log || '/placeholder.svg'}
            alt="Logo"
            className="w-20 h-20 rounded-full shadow-md transform transition-all duration-300 hover:scale-105"
          />
        </NavLink>

        {/* User Info — right of logo */}
        {user && (() => {
          const parsedUser = JSON.parse(user);
          const designationMap = { 1: 'L1', 2: 'L2', 3: 'L3', 4: 'L4', 5: 'L5', 6: 'L6' };
          const level = designationMap[parsedUser?.designation_level] || `L${parsedUser?.designation_level}`;

          return (
            <div className="flex-1 min-w-0">
              {/* Name + Badge */}
              <div className="flex items-center justify-between gap-1 mb-2">
                <p className="text-sm font-bold text-gray-800 truncate leading-tight flex-1">
                  {parsedUser?.name || 'N/A'}
                </p>
                <span className="flex-shrink-0 rounded-full bg-[#2B5DB1] px-2 py-0.5 text-[9px] font-bold text-white">
                  {level}
                </span>
              </div>

              {/* Dept */}
              {parsedUser?.department && (
                <div className="flex items-center gap-1 mb-0.5">
                  <svg width="9" height="9" viewBox="0 0 24 24" fill="none">
                    <path d="M3 21h18M3 7l9-4 9 4M4 7v14M20 7v14M8 11h2m4 0h2M8 15h2m4 0h2" stroke="#c2a01e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <p className="text-[10px] text-gray-500 truncate">{parsedUser?.department || 'N/A'}</p>
                </div>
              )}
              {/* Designation */}
              <div className="flex items-center gap-1 mb-0.5">
                <svg width="9" height="9" viewBox="0 0 24 24" fill="none">
                  <path d="M12 11c2.21 0 4-1.79 4-4S14.21 3 12 3 8 4.79 8 7s1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" fill="#c2a01e" />
                </svg>
                <p className="text-[10px] text-gray-500 truncate">{parsedUser?.role || 'N/A'}</p>
              </div>

              {/* Email */}
              <div className="flex items-center gap-1 mb-0.5">
                <svg width="9" height="9" viewBox="0 0 24 24" fill="none">
                  <path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z" fill="#c2a01e" />
                </svg>
                <p className="text-[10px] text-gray-500 truncate">{parsedUser?.email || 'N/A'}</p>
              </div>

              {/* Session Timer (inactivity) */}
              <div className="flex items-center gap-1 mb-0.5">
                <svg width="9" height="9" viewBox="0 0 24 24" fill="none">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z" fill="#c2a01e" />
                  <path d="M12.5 7H11v6l5.25 3.15.75-1.23-4.5-2.67V7z" fill="#c2a01e" />
                </svg>
                <p className="text-[10px] text-gray-500 truncate">
                  Inactive logout: <span className="font-semibold text-gray-700">{formatTime(timeLeft)}</span>
                </p>
              </div>

              {/* Token Expiry Timer */}
              <div className="flex items-center gap-1">
                <svg width="9" height="9" viewBox="0 0 24 24" fill="none">
                  <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z" fill={tokenTimeLeft === 0 ? "#dc2626" : "#c2a01e"} />
                </svg>
                <p className="text-[10px] text-gray-500 truncate">
                  Session expires: <span className={`font-semibold ${tokenTimeLeft === 0 ? "text-red-600" : "text-gray-700"}`}>{formatTokenTime(tokenTimeLeft)}</span>
                </p>
              </div>
            </div>
          );
        })()}

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
      {/* {user && (() => {
        const parsedUser = JSON.parse(user);
        const designationMap = { 1: 'L1', 2: 'L2', 3: 'L3', 4: 'L4', 5: 'L5', 6: 'L6' };
        const level = designationMap[parsedUser?.designation_level] || `L${parsedUser?.designation_level}`;

        return (
          <div className="px-6 py-3 border-b border-gray-200">
            Name + Level
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-bold text-gray-800 truncate">{parsedUser?.name || 'N/A'}</p>
              <span className="ml-2 flex-shrink-0 rounded-full bg-[#2B5DB1] px-2 py-0.5 text-[10px] font-bold text-white">
                {level}
              </span>
            </div>

            Dept, Designation, Email — simple label+value rows
            <div className="flex flex-col gap-1">
              {parsedUser?.department && (
              <div className="flex items-center gap-1.5">
                <p className="text-[8px] uppercase tracking-wider text-gray-400 w-16 flex-shrink-0">Dept</p>
                <p className="text-[11px] font-medium text-gray-600 truncate">{parsedUser?.department || 'N/A'}</p>
              </div>
              )}
              <div className="flex items-center gap-1.5">
                <p className="text-[8px] uppercase tracking-wider text-gray-400 w-16 flex-shrink-0">Designation</p>
                <p className="text-[11px] font-medium text-gray-600 truncate">{parsedUser?.role || 'N/A'}</p>
              </div>
              <div className="flex items-center gap-1.5">
                <p className="text-[8px] uppercase tracking-wider text-gray-400 w-16 flex-shrink-0">Email</p>
                <p className="text-[11px] font-medium text-gray-600 truncate">{parsedUser?.email || 'N/A'}</p>
              </div>
            </div>
          </div>
        );
      })()} */}
      <div className="no-scrollbar flex flex-col overflow-y-auto duration-300 ease-linear">
        <nav className="py-6 px-4">
          <div>
            <h3
              className="mb-5 px-4 text-sm font-bold uppercase tracking-wider"
              style={{ color: secondaryColor }}
            >
              MENU
            </h3>

            <ul className="mb-6 flex flex-col gap-2">
              {/* Dashboard Dropdown */}
              {hasDashboardAccess && (
                <SidebarLinkGroup
                  activeCondition={pathname === '/forms' || pathname.includes('forms')}
                >
                  {(handleClick, open) => {
                    return (
                      <React.Fragment>
                        <NavLink
                          to="#"
                          className={`group relative flex items-center gap-3.5 rounded-lg py-3 px-4 font-medium text-base duration-200 ease-in-out hover:bg-[#FFF8E7] transition-all`}
                          onClick={(e) => {
                            e.preventDefault();
                            sidebarExpanded ? handleClick() : setSidebarExpanded(true);
                          }}
                        >
                          <svg className="flex-shrink-0 transition-colors duration-200" width="22" height="22" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ color: secondaryColor }}>
                            <path d="M6.10322 0.956299H2.53135C1.5751 0.956299 0.787598 1.7438 0.787598 2.70005V6.27192C0.787598 7.22817 1.5751 8.01567 2.53135 8.01567H6.10322C7.05947 8.01567 7.84697 7.22817 7.84697 6.27192V2.72817C7.8751 1.7438 7.0876 0.956299 6.10322 0.956299ZM6.60947 6.30005C6.60947 6.5813 6.38447 6.8063 6.10322 6.8063H2.53135C2.2501 6.8063 2.0251 6.5813 2.0251 6.30005V2.72817C2.0251 2.44692 2.2501 2.22192 2.53135 2.22192H6.10322C6.38447 2.22192 6.60947 2.44692 6.60947 2.72817V6.30005Z" fill="currentColor" />
                            <path d="M15.4689 0.956299H11.8971C10.9408 0.956299 10.1533 1.7438 10.1533 2.70005V6.27192C10.1533 7.22817 10.9408 8.01567 11.8971 8.01567H15.4689C16.4252 8.01567 17.2127 7.22817 17.2127 6.27192V2.72817C17.2127 1.7438 16.4252 0.956299 15.4689 0.956299ZM15.9752 6.30005C15.9752 6.5813 15.7502 6.8063 15.4689 6.8063H11.8971C11.6158 6.8063 11.3908 6.5813 11.3908 6.30005V2.72817C11.3908 2.44692 11.6158 2.22192 11.8971 2.22192H15.4689C15.7502 2.22192 15.9752 2.44692 15.9752 2.72817V6.30005Z" fill="currentColor" />
                            <path d="M6.10322 9.92822H2.53135C1.5751 9.92822 0.787598 10.7157 0.787598 11.672V15.2438C0.787598 16.2001 1.5751 16.9876 2.53135 16.9876H6.10322C7.05947 16.9876 7.84697 16.2001 7.84697 15.2438V11.7001C7.8751 10.7157 7.0876 9.92822 6.10322 9.92822ZM6.60947 15.272C6.60947 15.5532 6.38447 15.7782 6.10322 15.7782H2.53135C2.2501 15.7782 2.0251 15.5532 2.0251 15.272V11.7001C2.0251 11.4188 2.2501 11.1938 2.53135 11.1938H6.10322C6.38447 11.1938 6.60947 11.4188 6.60947 15.272Z" fill="currentColor" />
                            <path d="M15.4689 9.92822H11.8971C10.9408 9.92822 10.1533 10.7157 10.1533 11.672V15.2438C10.1533 16.2001 10.9408 16.9876 11.8971 16.9876H15.4689C16.4252 16.9876 17.2127 16.2001 17.2127 15.2438V11.7001C17.2127 10.7157 16.4252 9.92822 15.4689 9.92822ZM15.9752 15.272C15.9752 15.5532 15.7502 15.7782 15.4689 15.7782H11.8971C11.6158 15.7782 11.3908 15.5532 11.3908 15.272V11.7001C11.3908 11.4188 11.6158 11.1938 11.8971 11.1938H15.4689C15.7502 11.1938 15.9752 11.4188 15.9752 15.272Z" fill="currentColor" />
                          </svg>
                          <span style={{ color: secondaryColor }} className="flex-1 font-semibold transition-all duration-200 group-hover:text-[#a38818]">
                            Dashboard
                          </span>
                          <svg className={`flex-shrink-0 transition-all duration-200 ${open && 'rotate-180'}`} width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ color: secondaryColor }}>
                            <path fillRule="evenodd" clipRule="evenodd" d="M4.41107 6.9107C4.73651 6.58527 5.26414 6.58527 5.58958 6.9107L10.0003 11.3214L14.4111 6.91071C14.7365 6.58527 15.2641 6.58527 15.5896 6.91071C15.915 7.23614 15.915 7.76378 15.5896 8.08922L10.5896 13.0892C10.2641 13.4147 9.73651 13.4147 9.41107 13.0892L4.41107 8.08922C4.08563 7.76378 4.08563 7.23614 4.41107 6.9107Z" fill="currentColor" />
                          </svg>
                        </NavLink>

                        <div className={`transform overflow-hidden transition-all duration-200 ${!open && 'hidden'}`}>
                          <ul className="mt-2 mb-4 flex flex-col gap-1.5 pl-6">

                            {/* Assessment & Collection — FaFileInvoiceDollar */}
                            {(userDepartment === 'assessment' || isAdmin) && (
                              <li>
                                <NavLink
                                  to="/assessment-collection-dashboard-1"
                                  style={{ color: secondaryColor }}
                                  className={({ isActive }) =>
                                    `group relative flex items-center gap-3 rounded-md py-2.5 px-4 font-medium duration-200 ease-in-out hover:bg-[#FFF8E7]/50 ${isActive ? '!text-blue-700 bg-[#FFF8E7]' : ''}`
                                  }
                                >
                                  {({ isActive }) => (
                                    <>
                                      {isActive && <span style={activeIndicatorStyle}></span>}
                                      <FaFileInvoiceDollar size={16} className="flex-shrink-0" />
                                      <span>Assessment & Collection Dashboard</span>
                                    </>
                                  )}
                                </NavLink>
                              </li>
                            )}
                            {(userDepartment === 'assessment' || isAdmin) && (
                              <li>
                                <NavLink
                                  to="/a&c"
                                  style={{ color: secondaryColor }}
                                  className={({ isActive }) =>
                                    `group relative flex items-center gap-3 rounded-md py-2.5 px-4 font-medium duration-200 ease-in-out hover:bg-[#FFF8E7]/50 ${isActive ? '!text-blue-700 bg-[#FFF8E7]' : ''}`
                                  }
                                >
                                  {({ isActive }) => (
                                    <>
                                      {isActive && <span style={activeIndicatorStyle}></span>}
                                      <FaFileInvoiceDollar size={16} className="flex-shrink-0" />
                                      <span>Assessment & Collection Report</span>
                                    </>
                                  )}
                                </NavLink>
                              </li>
                            )}

                            {/* BUID — FaBarcode */}
                            {(userDepartment === 'buid' || isAdmin) && (
                              <li>
                                <NavLink
                                  to="/buid"
                                  style={{ color: secondaryColor }}
                                  className={({ isActive }) =>
                                    `group relative flex items-center gap-3 rounded-md py-2.5 px-4 font-medium duration-200 ease-in-out hover:bg-[#FFF8E7]/50 ${isActive ? '!text-blue-700 bg-[#FFF8E7]' : ''}`
                                  }
                                >
                                  {({ isActive }) => (
                                    <>
                                      {isActive && <span style={activeIndicatorStyle}></span>}
                                      <FaBarcode size={16} className="flex-shrink-0" />
                                      <span>BUID Department</span>
                                    </>
                                  )}
                                </NavLink>
                              </li>
                            )}
                            {(userDepartment === 'buid' || isAdmin) && (
                              <li>
                                <NavLink
                                  to="/Buid-Custom-Dashboard"
                                  style={{ color: secondaryColor }}
                                  className={({ isActive }) =>
                                    `group relative flex items-center gap-3 rounded-md py-2.5 px-4 font-medium duration-200 ease-in-out hover:bg-[#FFF8E7]/50 ${isActive ? '!text-blue-700 bg-[#FFF8E7]' : ''}`
                                  }
                                >
                                  {({ isActive }) => (
                                    <>
                                      {isActive && <span style={activeIndicatorStyle}></span>}
                                      <FaBarcode size={16} className="flex-shrink-0" />
                                      <span>BUID Report</span>
                                    </>
                                  )}
                                </NavLink>
                              </li>
                            )}

                            {/* Bridge — FaRoad */}
                            {(userDepartment === 'bridge' || isAdmin) && (
                              <li>
                                <NavLink
                                  to="/bridge-and-flyover"
                                  style={{ color: secondaryColor }}
                                  className={({ isActive }) =>
                                    `group relative flex items-center gap-3 rounded-md py-2.5 px-4 font-medium duration-200 ease-in-out hover:bg-[#FFF8E7]/50 ${isActive ? '!text-blue-700 bg-[#FFF8E7]' : ''}`
                                  }
                                >
                                  {({ isActive }) => (
                                    <>
                                      {isActive && <span style={activeIndicatorStyle}></span>}
                                      <FaRoad size={16} className="flex-shrink-0" />
                                      <span>Bridge Department</span>
                                    </>
                                  )}
                                </NavLink>
                              </li>
                            )}

                            {/* Fire Brigade — FaFireAlt */}
                            {(userDepartment === 'fire' || isAdmin) && (
                              <li>
                                <NavLink
                                  to="/fire-analytical"
                                  style={{ color: secondaryColor }}
                                  className={({ isActive }) =>
                                    `group relative flex items-center gap-3 rounded-md py-2.5 px-4 font-medium duration-200 ease-in-out hover:bg-[#FFF8E7]/50 ${isActive ? '!text-blue-700 bg-[#FFF8E7]' : ''}`
                                  }
                                >
                                  {({ isActive }) => (
                                    <>
                                      {isActive && <span style={activeIndicatorStyle}></span>}
                                      <FaFireAlt size={16} className="flex-shrink-0" />
                                      <span>Fire Brigade</span>
                                    </>
                                  )}
                                </NavLink>
                              </li>
                            )}

                            {/* Disaster — FaExclamationTriangle */}
                            {(userDepartment === 'disaster' || isAdmin) && (
                              <li>
                                <NavLink
                                  to="/disaster-dashboard"
                                  style={{ color: secondaryColor }}
                                  className={({ isActive }) =>
                                    `group relative flex items-center gap-3 rounded-md py-2.5 px-4 font-medium duration-200 ease-in-out hover:bg-[#FFF8E7]/50 ${isActive ? '!text-blue-700 bg-[#FFF8E7]' : ''}`
                                  }
                                >
                                  {({ isActive }) => (
                                    <>
                                      {isActive && <span style={activeIndicatorStyle}></span>}
                                      <FaExclamationTriangle size={16} className="flex-shrink-0" />
                                      <span>Disaster Dashboard</span>
                                    </>
                                  )}
                                </NavLink>
                              </li>
                            )}

                            {/* Hydraulic Engineering — FaWater */}
                            {(userDepartment === 'hydraulic' || isAdmin) && (
                              <li>
                                <NavLink
                                  to="/hydraulic"
                                  style={{ color: secondaryColor }}
                                  className={({ isActive }) =>
                                    `group relative flex items-center gap-3 rounded-md py-2.5 px-4 font-medium duration-200 ease-in-out hover:bg-[#FFF8E7]/50 ${isActive ? '!text-blue-700 bg-[#FFF8E7]' : ''}`
                                  }
                                >
                                  {({ isActive }) => (
                                    <>
                                      {isActive && <span style={activeIndicatorStyle}></span>}
                                      <FaWater size={16} className="flex-shrink-0" />
                                      <span>Hydraulic Engineering Department</span>
                                    </>
                                  )}
                                </NavLink>
                              </li>
                            )}

                            {/* Road — FaRoad */}
                            {(userDepartment === 'road' || isAdmin) && (
                              <li>
                                <NavLink
                                  to="/road-and-traffic"
                                  style={{ color: secondaryColor }}
                                  className={({ isActive }) =>
                                    `group relative flex items-center gap-3 rounded-md py-2.5 px-4 font-medium duration-200 ease-in-out hover:bg-[#FFF8E7]/50 ${isActive ? '!text-blue-700 bg-[#FFF8E7]' : ''}`
                                  }
                                >
                                  {({ isActive }) => (
                                    <>
                                      {isActive && <span style={activeIndicatorStyle}></span>}
                                      <FaRoad size={16} className="flex-shrink-0" />
                                      <span>Road and Traffic Department</span>
                                    </>
                                  )}
                                </NavLink>
                              </li>
                            )}

                            {/* Garden & Trees — FaTree */}
                            {(userDepartment === 'trees' || isAdmin) && (
                              <li>
                                <NavLink
                                  to="/treesandgarden"
                                  style={{ color: secondaryColor }}
                                  className={({ isActive }) =>
                                    `group relative flex items-center gap-3 rounded-md py-2.5 px-4 font-medium duration-200 ease-in-out hover:bg-[#FFF8E7]/50 ${isActive ? '!text-blue-700 bg-[#FFF8E7]' : ''}`
                                  }
                                >
                                  {({ isActive }) => (
                                    <>
                                      {isActive && <span style={activeIndicatorStyle}></span>}
                                      <FaTree size={16} className="flex-shrink-0" />
                                      <span>Garden Department</span>
                                    </>
                                  )}
                                </NavLink>
                              </li>
                            )}

                            {/* Development Planning — FaBuilding */}
                            {(userDepartment === 'developement' || isAdmin) && (
                              <li>
                                <NavLink
                                  to="/developement-planning"
                                  style={{ color: secondaryColor }}
                                  className={({ isActive }) =>
                                    `group relative flex items-center gap-3 rounded-md py-2.5 px-4 font-medium duration-200 ease-in-out hover:bg-[#FFF8E7]/50 ${isActive ? '!text-blue-700 bg-[#FFF8E7]' : ''}`
                                  }
                                >
                                  {({ isActive }) => (
                                    <>
                                      {isActive && <span style={activeIndicatorStyle}></span>}
                                      <FaBuilding size={16} className="flex-shrink-0" />
                                      <span>Development Planning</span>
                                    </>
                                  )}
                                </NavLink>
                              </li>
                            )}

                            {/* Environment — FaLeaf */}
                            {(userDepartment === 'environment' || isAdmin) && (
                              <li>
                                <NavLink
                                  to="/environment"
                                  style={{ color: secondaryColor }}
                                  className={({ isActive }) =>
                                    `group relative flex items-center gap-3 rounded-md py-2.5 px-4 font-medium duration-200 ease-in-out hover:bg-[#FFF8E7]/50 ${isActive ? '!text-blue-700 bg-[#FFF8E7]' : ''}`
                                  }
                                >
                                  {({ isActive }) => (
                                    <>
                                      {isActive && <span style={activeIndicatorStyle}></span>}
                                      <FaLeaf size={16} className="flex-shrink-0" />
                                      <span>Environment Department</span>
                                    </>
                                  )}
                                </NavLink>
                              </li>
                            )}

                            {/* Sewerage — MdWater */}
                            {(userDepartment === 'Sewerage' || isAdmin) && (
                              <li>
                                <NavLink
                                  to="/sewerage"
                                  style={{ color: secondaryColor }}
                                  className={({ isActive }) =>
                                    `group relative flex items-center gap-3 rounded-md py-2.5 px-4 font-medium duration-200 ease-in-out hover:bg-[#FFF8E7]/50 ${isActive ? '!text-blue-700 bg-[#FFF8E7]' : ''}`
                                  }
                                >
                                  {({ isActive }) => (
                                    <>
                                      {isActive && <span style={activeIndicatorStyle}></span>}
                                      <MdWater size={16} className="flex-shrink-0" />
                                      <span>Sewerage Operation Department</span>
                                    </>
                                  )}
                                </NavLink>
                              </li>
                            )}

                            {/* Storm Water Drainage — MdFlood */}
                            {(userDepartment === 'Storm' || isAdmin) && (
                              <li>
                                <NavLink
                                  to="/Storm-Water-Drainage"
                                  style={{ color: secondaryColor }}
                                  className={({ isActive }) =>
                                    `group relative flex items-center gap-3 rounded-md py-2.5 px-4 font-medium duration-200 ease-in-out hover:bg-[#FFF8E7]/50 ${isActive ? '!text-blue-700 bg-[#FFF8E7]' : ''}`
                                  }
                                >
                                  {({ isActive }) => (
                                    <>
                                      {isActive && <span style={activeIndicatorStyle}></span>}
                                      <MdFlood size={16} className="flex-shrink-0" />
                                      <span>Storm Water Drainage Department</span>
                                    </>
                                  )}
                                </NavLink>
                              </li>
                            )}

                            {/* Hydraulic Engineering (capital H tag) — FaWater */}
                            {(userDepartment === 'Hydraulic' || isAdmin) && (
                              <li>
                                <NavLink
                                  to="/Hydraulic-Engineering"
                                  style={{ color: secondaryColor }}
                                  className={({ isActive }) =>
                                    `group relative flex items-center gap-3 rounded-md py-2.5 px-4 font-medium duration-200 ease-in-out hover:bg-[#FFF8E7]/50 ${isActive ? '!text-blue-700 bg-[#FFF8E7]' : ''}`
                                  }
                                >
                                  {({ isActive }) => (
                                    <>
                                      {isActive && <span style={activeIndicatorStyle}></span>}
                                      <FaWater size={16} className="flex-shrink-0" />
                                      <span>Hydraulic Engineering Department</span>
                                    </>
                                  )}
                                </NavLink>
                              </li>
                            )}

                          </ul>
                        </div>
                      </React.Fragment>
                    );
                  }}
                </SidebarLinkGroup>
              )}
              {/* Masters Dropdown - Only for Super Admin */}
              {isAdmin && (
                <SidebarLinkGroup
                  activeCondition={
                    pathname === '/forms' || pathname.includes('forms')
                  }
                >
                  {(handleClick, open) => {
                    return (
                      <React.Fragment>
                        <NavLink
                          to="#"
                          className={`group relative flex items-center gap-3.5 rounded-lg py-3 px-4 font-medium text-base duration-200 ease-in-out hover:bg-[#FFF8E7] transition-all`}
                          onClick={(e) => {
                            e.preventDefault();
                            sidebarExpanded
                              ? handleClick()
                              : setSidebarExpanded(true);
                          }}
                        >
                          <svg
                            className="flex-shrink-0 transition-colors duration-200"
                            width="22"
                            height="22"
                            viewBox="0 0 18 18"
                            fill="none"
                            xmlns="http://www.w3.org/2000/svg"
                            style={{ color: secondaryColor }}
                          >
                            <path
                              d="M1.43425 7.5093H2.278C2.44675 7.5093 2.55925 7.3968 2.58737 7.31243L2.98112 6.32805H5.90612L6.27175 7.31243C6.328 7.48118 6.46862 7.5093 6.58112 7.5093H7.453C7.76237 7.48118 7.87487 7.25618 7.76237 7.03118L5.428 1.4343C5.37175 1.26555 5.3155 1.23743 5.14675 1.23743H3.88112C3.76862 1.23743 3.59987 1.29368 3.57175 1.4343L1.153 7.08743C1.0405 7.2843 1.20925 7.5093 1.43425 7.5093ZM4.47175 2.98118L5.3155 5.17493H3.59987L4.47175 2.98118Z"
                              fill="currentColor"
                            />
                            <path
                              d="M10.1249 2.5031H16.8749C17.2124 2.5031 17.5218 2.22185 17.5218 1.85623C17.5218 1.4906 17.2405 1.20935 16.8749 1.20935H10.1249C9.7874 1.20935 9.47803 1.4906 9.47803 1.85623C9.47803 2.22185 9.75928 2.5031 10.1249 2.5031Z"
                              fill="currentColor"
                            />
                            <path
                              d="M16.8749 6.21558H10.1249C9.7874 6.21558 9.47803 6.49683 9.47803 6.86245C9.47803 7.22808 9.75928 7.50933 10.1249 7.50933H16.8749C17.2124 7.50933 17.5218 7.22808 17.5218 6.86245C17.5218 6.49683 17.2124 6.21558 16.8749 6.21558Z"
                              fill="currentColor"
                            />
                            <path
                              d="M16.875 11.1656H1.77187C1.43438 11.1656 1.125 11.4469 1.125 11.8125C1.125 12.1781 1.40625 12.4594 1.77187 12.4594H16.875C17.2125 12.4594 17.5219 12.1781 17.5219 11.8125C17.5219 11.4469 17.2125 11.1656 16.875 11.1656Z"
                              fill="currentColor"
                            />
                            <path
                              d="M16.875 16.1156H1.77187C1.43438 16.1156 1.125 16.3969 1.125 16.7625C1.125 17.1281 1.40625 17.4094 1.77187 17.4094H16.875C17.2125 17.4094 17.5219 17.1281 17.5219 16.7625C17.5219 16.3969 17.2125 16.1156 16.875 16.1156Z"
                              fill="currentColor"
                            />
                          </svg>

                          <span
                            style={{ color: secondaryColor }}
                            className="flex-1 font-semibold transition-all duration-200 group-hover:text-[#a38818]"
                          >
                            Masters
                          </span>

                          <svg
                            className={`flex-shrink-0 transition-all duration-200 ${open && 'rotate-180'}`}
                            width="20"
                            height="20"
                            viewBox="0 0 20 20"
                            fill="none"
                            xmlns="http://www.w3.org/2000/svg"
                            style={{ color: secondaryColor }}
                          >
                            <path
                              fillRule="evenodd"
                              clipRule="evenodd"
                              d="M4.41107 6.9107C4.73651 6.58527 5.26414 6.58527 5.58958 6.9107L10.0003 11.3214L14.4111 6.91071C14.7365 6.58527 15.2641 6.58527 15.5896 6.91071C15.915 7.23614 15.915 7.76378 15.5896 8.08922L10.5896 13.0892C10.2641 13.4147 9.73651 13.4147 9.41107 13.0892L4.41107 8.08922C4.08563 7.76378 4.08563 7.23614 4.41107 6.9107Z"
                              fill="currentColor"
                            />
                          </svg>
                        </NavLink>

                        <div
                          className={`transform overflow-hidden transition-all duration-200 ${!open && 'hidden'}`}
                        >
                          <ul className="mt-2 mb-4 flex flex-col gap-1.5 pl-10">
                            <li>
                              <NavLink
                                to="/department"
                                style={{ color: secondaryColor }}
                                className={({ isActive }) =>
                                  `group relative flex items-center gap-3 rounded-md py-2.5 px-4 font-medium duration-200 ease-in-out hover:bg-[#FFF8E7]/50 ${isActive ? '!text-blue-700 bg-[#FFF8E7]' : ''}`
                                }
                              >
                                {({ isActive }) => (
                                  <>
                                    {isActive && (
                                      <span style={activeIndicatorStyle}></span>
                                    )}
                                    <span className="text-lg leading-none">
                                      •
                                    </span>
                                    <span>Department</span>
                                  </>
                                )}
                              </NavLink>
                            </li>
                            <li>
                              <NavLink
                                to="/role"
                                style={{ color: secondaryColor }}
                                className={({ isActive }) =>
                                  `group relative flex items-center gap-3 rounded-md py-2.5 px-4 font-medium duration-200 ease-in-out hover:bg-[#FFF8E7]/50 ${isActive ? '!text-blue-700 bg-[#FFF8E7]' : ''}`
                                }
                              >
                                {({ isActive }) => (
                                  <>
                                    {isActive && (
                                      <span style={activeIndicatorStyle}></span>
                                    )}
                                    <span className="text-lg leading-none">
                                      •
                                    </span>
                                    <span>Role</span>
                                  </>
                                )}
                              </NavLink>
                            </li>
                            <li>
                              <NavLink
                                to="/permission"
                                style={{ color: secondaryColor }}
                                className={({ isActive }) =>
                                  `group relative flex items-center gap-3 rounded-md py-2.5 px-4 font-medium duration-200 ease-in-out hover:bg-[#FFF8E7]/50 ${isActive ? '!text-blue-700 bg-[#FFF8E7]' : ''}`
                                }
                              >
                                {({ isActive }) => (
                                  <>
                                    {isActive && (
                                      <span style={activeIndicatorStyle}></span>
                                    )}
                                    <span className="text-lg leading-none">
                                      •
                                    </span>
                                    <span>Permission</span>
                                  </>
                                )}
                              </NavLink>
                            </li>
                            <li>
                              <NavLink
                                to="/users"
                                style={{ color: secondaryColor }}
                                className={({ isActive }) =>
                                  `group relative flex items-center gap-3 rounded-md py-2.5 px-4 font-medium duration-200 ease-in-out hover:bg-[#FFF8E7]/50 ${isActive ? '!text-blue-700 bg-[#FFF8E7]' : ''}`
                                }
                              >
                                {({ isActive }) => (
                                  <>
                                    {isActive && (
                                      <span style={activeIndicatorStyle}></span>
                                    )}
                                    <span className="text-lg leading-none">
                                      •
                                    </span>
                                    <span>Users</span>
                                  </>
                                )}
                              </NavLink>
                            </li>
                            <li>
                              <NavLink
                                to="/Login-logs"
                                style={{ color: secondaryColor }}
                                className={({ isActive }) =>
                                  `group relative flex items-center gap-3 rounded-md py-2.5 px-4 font-medium duration-200 ease-in-out hover:bg-[#FFF8E7]/50 ${isActive ? '!text-blue-700 bg-[#FFF8E7]' : ''}`
                                }
                              >
                                {({ isActive }) => (
                                  <>
                                    {isActive && (
                                      <span style={activeIndicatorStyle}></span>
                                    )}
                                    <span className="text-lg leading-none">
                                      •
                                    </span>
                                    <span>Login Logs</span>
                                  </>
                                )}
                              </NavLink>
                            </li>
                            <li>
                              <NavLink
                                to="/layer-mapping"
                                style={{ color: secondaryColor }}
                                className={({ isActive }) =>
                                  `group relative flex items-center gap-3 rounded-md py-2.5 px-4 font-medium duration-200 ease-in-out hover:bg-[#FFF8E7]/50 ${isActive ? '!text-blue-700 bg-[#FFF8E7]' : ''}`
                                }
                              >
                                {({ isActive }) => (
                                  <>
                                    {isActive && (
                                      <span style={activeIndicatorStyle}></span>
                                    )}
                                    <span className="text-lg leading-none">
                                      •
                                    </span>
                                    <span>Department Layer Mapping (Mobile)</span>
                                  </>
                                )}
                              </NavLink>
                            </li>
                          </ul>
                        </div>
                      </React.Fragment>
                    );
                  }}
                </SidebarLinkGroup>
              )}

              {/* Masters Dropdown - Only for Super Admin */}
              {
                <SidebarLinkGroup
                  activeCondition={
                    pathname === '/projects' || pathname.includes('projects')
                  }
                >
                  {(handleClick, open) => {
                    return (
                      <React.Fragment>
                        <NavLink
                          to="#"
                          className={`group relative flex items-center gap-3.5 rounded-lg py-3 px-4 font-medium text-base duration-200 ease-in-out hover:bg-[#FFF8E7] transition-all`}
                          onClick={(e) => {
                            e.preventDefault();
                            sidebarExpanded
                              ? handleClick()
                              : setSidebarExpanded(true);
                          }}
                        >
                          <svg
                            className="flex-shrink-0 transition-colors duration-200 group-hover:text-[#a38818]"
                            width="22"
                            height="22"
                            viewBox="0 0 24 24"
                            fill="none"
                            xmlns="http://www.w3.org/2000/svg"
                            style={{ color: secondaryColor }}
                          >
                            <path
                              d="M22 19C22 19.5304 21.7893 20.0391 21.4142 20.4142C21.0391 20.7893 20.5304 21 20 21H4C3.46957 21 2.96086 20.7893 2.58579 20.4142C2.21071 20.0391 2 19.5304 2 19V5C2 4.46957 2.21071 3.96086 2.58579 3.58579C2.96086 3.21071 3.46957 3 4 3H9L11 6H20C20.5304 6 21.0391 6.21071 21.4142 6.58579C21.7893 6.96086 22 7.46957 22 8V19Z"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>

                          <span
                            style={{ color: secondaryColor }}
                            className="flex-1 font-semibold transition-all duration-200 group-hover:text-[#a38818]"
                          >
                            Data Validation Requests
                          </span>

                          <svg
                            className={`flex-shrink-0 transition-all duration-200 ${open && 'rotate-180'}`}
                            width="20"
                            height="20"
                            viewBox="0 0 20 20"
                            fill="none"
                            xmlns="http://www.w3.org/2000/svg"
                            style={{ color: secondaryColor }}
                          >
                            <path
                              fillRule="evenodd"
                              clipRule="evenodd"
                              d="M4.41107 6.9107C4.73651 6.58527 5.26414 6.58527 5.58958 6.9107L10.0003 11.3214L14.4111 6.91071C14.7365 6.58527 15.2641 6.58527 15.5896 6.91071C15.915 7.23614 15.915 7.76378 15.5896 8.08922L10.5896 13.0892C10.2641 13.4147 9.73651 13.4147 9.41107 13.0892L4.41107 8.08922C4.08563 7.76378 4.08563 7.23614 4.41107 6.9107Z"
                              fill="currentColor"
                            />
                          </svg>
                        </NavLink>

                        <div
                          className={`transform overflow-hidden transition-all duration-200 ${!open && 'hidden'}`}
                        >
                          <ul className="mt-2 mb-4 flex flex-col gap-1.5 pl-10">
                            <li>
                              <NavLink
                                to="/projects"
                                style={{ color: secondaryColor }}
                                className={({ isActive }) =>
                                  `group relative flex items-center gap-3 rounded-md py-2.5 px-4 font-medium duration-200 ease-in-out hover:bg-[#FFF8E7]/50 ${isActive ? '!text-blue-700 bg-[#FFF8E7]' : ''}`
                                }
                              >
                                {({ isActive }) => (
                                  <>
                                    {isActive && (
                                      <span style={activeIndicatorStyle}></span>
                                    )}
                                    <span className="text-lg leading-none">
                                      •
                                    </span>
                                    <span>Pending</span>
                                  </>
                                )}
                              </NavLink>
                            </li>
                            <li>
                              <NavLink
                                to="/projects-approved"
                                style={{ color: secondaryColor }}
                                className={({ isActive }) =>
                                  `group relative flex items-center gap-3 rounded-md py-2.5 px-4 font-medium duration-200 ease-in-out hover:bg-[#FFF8E7]/50 ${isActive ? '!text-blue-700 bg-[#FFF8E7]' : ''}`
                                }
                              >
                                {({ isActive }) => (
                                  <>
                                    {isActive && (
                                      <span style={activeIndicatorStyle}></span>
                                    )}
                                    <span className="text-lg leading-none">
                                      •
                                    </span>
                                    <span>Approved</span>
                                  </>
                                )}
                              </NavLink>
                            </li>
                            <li>
                              <NavLink
                                to="/rejected-projects"
                                style={{ color: secondaryColor }}
                                className={({ isActive }) =>
                                  `group relative flex items-center gap-3 rounded-md py-2.5 px-4 font-medium duration-200 ease-in-out hover:bg-[#FFF8E7]/50 ${isActive ? '!text-blue-700 bg-[#FFF8E7]' : ''}`
                                }
                              >
                                {({ isActive }) => (
                                  <>
                                    {isActive && (
                                      <span style={activeIndicatorStyle}></span>
                                    )}
                                    <span className="text-lg leading-none">
                                      •
                                    </span>
                                    <span>Rejected</span>
                                  </>
                                )}
                              </NavLink>
                            </li>
                            <li>
                              <NavLink
                                to="/projects/returned-to-l1"
                                style={{ color: secondaryColor }}
                                className={({ isActive }) =>
                                  `group relative flex items-center gap-3 rounded-md py-2.5 px-4 font-medium duration-200 ease-in-out hover:bg-[#FFF8E7]/50 ${isActive ? '!text-blue-700 bg-[#FFF8E7]' : ''}`
                                }
                              >
                                {({ isActive }) => (
                                  <>
                                    {isActive && (
                                      <span style={activeIndicatorStyle}></span>
                                    )}
                                    <span className="text-lg leading-none">
                                      •
                                    </span>
                                    <span>Returned for Correction</span>
                                  </>
                                )}
                              </NavLink>
                            </li>
                            <li>
                              <NavLink
                                to="/projects/pending-changes"
                                style={{ color: secondaryColor }}
                                className={({ isActive }) =>
                                  `group relative flex items-center gap-3 rounded-md py-2.5 px-4 font-medium duration-200 ease-in-out hover:bg-[#FFF8E7]/50 ${isActive ? '!text-blue-700 bg-[#FFF8E7]' : ''}`
                                }
                              >
                                {({ isActive }) => (
                                  <>
                                    {isActive && (
                                      <span style={activeIndicatorStyle}></span>
                                    )}
                                    <span className="text-lg leading-none">
                                      •
                                    </span>
                                    <span>Corrections Submitted</span>
                                  </>
                                )}
                              </NavLink>
                            </li>
                            <li>
                              <NavLink
                                to="/project-dash"
                                style={{ color: secondaryColor }}
                                className={({ isActive }) =>
                                  `group relative flex items-center gap-3 rounded-md py-2.5 px-4 font-medium duration-200 ease-in-out hover:bg-[#FFF8E7]/50 ${isActive ? '!text-blue-700 bg-[#FFF8E7]' : ''}`
                                }
                              >
                                {({ isActive }) => (
                                  <>
                                    {isActive && (
                                      <span style={activeIndicatorStyle}></span>
                                    )}
                                    <span className="text-lg leading-none">
                                      •
                                    </span>
                                    <span>Reports</span>
                                  </>
                                )}
                              </NavLink>
                            </li>
                          </ul>
                        </div>
                      </React.Fragment>
                    );
                  }}
                </SidebarLinkGroup>
              }

              {/* Assessment Scheduling Dropdown */}
              {(isAdmin || (userDepartment === 'assessment' && parsedUser?.designation_level === 3)) && (
                <SidebarLinkGroup
                  activeCondition={
                    pathname === '/assessment-scheduling' || pathname === '/assessment-tracking'
                  }
                >
                  {(handleClick, open) => {
                    return (
                      <React.Fragment>
                        <NavLink
                          to="#"
                          className={`group relative flex items-center gap-3.5 rounded-lg py-3 px-4 font-medium text-base duration-200 ease-in-out hover:bg-[#FFF8E7] transition-all`}
                          onClick={(e) => {
                            e.preventDefault();
                            sidebarExpanded
                              ? handleClick()
                              : setSidebarExpanded(true);
                          }}
                        >
                          <FaCalendarAlt size={16} className="flex-shrink-0 group-hover:text-[#a38818]" style={{ color: secondaryColor }} />
                          <span
                            style={{ color: secondaryColor }}
                            className="flex-1 font-semibold transition-all duration-200 group-hover:text-[#a38818]"
                          >
                            Assessment Scheduling
                          </span>

                          <svg
                            className={`flex-shrink-0 transition-all duration-200 ${open && 'rotate-180'}`}
                            width="20"
                            height="20"
                            viewBox="0 0 20 20"
                            fill="none"
                            xmlns="http://www.w3.org/2000/svg"
                            style={{ color: secondaryColor }}
                          >
                            <path
                              fillRule="evenodd"
                              clipRule="evenodd"
                              d="M4.41107 6.9107C4.73651 6.58527 5.26414 6.58527 5.58958 6.9107L10.0003 11.3214L14.4111 6.91071C14.7365 6.58527 15.2641 6.58527 15.5896 6.91071C15.915 7.23614 15.915 7.76378 15.5896 8.08922L10.5896 13.0892C10.2641 13.4147 9.73651 13.4147 9.41107 13.0892L4.41107 8.08922C4.08563 7.76378 4.08563 7.23614 4.41107 6.9107Z"
                              fill="currentColor"
                            />
                          </svg>
                        </NavLink>

                        <div
                          className={`transform overflow-hidden transition-all duration-200 ${!open && 'hidden'}`}
                        >
                          <ul className="mt-2 mb-4 flex flex-col gap-1.5 pl-10">
                            <li>
                              <NavLink
                                to="/assessment-scheduling"
                                style={{ color: secondaryColor }}
                                className={({ isActive }) =>
                                  `group relative flex items-center gap-3 rounded-md py-2.5 px-4 font-medium duration-200 ease-in-out hover:bg-[#FFF8E7]/50 ${isActive ? '!text-blue-700 bg-[#FFF8E7]' : ''}`
                                }
                              >
                                {({ isActive }) => (
                                  <>
                                    {isActive && (
                                      <span style={activeIndicatorStyle}></span>
                                    )}
                                    <span className="text-lg leading-none">
                                      •
                                    </span>
                                    <span>Schedule Assessment</span>
                                  </>
                                )}
                              </NavLink>
                            </li>
                            <li>
                              <NavLink
                                to="/assessment-tracking"
                                style={{ color: secondaryColor }}
                                className={({ isActive }) =>
                                  `group relative flex items-center gap-3 rounded-md py-2.5 px-4 font-medium duration-200 ease-in-out hover:bg-[#FFF8E7]/50 ${isActive ? '!text-blue-700 bg-[#FFF8E7]' : ''}`
                                }
                              >
                                {({ isActive }) => (
                                  <>
                                    {isActive && (
                                      <span style={activeIndicatorStyle}></span>
                                    )}
                                    <span className="text-lg leading-none">
                                      •
                                    </span>
                                    <span>Tracking Dashboard</span>
                                  </>
                                )}
                              </NavLink>
                            </li>
                          </ul>
                        </div>
                      </React.Fragment>
                    );
                  }}
                </SidebarLinkGroup>
              )}

              {/* Layer Status Monitor - Super Admin Only */}
              {userRole === 'super admin' && (
                <li>
                  <NavLink
                    to="/layer-status"
                    className={`group relative flex items-center gap-3.5 rounded-lg py-3 px-4 font-medium text-base duration-200 ease-in-out hover:bg-[#FFF8E7] transition-all`}
                  >
                    {({ isActive }) => (
                      <>
                        {isActive && <span style={activeIndicatorStyle}></span>}
                        <svg
                          className="flex-shrink-0 transition-colors duration-200 group-hover:text-[#a38818]"
                          width="22"
                          height="22"
                          viewBox="0 0 24 24"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                          style={{ color: secondaryColor }}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                            stroke="currentColor"
                          />
                        </svg>

                        <span
                          style={{ color: secondaryColor }}
                          className="flex-1 font-semibold transition-all duration-200 group-hover:text-[#a38818]"
                        >
                          Layer Status Monitor
                        </span>
                      </>
                    )}
                  </NavLink>
                </li>
              )}

              {/* data validation requests reports */}
              {/* <li>
                <NavLink
                  to="/project-dash"
                  className={`group relative flex items-center gap-3.5 rounded-lg py-3 px-4 font-medium text-base duration-200 ease-in-out hover:bg-[#FFF8E7] transition-all`}
                >
                  {({ isActive }) => (
                    <>
                      {isActive && <span style={activeIndicatorStyle}></span>}
                      <svg
                        className="flex-shrink-0 transition-colors duration-200"
                        width="22"
                        height="22"
                        viewBox="0 0 18 19"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                        style={{ color: secondaryColor }}
                      >
                        <g clipPath="url(#clip0_130_9801)">
                          <path
                            d="M10.8563 0.55835C10.5188 0.55835 10.2095 0.8396 10.2095 1.20522V6.83022C10.2095 7.16773 10.4907 7.4771 10.8563 7.4771H16.8751C17.0438 7.4771 17.2126 7.39272 17.3251 7.28022C17.4376 7.1396 17.4938 6.97085 17.4938 6.8021C17.2688 3.28647 14.3438 0.55835 10.8563 0.55835ZM11.4751 6.15522V1.8521C13.8095 2.13335 15.6938 3.8771 16.1438 6.18335H11.4751V6.15522Z"
                            fill="currentColor"
                          />
                          <path
                            d="M15.3845 8.7427H9.1126V2.69582C9.1126 2.35832 8.83135 2.07707 8.49385 2.07707C8.40947 2.07707 8.3251 2.07707 8.24072 2.07707C3.96572 2.04895 0.506348 5.53645 0.506348 9.81145C0.506348 14.0864 3.99385 17.5739 8.26885 17.5739C12.5438 17.5739 16.0313 14.0864 16.0313 9.81145C16.0313 9.6427 16.0313 9.47395 16.0032 9.33332C16.0032 8.99582 15.722 8.7427 15.3845 8.7427ZM8.26885 16.3083C4.66885 16.3083 1.77197 13.4114 1.77197 9.81145C1.77197 6.3802 4.47197 3.53957 7.8751 3.3427V9.36145C7.8751 9.69895 8.15635 10.0083 8.52197 10.0083H14.7938C14.6813 13.4958 11.7845 16.3083 8.26885 16.3083Z"
                            fill="currentColor"
                          />
                        </g>
                        <defs>
                          <clipPath id="clip0_130_9801">
                            <rect
                              width="18"
                              height="18"
                              fill="white"
                              transform="translate(0 0.052124)"
                            />
                          </clipPath>
                        </defs>
                      </svg>

                      <span
                        style={{ color: secondaryColor }}
                        className="flex-1 font-semibold transition-all duration-200 group-hover:text-[#a38818]"
                      >
                        Data Validation Requests Reports
                      </span>
                    </>
                  )}
                </NavLink>
              </li> */}

              {/* Map Link */}
              <li>
                <NavLink
                  to="/map"
                  style={{ color: secondaryColor }}
                  className={`group relative flex items-center gap-3.5 rounded-lg py-3 px-4 font-medium text-base duration-200 ease-in-out hover:bg-[#FFF8E7] transition-all`}
                >
                  {({ isActive }) => (
                    <>
                      {isActive && <span style={activeIndicatorStyle}></span>}
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        width="22"
                        height="22"
                        className="flex-shrink-0 transition-colors duration-200"
                      >
                        <path
                          fill="currentColor"
                          d="M4 6.143v12.824l5.065-2.17l6 3L20 17.68V4.857l1.303-.558a.5.5 0 0 1 .697.46V19l-7 3l-6-3l-6.303 2.701a.5.5 0 0 1-.697-.46V7zm12.243 5.1L12 15.485l-4.243-4.242a6 6 0 1 1 8.486 0M12 12.657l2.828-2.829a4 4 0 1 0-5.656 0z"
                        />
                      </svg>

                      <span
                        style={{ color: secondaryColor }}
                        className="flex-1 font-semibold transition-all duration-200 group-hover:text-[#a38818]"
                      >
                        Map
                      </span>
                    </>
                  )}
                </NavLink>
              </li>

              <li>
                <NavLink
                  to="/messages"
                  style={{ color: secondaryColor }}
                  className={`group relative flex items-center gap-3.5 rounded-lg py-3 px-4 font-medium text-base duration-200 ease-in-out hover:bg-[#FFF8E7] transition-all`}
                >
                  {({ isActive }) => (
                    <>
                      {isActive && <span style={activeIndicatorStyle}></span>}
                      <svg
                        className="flex-shrink-0 transition-colors duration-200"
                        width="22"
                        height="22"
                        viewBox="0 0 24 24"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          d="M7 8H17M7 12H14M21 12C21 7.582 16.97 4 12 4C7.03 4 3 7.582 3 12C3 16.418 7.03 20 12 20C13.354 20 14.646 19.77 15.828 19.34L20 21L18.66 16.828C19.77 15.646 21 14.081 21 12Z"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>

                      <span
                        style={{ color: secondaryColor }}
                        className="flex-1 font-semibold transition-all duration-200 group-hover:text-[#a38818]"
                      >
                        Live Chat
                      </span>
                    </>
                  )}
                </NavLink>
              </li>
              <li>
                <NavLink
                  to="/inbox"
                  style={{ color: secondaryColor }}
                  className={`group relative flex items-center gap-3.5 rounded-lg py-3 px-4 font-medium text-base duration-200 ease-in-out hover:bg-[#FFF8E7] transition-all`}
                >
                  {({ isActive }) => (
                    <>
                      {isActive && <span style={activeIndicatorStyle}></span>}
                      <svg
                        className="flex-shrink-0 transition-colors duration-200"
                        width="22"
                        height="22"
                        viewBox="0 0 24 24"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          d="M7 8H17M7 12H14M21 12C21 7.582 16.97 4 12 4C7.03 4 3 7.582 3 12C3 16.418 7.03 20 12 20C13.354 20 14.646 19.77 15.828 19.34L20 21L18.66 16.828C19.77 15.646 21 14.081 21 12Z"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>

                      <span
                        style={{ color: secondaryColor }}
                        className="flex-1 font-semibold transition-all duration-200 group-hover:text-[#a38818]"
                      >
                        Mail
                      </span>
                    </>
                  )}
                </NavLink>
              </li>

              {/* Service Request */}
              <li>
                <NavLink
                  to="/service-request"
                  className={`group relative flex items-center gap-3.5 rounded-lg py-3 px-4 font-medium text-base duration-200 ease-in-out hover:bg-[#FFF8E7] transition-all`}
                >
                  {({ isActive }) => (
                    <>
                      {isActive && <span style={activeIndicatorStyle}></span>}
                      <svg
                        className="flex-shrink-0 transition-colors duration-200"
                        width="22"
                        height="22"
                        viewBox="0 0 18 19"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                        style={{ color: secondaryColor }}
                      >
                        <g clipPath="url(#clip0_130_9801)">
                          <path
                            d="M10.8563 0.55835C10.5188 0.55835 10.2095 0.8396 10.2095 1.20522V6.83022C10.2095 7.16773 10.4907 7.4771 10.8563 7.4771H16.8751C17.0438 7.4771 17.2126 7.39272 17.3251 7.28022C17.4376 7.1396 17.4938 6.97085 17.4938 6.8021C17.2688 3.28647 14.3438 0.55835 10.8563 0.55835ZM11.4751 6.15522V1.8521C13.8095 2.13335 15.6938 3.8771 16.1438 6.18335H11.4751V6.15522Z"
                            fill="currentColor"
                          />
                          <path
                            d="M15.3845 8.7427H9.1126V2.69582C9.1126 2.35832 8.83135 2.07707 8.49385 2.07707C8.40947 2.07707 8.3251 2.07707 8.24072 2.07707C3.96572 2.04895 0.506348 5.53645 0.506348 9.81145C0.506348 14.0864 3.99385 17.5739 8.26885 17.5739C12.5438 17.5739 16.0313 14.0864 16.0313 9.81145C16.0313 9.6427 16.0313 9.47395 16.0032 9.33332C16.0032 8.99582 15.722 8.7427 15.3845 8.7427ZM8.26885 16.3083C4.66885 16.3083 1.77197 13.4114 1.77197 9.81145C1.77197 6.3802 4.47197 3.53957 7.8751 3.3427V9.36145C7.8751 9.69895 8.15635 10.0083 8.52197 10.0083H14.7938C14.6813 13.4958 11.7845 16.3083 8.26885 16.3083Z"
                            fill="currentColor"
                          />
                        </g>
                        <defs>
                          <clipPath id="clip0_130_9801">
                            <rect
                              width="18"
                              height="18"
                              fill="white"
                              transform="translate(0 0.052124)"
                            />
                          </clipPath>
                        </defs>
                      </svg>

                      <span
                        style={{ color: secondaryColor }}
                        className="flex-1 font-semibold transition-all duration-200 group-hover:text-[#a38818]"
                      >
                        Service Request
                      </span>
                    </>
                  )}
                </NavLink>
              </li>

              <li>
                <NavLink
                  to="/Tools-Tutorial"
                  className={`group relative flex items-center gap-3.5 rounded-lg py-3 px-4 font-medium text-base duration-200 ease-in-out hover:bg-[#FFF8E7] transition-all`}
                >
                  {({ isActive }) => (
                    <>
                      {isActive && <span style={activeIndicatorStyle}></span>}
                      <svg
                        className="flex-shrink-0 transition-colors duration-200"
                        width="22"
                        height="22"
                        viewBox="0 0 18 19"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                        style={{ color: secondaryColor }}
                      >
                        <g clipPath="url(#clip0_130_9801)">
                          <path
                            d="M10.8563 0.55835C10.5188 0.55835 10.2095 0.8396 10.2095 1.20522V6.83022C10.2095 7.16773 10.4907 7.4771 10.8563 7.4771H16.8751C17.0438 7.4771 17.2126 7.39272 17.3251 7.28022C17.4376 7.1396 17.4938 6.97085 17.4938 6.8021C17.2688 3.28647 14.3438 0.55835 10.8563 0.55835ZM11.4751 6.15522V1.8521C13.8095 2.13335 15.6938 3.8771 16.1438 6.18335H11.4751V6.15522Z"
                            fill="currentColor"
                          />
                          <path
                            d="M15.3845 8.7427H9.1126V2.69582C9.1126 2.35832 8.83135 2.07707 8.49385 2.07707C8.40947 2.07707 8.3251 2.07707 8.24072 2.07707C3.96572 2.04895 0.506348 5.53645 0.506348 9.81145C0.506348 14.0864 3.99385 17.5739 8.26885 17.5739C12.5438 17.5739 16.0313 14.0864 16.0313 9.81145C16.0313 9.6427 16.0313 9.47395 16.0032 9.33332C16.0032 8.99582 15.722 8.7427 15.3845 8.7427ZM8.26885 16.3083C4.66885 16.3083 1.77197 13.4114 1.77197 9.81145C1.77197 6.3802 4.47197 3.53957 7.8751 3.3427V9.36145C7.8751 9.69895 8.15635 10.0083 8.52197 10.0083H14.7938C14.6813 13.4958 11.7845 16.3083 8.26885 16.3083Z"
                            fill="currentColor"
                          />
                        </g>
                        <defs>
                          <clipPath id="clip0_130_9801">
                            <rect
                              width="18"
                              height="18"
                              fill="white"
                              transform="translate(0 0.052124)"
                            />
                          </clipPath>
                        </defs>
                      </svg>

                      <span
                        style={{ color: secondaryColor }}
                        className="flex-1 font-semibold transition-all duration-200 group-hover:text-[#a38818]"
                      >
                        Tools Tutorial Manual
                      </span>
                    </>
                  )}
                </NavLink>
              </li>

              {/* My Profile */}
              <li>
                <NavLink
                  to="/settings"
                  style={{ color: secondaryColor }}
                  className={`group relative flex items-center gap-3.5 rounded-lg py-3 px-4 font-medium text-base duration-200 ease-in-out hover:bg-[#FFF8E7] transition-all`}
                >
                  {({ isActive }) => (
                    <>
                      {isActive && <span style={activeIndicatorStyle}></span>}
                      <svg
                        className="flex-shrink-0 transition-colors duration-200"
                        width="22"
                        height="22"
                        viewBox="0 0 18 19"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <g clipPath="url(#clip0_130_9763)">
                          <path
                            d="M17.0721 7.30835C16.7909 6.99897 16.3971 6.83022 15.9752 6.83022H15.8909C15.7502 6.83022 15.6377 6.74585 15.6096 6.63335C15.5815 6.52085 15.5252 6.43647 15.4971 6.32397C15.4409 6.21147 15.4971 6.09897 15.5815 6.0146L15.6377 5.95835C15.9471 5.6771 16.1159 5.28335 16.1159 4.86147C16.1159 4.4396 15.9752 4.04585 15.6659 3.73647L14.569 2.61147C13.9784 1.99272 12.9659 1.9646 12.3471 2.58335L12.2627 2.6396C12.1784 2.72397 12.0377 2.7521 11.8971 2.69585C11.7846 2.6396 11.6721 2.58335 11.5315 2.55522C11.3909 2.49897 11.3065 2.38647 11.3065 2.27397V2.13335C11.3065 1.26147 10.6034 0.55835 9.73148 0.55835H8.15648C7.7346 0.55835 7.34085 0.7271 7.0596 1.00835C6.75023 1.31772 6.6096 1.71147 6.6096 2.10522V2.21772C6.6096 2.33022 6.52523 2.44272 6.41273 2.49897C6.35648 2.5271 6.32835 2.5271 6.2721 2.55522C6.1596 2.61147 6.01898 2.58335 5.9346 2.49897L5.87835 2.4146C5.5971 2.10522 5.20335 1.93647 4.78148 1.93647C4.3596 1.93647 3.96585 2.0771 3.65648 2.38647L2.53148 3.48335C1.91273 4.07397 1.8846 5.08647 2.50335 5.70522L2.5596 5.7896C2.64398 5.87397 2.6721 6.0146 2.61585 6.09897C2.5596 6.21147 2.53148 6.29585 2.47523 6.40835C2.41898 6.52085 2.3346 6.5771 2.19398 6.5771H2.1096C1.68773 6.5771 1.29398 6.71772 0.984604 7.0271C0.675229 7.30835 0.506479 7.7021 0.506479 8.12397L0.478354 9.69897C0.450229 10.5708 1.15335 11.274 2.02523 11.3021H2.1096C2.25023 11.3021 2.36273 11.3865 2.39085 11.499C2.4471 11.5833 2.50335 11.6677 2.53148 11.7802C2.5596 11.8927 2.53148 12.0052 2.4471 12.0896L2.39085 12.1458C2.08148 12.4271 1.91273 12.8208 1.91273 13.2427C1.91273 13.6646 2.05335 14.0583 2.36273 14.3677L3.4596 15.4927C4.05023 16.1115 5.06273 16.1396 5.68148 15.5208L5.76585 15.4646C5.85023 15.3802 5.99085 15.3521 6.13148 15.4083C6.24398 15.4646 6.35648 15.5208 6.4971 15.549C6.63773 15.6052 6.7221 15.7177 6.7221 15.8302V15.9427C6.7221 16.8146 7.42523 17.5177 8.2971 17.5177H9.8721C10.744 17.5177 11.4471 16.8146 11.4471 15.9427V15.8302C11.4471 15.7177 11.5315 15.6052 11.644 15.549C11.7002 15.5208 11.7284 15.5208 11.7846 15.4927C11.9252 15.4365 12.0377 15.4646 12.1221 15.549L12.1784 15.6333C12.4596 15.9427 12.8534 16.1115 13.2752 16.1115C13.6971 16.1115 14.0909 15.9708 14.4002 15.6615L15.5252 14.5646C16.144 13.974 16.1721 12.9615 15.5534 12.3427L15.4971 12.2583C15.4127 12.174 15.3846 12.0333 15.4409 11.949C15.4971 11.8365 15.5252 11.7521 15.5815 11.6396C15.6377 11.5271 15.7502 11.4708 15.8627 11.4708H15.9471H15.9752C16.819 11.4708 17.5221 10.7958 17.5502 9.92397L17.5784 8.34897C17.5221 8.01147 17.3534 7.5896 17.0721 7.30835Z"
                            fill="currentColor"
                          />
                          <path
                            d="M9.00029 5.22705C6.89092 5.22705 5.17529 6.94268 5.17529 9.05205C5.17529 11.1614 6.89092 12.8771 9.00029 12.8771C11.1097 12.8771 12.8253 11.1614 12.8253 9.05205C12.8253 6.94268 11.1097 5.22705 9.00029 5.22705ZM9.00029 11.6114C7.59404 11.6114 6.44092 10.4583 6.44092 9.05205C6.44092 7.6458 7.59404 6.49268 9.00029 6.49268C10.4065 6.49268 11.5597 7.6458 11.5597 9.05205C11.5597 10.4583 10.4065 11.6114 9.00029 11.6114Z"
                            fill="currentColor"
                          />
                        </g>
                        <defs>
                          <clipPath id="clip0_130_9763">
                            <rect
                              width="18"
                              height="18"
                              fill="white"
                              transform="translate(0 0.052124)"
                            />
                          </clipPath>
                        </defs>
                      </svg>

                      <span
                        style={{ color: secondaryColor }}
                        className="flex-1 font-semibold transition-all duration-200 group-hover:text-[#a38818]"
                      >
                        My Profile
                      </span>
                    </>
                  )}
                </NavLink>
              </li>
              {/* User Dropdown */}
              <SidebarLinkGroup activeCondition={true}>
                {(handleClick, open) => {
                  return (
                    <React.Fragment>
                      <NavLink
                        to="#"
                        className={`group relative flex items-center gap-3.5 rounded-lg py-3 px-4 font-medium text-base duration-200 ease-in-out hover:bg-[#FFF8E7] transition-all`}
                        onClick={(e) => {
                          e.preventDefault();
                          sidebarExpanded
                            ? handleClick()
                            : setSidebarExpanded(true);
                        }}
                      >
                        <svg
                          className="flex-shrink-0 transition-colors duration-200"
                          width="22"
                          height="22"
                          viewBox="0 0 22 22"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                          style={{ color: secondaryColor }}
                        >
                          <path
                            d="M11 9.62499C8.42188 9.62499 6.35938 7.59687 6.35938 5.12187C6.35938 2.64687 8.42188 0.618744 11 0.618744C13.5781 0.618744 15.6406 2.64687 15.6406 5.12187C15.6406 7.59687 13.5781 9.62499 11 9.62499ZM11 2.16562C9.28125 2.16562 7.90625 3.50624 7.90625 5.12187C7.90625 6.73749 9.28125 8.07812 11 8.07812C12.7188 8.07812 14.0938 6.73749 14.0938 5.12187C14.0938 3.50624 12.7188 2.16562 11 2.16562Z"
                            fill="currentColor"
                          />
                          <path
                            d="M17.7719 21.4156H4.2281C3.5406 21.4156 2.9906 20.8656 2.9906 20.1781V17.0844C2.9906 13.7156 5.7406 10.9656 9.10935 10.9656H12.925C16.2937 10.9656 19.0437 13.7156 19.0437 17.0844V20.1781C19.0094 20.8312 18.4594 21.4156 17.7719 21.4156ZM4.53748 19.8687H17.4969V17.0844C17.4969 14.575 15.4344 12.5125 12.925 12.5125H9.07498C6.5656 12.5125 4.5031 14.575 4.5031 17.0844V19.8687H4.53748Z"
                            fill="currentColor"
                          />
                        </svg>

                        <span
                          style={{ color: secondaryColor }}
                          className="flex-1 font-semibold transition-all duration-200 group-hover:text-[#a38818]"
                        >
                          User
                        </span>

                        <svg
                          className={`flex-shrink-0 transition-all duration-200 ${open && 'rotate-180'}`}
                          width="20"
                          height="20"
                          viewBox="0 0 20 20"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                          style={{ color: secondaryColor }}
                        >
                          <path
                            fillRule="evenodd"
                            clipRule="evenodd"
                            d="M4.41107 6.9107C4.73651 6.58527 5.26414 6.58527 5.58958 6.9107L10.0003 11.3214L14.4111 6.91071C14.7365 6.58527 15.2641 6.58527 15.5896 6.91071C15.915 7.23614 15.915 7.76378 15.5896 8.08922L10.5896 13.0892C10.2641 13.4147 9.73651 13.4147 9.41107 13.0892L4.41107 8.08922C4.08563 7.76378 4.08563 7.23614 4.41107 6.9107Z"
                            fill="currentColor"
                          />
                        </svg>
                      </NavLink>

                      <div
                        className={`transform overflow-hidden transition-all duration-200 ${!open && 'hidden'}`}
                      >
                        <ul className="mt-2 mb-4 flex flex-col gap-1.5 pl-10">
                          <li>
                            <NavLink
                              to="/settings"
                              style={{ color: secondaryColor }}
                              className={({ isActive }) =>
                                `group relative flex items-center gap-3 rounded-md py-2.5 px-4 font-medium duration-200 ease-in-out hover:bg-[#FFF8E7]/50 ${isActive ? '!text-blue-700 bg-[#FFF8E7]' : ''}`
                              }
                            >
                              {({ isActive }) => (
                                <>
                                  {isActive && (
                                    <span style={activeIndicatorStyle}></span>
                                  )}
                                  <span className="text-lg leading-none">
                                    •
                                  </span>
                                  <span>Account Settings</span>
                                </>
                              )}
                            </NavLink>
                          </li>
                          <li>
                            <button
                              onClick={logout}
                              style={{ color: secondaryColor }}
                              className="group relative flex w-full items-center gap-3 rounded-md py-2.5 px-4 font-medium duration-200 ease-in-out hover:bg-red-50 hover:text-red-500"
                            >
                              <span className="text-lg leading-none">•</span>
                              <LogOut size={16} />
                              <span>Logout</span>
                            </button>
                          </li>
                        </ul>
                      </div>
                    </React.Fragment>
                  );
                }}
              </SidebarLinkGroup>
            </ul>
          </div>
        </nav>
      </div>
    </aside>
  );
};

export default Sidebar;

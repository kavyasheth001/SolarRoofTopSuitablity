"use client";
import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useMap } from '../../context/MapContext';


const Header = ({ sidebarOpen, setSidebarOpen }) => {
  return (
    <header className="sticky top-0 z-999 flex w-full bg-[#1e3a5f] shadow-md h-12 items-center">
      <div className="flex flex-grow items-center justify-between px-4 py-2 md:px-6">
        {/* Toggle & Logo */}
        <div className="flex items-center gap-4">
          <button
            aria-controls="sidebar"
            aria-expanded={sidebarOpen}
            onClick={(e) => {
              e.stopPropagation();
              setSidebarOpen(!sidebarOpen);
            }}
            className="z-99999 block rounded-sm border border-stroke bg-white p-1.5 shadow-sm dark:border-strokedark dark:bg-boxdark lg:hidden"
          >
            <svg className="w-5 h-5 text-[#1e3a5f]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="hidden lg:block p-1.5 hover:bg-white/10 rounded-lg text-white"
            title="Toggle Sidebar"
          >
             <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

           <span className="text-white text-lg font-semibold ml-2">Solar Rooftop Analysis</span>
        </div>
      </div>
    </header>
  );
};

export default Header;

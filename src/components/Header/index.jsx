"use client";
import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useMap } from '../../context/MapContext';


const Header = () => {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const isMapRoute = pathname === "/map" || pathname === "/";
  
  const {
    callQuickAccessButtonFunction,
    getQuickAccessButtonState,
    registerQuickAccessButtonState
  } = useMap();

  const handleToggle = (buttonId) => {
    if (!isMapRoute) return;
    const currentState = getQuickAccessButtonState(buttonId);
    registerQuickAccessButtonState(buttonId, !currentState);
    callQuickAccessButtonFunction(buttonId);
  };

  return (
    <header className="sticky top-0 z-999 flex w-full bg-[#1e3a5f] shadow-md h-16 items-center">
      <div className="flex flex-grow items-center justify-between px-4 py-2 md:px-6">
        {/* Logo */}
        <div className="flex items-center gap-4">
           <span className="text-white text-lg font-semibold">Solar Rooftop Analysis</span>
        </div>

        {/* Toggles */}
        {isMapRoute && (
          <div className="flex items-center gap-4">
            <button
              onClick={() => handleToggle('realityModel')}
              className={`px-4 py-2 rounded transition-colors border border-white/20 ${getQuickAccessButtonState('realityModel') ? 'bg-white text-[#1e3a5f]' : 'text-white hover:bg-white/10'}`}
              title="Toggle Reality Model"
            >
              <span className="text-sm font-medium">Reality Model</span>
            </button>

            <button
              onClick={() => handleToggle('lodModel')}
              className={`px-4 py-2 rounded transition-colors border border-white/20 ${getQuickAccessButtonState('lodModel') ? 'bg-white text-[#1e3a5f]' : 'text-white hover:bg-white/10'}`}
              title="Toggle LOD Model"
            >
               <span className="text-sm font-medium">LOD Model</span>
            </button>

            <button
              onClick={() => handleToggle('shadowAnalysis')}
              className={`px-4 py-2 rounded transition-colors border border-white/20 ${getQuickAccessButtonState('shadowAnalysis') ? 'bg-white text-[#1e3a5f]' : 'text-white hover:bg-white/10'}`}
              title="Toggle Shadow Analysis"
            >
              <span className="text-sm font-medium">Shadow Analysis</span>
            </button>

            <button
              onClick={() => handleToggle('solarSuitability')}
              className={`px-4 py-2 rounded transition-colors border border-white/20 ${getQuickAccessButtonState('solarSuitability') ? 'bg-white text-[#1e3a5f]' : 'text-white hover:bg-white/10'}`}
              title="Toggle Solar Suitability"
            >
              <span className="text-sm font-medium">Solar Suitability</span>
            </button>

            <button
              onClick={() => handleToggle('identify')}
              className={`px-4 py-2 rounded transition-colors border border-white/20 ${getQuickAccessButtonState('identify') ? 'bg-white text-[#1e3a5f]' : 'text-white hover:bg-white/10'}`}
              title="Identify features by clicking on the map"
            >
              <span className="text-sm font-medium">Identify</span>
            </button>

            {/* Dashboard button — always visible on map route */}
            <button
              onClick={() => navigate('/dashboard')}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '7px 14px', borderRadius: 7,
                background: 'linear-gradient(135deg, #2563eb, #7c3aed)',
                border: 'none', color: 'white', fontWeight: 700, fontSize: 13,
                cursor: 'pointer', boxShadow: '0 2px 12px rgba(37,99,235,0.4)',
                whiteSpace: 'nowrap',
              }}
              title="Open SolarSight Dashboard"
            >
              📊 Dashboard
            </button>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;

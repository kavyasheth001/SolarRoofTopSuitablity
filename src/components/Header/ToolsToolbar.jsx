import React, { useState } from 'react';
import { FaTree, FaCampground, FaFire, FaVideo } from 'react-icons/fa';
import { TbLocationSearch } from 'react-icons/tb';

const ToolsToolbar = ({ mapRef, isVisible, onClose }) => {
  const [openCategory, setOpenCategory] = useState(null);
  
  if (!isVisible) return null;

  const toggleCategory = (category) => {
    setOpenCategory(openCategory === category ? null : category);
  };

  const callMapFunction = (functionName, ...args) => {
    if (mapRef?.current && mapRef.current[functionName]) {
      mapRef.current[functionName](...args);
    }
  };

  const getMapState = (stateName) => {
    if (mapRef?.current && mapRef.current.states) {
      return mapRef.current.states[stateName];
    }
    return false;
  };

  const separatorStyle = {
    border: 'none',
    borderTop: '1px solid rgba(255, 255, 255, 0.3)',
    margin: '5px 0',
    width: '100%',
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: '50px',
        right: '120px',
        zIndex: 99999,
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        background: 'linear-gradient(145deg,rgb(145, 126, 106), rgb(51 51 51 / 11%))',
        padding: '10px',
        borderRadius: '12px',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
        maxHeight: 'calc(100vh - 100px)',
        overflowY: 'auto',
        minWidth: '50px',
      }}
    >
      {/* Close button */}
      <button
        onClick={onClose}
        style={{
          position: 'absolute',
          top: '5px',
          right: '5px',
          background: 'transparent',
          border: 'none',
          color: 'white',
          cursor: 'pointer',
          fontSize: '18px',
          padding: '0',
          width: '20px',
          height: '20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        ×
      </button>

      {/* Basic Category */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
        <button
          onClick={() => {
            callMapFunction('resetAllStates');
            toggleCategory('basic');
          }}
          title="Basic Tools"
          style={{
            background: 'linear-gradient(145deg,#93c5fd, rgb(10, 5, 2))',
            color: 'white',
            border: '1px solid rgba(255, 255, 255, 0.3)',
            borderRadius: '10%',
            width: '30px',
            height: '30px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          B
        </button>

        {openCategory === 'basic' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginLeft: '5px' }}>
            {/* Measurement */}
            <button
              onClick={() => {
                callMapFunction('resetAllStates');
                callMapFunction('toggleShowOptions');
              }}
              title="Measurement Tools"
              style={{
                background: getMapState('showOptions') ? '#1a83fc' : 'rgba(255, 255, 255, 0.1)',
                color: 'white',
                border: '1px solid rgba(255, 255, 255, 0.3)',
                borderRadius: '10%',
                width: '30px',
                height: '30px',
                cursor: 'pointer',
              }}
            >
              📏
            </button>

            {/* Zoom */}
            <button
              onClick={() => {
                callMapFunction('resetAllStates');
                callMapFunction('toggleShowZoom');
              }}
              title="Zoom Tools"
              style={{
                background: getMapState('showZoom') ? '#1a83fc' : 'rgba(255, 255, 255, 0.1)',
                color: 'white',
                border: '1px solid rgba(255, 255, 255, 0.3)',
                borderRadius: '10%',
                width: '30px',
                height: '30px',
                cursor: 'pointer',
              }}
            >
              🔍
            </button>

            {/* Location */}
            <button
              onClick={() => {
                callMapFunction('resetAllStates');
                callMapFunction('toggleLocationTools');
              }}
              title="Location Tools"
              style={{
                background: getMapState('showLocationTools') ? '#1a83fc' : 'rgba(255, 255, 255, 0.1)',
                color: 'white',
                border: '1px solid rgba(255, 255, 255, 0.3)',
                borderRadius: '10%',
                width: '30px',
                height: '30px',
                cursor: 'pointer',
              }}
            >
              📍
            </button>

            {/* Query Builder */}
            <button
              onClick={() => {
                callMapFunction('resetAllStates');
                callMapFunction('toggleAttributeSearch');
              }}
              title="Query Builder"
              style={{
                background: getMapState('isAttributeSearchEnabled') ? '#1a83fc' : 'rgba(255, 255, 255, 0.1)',
                color: 'white',
                border: '1px solid rgba(255, 255, 255, 0.3)',
                borderRadius: '10%',
                width: '30px',
                height: '30px',
                cursor: 'pointer',
              }}
            >
              🔎
            </button>
          </div>
        )}
      </div>

      <hr style={separatorStyle} />

      {/* Advance Category */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
        <button
          onClick={() => {
            callMapFunction('resetAllStates');
            toggleCategory('advance');
          }}
          title="Advanced Tools"
          style={{
            background: 'linear-gradient(145deg,#93c5fd, rgb(10, 5, 2))',
            color: 'white',
            border: '1px solid rgba(255, 255, 255, 0.3)',
            borderRadius: '10%',
            width: '30px',
            height: '30px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          A
        </button>

        {openCategory === 'advance' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginLeft: '5px' }}>
            {/* Change Detection */}
            <button
              onClick={() => {
                callMapFunction('resetAllStates');
                callMapFunction('toggleHorizontal');
              }}
              title="Change Detection"
              style={{
                background: getMapState('showHorizontal') ? '#1a83fc' : 'rgba(255, 255, 255, 0.1)',
                color: 'white',
                border: '1px solid rgba(255, 255, 255, 0.3)',
                borderRadius: '50%',
                width: '30px',
                height: '30px',
                cursor: 'pointer',
              }}
            >
              🏢
            </button>

            {/* Green Analysis */}
            <button
              onClick={() => {
                callMapFunction('resetAllStates');
                callMapFunction('toggleGreenPlantationTools');
              }}
              title="Green Analysis"
              style={{
                background: getMapState('showGreenPlantationTools') ? '#1a83fc' : 'rgba(255, 255, 255, 0.1)',
                color: 'white',
                border: '1px solid rgba(255, 255, 255, 0.3)',
                borderRadius: '50%',
                width: '30px',
                height: '30px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <FaTree size={14} />
            </button>

            {/* Buffer Analysis */}
            <button
              onClick={() => {
                callMapFunction('resetAllStates');
                callMapFunction('toggleProximityWidget');
              }}
              title="Buffer Analysis"
              style={{
                background: getMapState('isProximityWidgetEnabled') ? '#1a83fc' : 'rgba(255, 255, 255, 0.1)',
                color: 'white',
                border: '1px solid rgba(255, 255, 255, 0.3)',
                borderRadius: '10%',
                width: '30px',
                height: '30px',
                cursor: 'pointer',
              }}
            >
              ⊕
            </button>

            {/* Building Mapping */}
            <button
              onClick={() => {
                callMapFunction('resetAllStates');
                callMapFunction('toggleBuilding2024');
              }}
              title="Building Mapping"
              style={{
                background: getMapState('showBuilding2024') ? '#1a83fc' : 'rgba(255, 255, 255, 0.1)',
                color: 'white',
                border: '1px solid rgba(255, 255, 255, 0.3)',
                borderRadius: '50%',
                width: '30px',
                height: '30px',
                cursor: 'pointer',
              }}
            >
              🏗️
            </button>

            {/* Fire Analysis */}
            <button
              onClick={() => {
                callMapFunction('resetAllStates');
                callMapFunction('toggleFireWidget');
              }}
              title="Fire Incidence Analysis"
              style={{
                background: getMapState('isFireWidgetOpen') ? '#1a83fc' : 'rgba(255, 255, 255, 0.1)',
                color: 'white',
                border: '1px solid rgba(255, 255, 255, 0.3)',
                borderRadius: '50%',
                width: '30px',
                height: '30px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <FaFire size={14} />
            </button>

            {/* Utility Analysis */}
            <button
              onClick={() => {
                callMapFunction('resetAllStates');
                callMapFunction('toggleUnderGround');
              }}
              title="Utility Analysis"
              style={{
                background: getMapState('showUnderGround') ? '#1a83fc' : 'rgba(255, 255, 255, 0.1)',
                color: 'white',
                border: '1px solid rgba(255, 255, 255, 0.3)',
                borderRadius: '50%',
                width: '30px',
                height: '30px',
                cursor: 'pointer',
              }}
            >
              🔧
            </button>

            {/* Swipe */}
            <button
              onClick={() => {
                callMapFunction('resetAllStates', 'swipe');
                callMapFunction('toggleCustomSwipe');
              }}
              title="Swipe"
              style={{
                background: getMapState('isCustomSwipeEnabled') ? '#1a83fc' : 'rgba(255, 255, 255, 0.1)',
                color: 'white',
                border: '1px solid rgba(255, 255, 255, 0.3)',
                borderRadius: '50%',
                width: '30px',
                height: '30px',
                cursor: 'pointer',
              }}
            >
              ⟷
            </button>
          </div>
        )}
      </div>

      <hr style={separatorStyle} />

      {/* Use Case Category */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
        <button
          onClick={() => {
            callMapFunction('resetAllStates');
            toggleCategory('usecase');
          }}
          title="Simulation Tools"
          style={{
            background: 'linear-gradient(145deg,#93c5fd, rgb(10, 5, 2))',
            color: 'white',
            border: '1px solid rgba(255, 255, 255, 0.3)',
            borderRadius: '10%',
            width: '30px',
            height: '30px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          S
        </button>

        {openCategory === 'usecase' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginLeft: '5px' }}>
            {/* Visibility Tools */}
            <button
              onClick={() => {
                callMapFunction('resetAllStates');
                callMapFunction('toggleVisibilityTools');
              }}
              title="Visibility Tools"
              style={{
                background: getMapState('showVisibilityTools') ? '#1a83fc' : 'rgba(255, 255, 255, 0.1)',
                color: 'white',
                border: '1px solid rgba(255, 255, 255, 0.3)',
                borderRadius: '10%',
                width: '30px',
                height: '30px',
                cursor: 'pointer',
              }}
            >
              👁️
            </button>

            {/* Impact Analysis */}
            <button
              onClick={() => {
                callMapFunction('resetAllStates');
                callMapFunction('toggleImpactOptions');
              }}
              title="Impact Analysis"
              style={{
                background: getMapState('showImpactOptionsTD') ? '#1a83fc' : 'rgba(255, 255, 255, 0.1)',
                color: 'white',
                border: '1px solid rgba(255, 255, 255, 0.3)',
                borderRadius: '50%',
                width: '30px',
                height: '30px',
                cursor: 'pointer',
              }}
            >
              💥
            </button>

            {/* Building Analysis */}
            <button
              onClick={() => {
                callMapFunction('resetAllStates');
                callMapFunction('toggleBuildingAnalysis');
              }}
              title="Building Analysis"
              style={{
                background: getMapState('showBuld') ? '#1a83fc' : 'rgba(255, 255, 255, 0.1)',
                color: 'white',
                border: '1px solid rgba(255, 255, 255, 0.3)',
                borderRadius: '50%',
                width: '30px',
                height: '30px',
                cursor: 'pointer',
              }}
            >
              🏢
            </button>

            {/* CCTV Viewer */}
            <button
              onClick={() => {
                callMapFunction('toggleCCTVMode');
              }}
              title="CCTV Viewer"
              style={{
                background: getMapState('isCCTVModeActive') ? '#1a83fc' : 'rgba(255, 255, 255, 0.1)',
                color: 'white',
                border: '1px solid rgba(255, 255, 255, 0.3)',
                borderRadius: '50%',
                width: '30px',
                height: '30px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <FaVideo size={14} />
            </button>

            {/* Flood Analysis */}
            <button
              onClick={() => {
                callMapFunction('resetAllStates');
                callMapFunction('toggleFloodAnalysis');
              }}
              title="Flood Analysis"
              style={{
                background: getMapState('showFloodAnalysis') ? '#1a83fc' : 'rgba(255, 255, 255, 0.1)',
                color: 'white',
                border: '1px solid rgba(255, 255, 255, 0.3)',
                borderRadius: '50%',
                width: '30px',
                height: '30px',
                cursor: 'pointer',
              }}
            >
              🌊
            </button>

            {/* Dark Spot */}
            <button
              onClick={() => {
                callMapFunction('resetAllStates');
                callMapFunction('toggleDarkSpot');
              }}
              title="Dark Spot"
              style={{
                background: getMapState('isDarkSpotToolEnabled') ? '#1a83fc' : 'rgba(255, 255, 255, 0.1)',
                color: 'white',
                border: '1px solid rgba(255, 255, 255, 0.3)',
                borderRadius: '50%',
                width: '30px',
                height: '30px',
                cursor: 'pointer',
              }}
            >
              🌑
            </button>

            {/* Renewable Energy */}
            <button
              onClick={() => {
                callMapFunction('resetAllStates');
                callMapFunction('toggleRenewal');
              }}
              title="Renewable Energy"
              style={{
                background: getMapState('showRenewal') ? '#1a83fc' : 'rgba(255, 255, 255, 0.1)',
                color: 'white',
                border: '1px solid rgba(255, 255, 255, 0.3)',
                borderRadius: '50%',
                width: '30px',
                height: '30px',
                cursor: 'pointer',
              }}
            >
              ⚡
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ToolsToolbar;
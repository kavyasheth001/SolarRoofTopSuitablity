import React, { useState } from 'react';

const RealityModelToggle = ({ view, position }) => {
  const [isRealityModelEnabled, setIsRealityModelEnabled] = useState(false);

  const toggleRealityModel = () => {
    if (!view || !view.map) return;

    // Find the 3D Mesh layer
    const meshLayer = view.map.layers.find(
      (layer) => layer.title && layer.title === 'Reality Model',
    );

    // Toggle the visibility of each found layer without breaking if others are missing
    let isUpdated = false;

    if (meshLayer) {
      meshLayer.visible = !meshLayer.visible;
      isUpdated = true;
    }

    // If any layer was found and toggled, update the state
    if (isUpdated) {
      // Check if any of the layers are visible
      const anyLayerVisible = [meshLayer].some(
        (layer) => layer && layer.visible,
      );
      setIsRealityModelEnabled(anyLayerVisible);
    } else {
      console.log('No layers found to toggle');
    }
  };

  return (
    <button
      onClick={toggleRealityModel}
      style={{
        position: 'absolute',
        ...position,
        padding: '7px',
        backgroundColor: isRealityModelEnabled ? '#2563eb' : '#ffffff',
        color: isRealityModelEnabled ? '#ffffff' : '#374151',
        border: '2px solid #e5e7eb',
        borderRadius: '8px',
        cursor: 'pointer',
        fontSize: '14px',
        fontWeight: '500',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        transition: 'all 0.2s ease',
        zIndex: 10,
        width: '40px',
        height: '40px',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'scale(1.05)';
        e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.15)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'scale(1)';
        e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
      }}
    >
      {isRealityModelEnabled ?  
          <>
      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
            />
          </svg> 
          </>
          :<>
           <svg className="w-6 h-6 text-dark" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
              />
          </svg>  
              </>
          }
    </button>
  );
};

export default RealityModelToggle;
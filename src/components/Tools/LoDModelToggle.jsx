import React, { useState } from 'react';

const LoDModelToggle = ({ view, position }) => {
  const [isLoDModelEnabled, setIsLoDModelEnabled] = useState(false);

  const toggleLoDModel = () => {
    if (!view || !view.map) return;

    // Find all three LoD layers
    const lodLayer1 = view.map.layers.find(
      (layer) =>
        layer.title &&
        layer.title === 'LoD 2 without Texture',
    );
    const lodLayer2 = view.map.layers.find(
      (layer) =>
        layer.title &&
        layer.title === 'LOD - 02 - BMC Segment 03 Without Texture',
    );
    const lodLayer3 = view.map.layers.find(
      (layer) =>
        layer.title &&
        layer.title === 'LOD - 02 - BMC Segment 04 Without Texture',
    );

    let isUpdated = false;

    if (lodLayer1) {
      lodLayer1.visible = !lodLayer1.visible;
      isUpdated = true;
    }

    if (lodLayer2) {
      lodLayer2.visible = !lodLayer2.visible;
      isUpdated = true;
    }

    if (lodLayer3) {
      lodLayer3.visible = !lodLayer3.visible;
      isUpdated = true;
    }

    if (isUpdated) {
      const anyLayerVisible = [lodLayer1, lodLayer2, lodLayer3].some(
        (layer) => layer && layer.visible,
      );
      setIsLoDModelEnabled(anyLayerVisible);
    } else {
      console.log('No LoD layers found to toggle');
    }
  };

  return (
    <button
      onClick={toggleLoDModel}
      style={{
        position: 'absolute',
        ...position,
        padding: '8px 9px',
        backgroundColor: isLoDModelEnabled ? '#2563eb' : '#ffffff',
        border: '2px solid #e5e7eb',
        borderRadius: '8px',
        cursor: 'pointer',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        transition: 'all 0.2s ease',
        zIndex: 10,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
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
      title="Toggle LoD Model"
    >
      <svg 
        width="29" 
        height="30" 
        fill="none" 
        stroke={isLoDModelEnabled ? '#ffffff' : '#374151'} 
        viewBox="0 0 24 24"
        strokeWidth="2"
      >
        <path 
          strokeLinecap="round" 
          strokeLinejoin="round" 
          d="M4 6h16M4 12h16M4 18h16" 
        />
      </svg>
    </button>
  );
};

export default LoDModelToggle;
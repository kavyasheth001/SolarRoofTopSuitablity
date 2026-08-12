import { useEffect, useRef, useState, useCallback } from 'react';
import '@arcgis/core/assets/esri/themes/light/main.css';
import LayerListWidget from '../Tools/LayerListWidget.jsx';
import * as mapManager from '../../utils/mapManager';

const Gis = ({ isHeaderCollapsed }) => {
  const mapContainerRef = useRef(null);
  const [view, setView] = useState(null);
  const [isMapLoading, setIsMapLoading] = useState(true);
  const [isLayerListVisible, setIsLayerListVisible] = useState(false);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    mapManager.attachTo(mapContainerRef.current).then(() => {
      const v = mapManager.getView();
      if (v) {
        setView(v);
        v.goTo({
          center: [72.847187, 18.999758],
          zoom: 12.3,
          tilt: 65,
        }).then(() => {
          setIsMapLoading(false);
        }).catch(() => setIsMapLoading(false));
      }
    });

    return () => {
      mapManager.detach();
    };
  }, []);

  const toggleLayerList = useCallback(() => {
    setIsLayerListVisible((prev) => !prev);
  }, []);

  const handleLayerListClose = useCallback(() => {
    setIsLayerListVisible(false);
  }, []);

  return (
    <div
      style={{
        position: 'relative',
        height: isHeaderCollapsed ? '97vh' : '93.6vh',
        overflow: 'hidden',
      }}
    >
      {/*
        ✅ ArcGIS-owned div — React renders NO children inside it.
           The map container must be a sibling of React-managed UI,
           not a parent/wrapper of it.
      */}
      <div
        ref={mapContainerRef}
        style={{ position: 'absolute', inset: 0 }}
      />

      {/* All React-managed UI sits as siblings OUTSIDE the map div */}

      {/* Loading overlay */}
      {isMapLoading && (
        <div style={{
          position: 'absolute',
          inset: 0,
          backgroundColor: '#5b8db8',
          zIndex: 9999,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '16px',
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '5px', height: '50px' }}>
            {[0.4, 0.6, 0.75, 0.9, 1].map((height, i) => (
              <div
                key={i}
                style={{
                  width: '14px',
                  backgroundColor: 'white',
                  borderRadius: '3px 3px 0 0',
                  height: `${height * 50}px`,
                  animation: `barPulse 1.2s ease-in-out ${i * 0.15}s infinite alternate`,
                }}
              />
            ))}
          </div>
          <span style={{ color: 'white', fontSize: '14px', letterSpacing: '1px' }}>
            Loading Map...
          </span>
          <style>{`
            @keyframes barPulse {
              from { opacity: 0.4; transform: scaleY(0.7); }
              to   { opacity: 1;   transform: scaleY(1);   }
            }
          `}</style>
        </div>
      )}

      {/* Layer List toggle button */}
      <div style={{
        position: 'absolute',
        top: '10px',
        right: '10px',
        zIndex: 20,
      }}>
        <button
          onClick={toggleLayerList}
          title="Toggle Layer List"
          style={{
            width: '33px',
            height: '33px',
            borderRadius: '20px',
            background: isLayerListVisible ? 'rgb(169 188 7)' : '#1a83fc',
            color: 'white',
            border: 'none',
            cursor: 'pointer',
            fontSize: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
          }}
        >
          ☰
        </button>
      </div>

      {/* Layer List Widget */}
      {isLayerListVisible && view && (
        <LayerListWidget
          view={view}
          isVisible={isLayerListVisible}
          onClose={handleLayerListClose}
        />
      )}
    </div>
  );
};

export default Gis;
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useMap } from '../../context/MapContext';
import ShadowAnalysisWidget from '../Tools/ShadowAnalysisWidget';
import './TwoDMap.css';

const TwoDMap = ({ isSidebarCollapsed }) => {
  const { registerQuickAccessButtonFunction, registerQuickAccessButtonState } = useMap();
  const mapContainer3DRef = useRef(null);
  const [view, setView] = useState(null);
  
  const [isLoDModelEnabled, setIsLoDModelEnabled] = useState(false);
  const [isRealityModelEnabled, setIsRealityModelEnabled] = useState(false);
  const [shadowAnalysisEnabled, setShadowAnalysisEnabled] = useState(false);

  useEffect(() => {
    if (!mapContainer3DRef.current) return;
    import('../../utils/mapManager').then((mapManager) => {
      mapManager.attachTo(mapContainer3DRef.current).then(() => {
        const v = mapManager.getView();
        if (v) {
          setView(v);
          v.goTo({
            center: [72.847187, 18.999758],
            zoom: 12.3,
            tilt: 65,
          }).catch(() => { });
        }
      });
    });

    return () => {
      import('../../utils/mapManager').then((mapManager) => {
        mapManager.detach();
      });
    };
  }, []);

  const toggleLoDModel = useCallback(() => {
    if (!view || !view.map) return;
    // Basic LOD toggle logic
    const layer = view.map.layers.find((layer) => layer.title && layer.title.includes('LOD'));
    if (layer) {
      layer.visible = !layer.visible;
      setIsLoDModelEnabled(layer.visible);
    }
  }, [view]);

  const toggleRealityModel = useCallback(() => {
    if (!view || !view.map) return;
    // Basic Reality mesh toggle logic
    const layer = view.map.layers.find((layer) => layer.title === 'Reality Model');
    if (layer) {
      layer.visible = !layer.visible;
      setIsRealityModelEnabled(layer.visible);
    }
  }, [view]);

  const toggleShadowAnalysis = useCallback(() => {
    setShadowAnalysisEnabled(prev => !prev);
  }, []);

  useEffect(() => {
    registerQuickAccessButtonFunction('lodModel', toggleLoDModel);
    registerQuickAccessButtonState('lodModel', isLoDModelEnabled);
  }, [toggleLoDModel, isLoDModelEnabled, registerQuickAccessButtonFunction, registerQuickAccessButtonState]);

  useEffect(() => {
    registerQuickAccessButtonFunction('realityModel', toggleRealityModel);
    registerQuickAccessButtonState('realityModel', isRealityModelEnabled);
  }, [toggleRealityModel, isRealityModelEnabled, registerQuickAccessButtonFunction, registerQuickAccessButtonState]);

  useEffect(() => {
    registerQuickAccessButtonFunction('shadowAnalysis', toggleShadowAnalysis);
    registerQuickAccessButtonState('shadowAnalysis', shadowAnalysisEnabled);
  }, [toggleShadowAnalysis, shadowAnalysisEnabled, registerQuickAccessButtonFunction, registerQuickAccessButtonState]);

  return (
    <div className={`map-wrapper ${isSidebarCollapsed ? 'expanded' : ''}`} style={{ height: '100%', width: '100%' }}>
      <div ref={mapContainer3DRef} className="map-container" style={{ height: '100%', width: '100%' }} />
      {shadowAnalysisEnabled && (
        <ShadowAnalysisWidget view={view} onClose={() => setShadowAnalysisEnabled(false)} />
      )}
    </div>
  );
};

export default TwoDMap;

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useMap } from '../../context/MapContext';
import ShadowAnalysisWidget from '../Tools/ShadowAnalysisWidget';
import SolarSuitabilityTool from '../Tools/SolarSuitabilityTool';
import SceneIdentifyTool from '../Tools/SceneIdentifyTool';
import WelcomeSplash from './WelcomeSplash';
import AreaHeatmapTool from '../Tools/AreaHeatmapTool';
import GuidedDemoTour from '../Tools/GuidedDemoTour';
import './TwoDMap.css';

const TwoDMap = ({ isSidebarCollapsed }) => {
  const { registerQuickAccessButtonFunction, registerQuickAccessButtonState } = useMap();
  const mapContainer3DRef = useRef(null);
  const [view, setView] = useState(null);

  const [isLoDModelEnabled, setIsLoDModelEnabled] = useState(false);
  const [isRealityModelEnabled, setIsRealityModelEnabled] = useState(false);
  const [shadowAnalysisEnabled, setShadowAnalysisEnabled] = useState(false);
  const [solarSuitabilityEnabled, setSolarSuitabilityEnabled] = useState(false);
  const [identifyEnabled, setIdentifyEnabled] = useState(false);
  const [areaHeatmapEnabled, setAreaHeatmapEnabled] = useState(false);
  const [guidedDemoEnabled, setGuidedDemoEnabled] = useState(false);

  // Show welcome splash only once per session
  const [showSplash, setShowSplash] = useState(() => {
    return !sessionStorage.getItem('solar_splash_shown');
  });

  const handleSplashDismiss = () => {
    sessionStorage.setItem('solar_splash_shown', 'true');
    setShowSplash(false);
  };

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


  const toggleLoDModel = () => {
    if (!view || !view.map) return;

    // Find all four LoD layers
    const lodLayer1 = view.map.layers.find(
      (layer) => layer.title && layer.title === 'LoD 2 without Texture',
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
    const lodLayer4 = view.map.layers.find(
      (layer) => layer.title && layer.title === 'Slum LoD 2 without Texture',
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

    if (lodLayer4) {
      lodLayer4.visible = !lodLayer4.visible;
      isUpdated = true;
    }

    if (isUpdated) {
      const anyLayerVisible = [lodLayer1, lodLayer2, lodLayer3, lodLayer4].some(
        (layer) => layer && layer.visible,
      );
      setIsLoDModelEnabled(anyLayerVisible);
    } else {
      console.log('No LoD layers found to toggle');
    }
  };
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

  const toggleSolarSuitability = useCallback(() => {
    setSolarSuitabilityEnabled(prev => !prev);
  }, []);

  const toggleIdentify = useCallback(() => {
    setIdentifyEnabled(prev => !prev);
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

  useEffect(() => {
    registerQuickAccessButtonFunction('solarSuitability', toggleSolarSuitability);
    registerQuickAccessButtonState('solarSuitability', solarSuitabilityEnabled);
  }, [toggleSolarSuitability, solarSuitabilityEnabled, registerQuickAccessButtonFunction, registerQuickAccessButtonState]);

  useEffect(() => {
    registerQuickAccessButtonFunction('identify', toggleIdentify);
    registerQuickAccessButtonState('identify', identifyEnabled);
  }, [toggleIdentify, identifyEnabled, registerQuickAccessButtonFunction, registerQuickAccessButtonState]);

  return (
    <div className={`map-wrapper ${isSidebarCollapsed ? 'expanded' : ''}`} style={{ height: '100%', width: '100%', position: 'relative' }}>
      {showSplash && <WelcomeSplash onDismiss={handleSplashDismiss} />}
      <div ref={mapContainer3DRef} className="map-container" style={{ height: '100%', width: '100%' }} />
      {shadowAnalysisEnabled && (
        <ShadowAnalysisWidget view={view} onClose={() => setShadowAnalysisEnabled(false)} />
      )}
      {solarSuitabilityEnabled && (
        <SolarSuitabilityTool view={view} onClose={() => setSolarSuitabilityEnabled(false)} />
      )}
      
      {areaHeatmapEnabled && (
        <AreaHeatmapTool view={view} onClose={() => setAreaHeatmapEnabled(false)} />
      )}

      {/* Exhibition Tools Floating Button */}
      <div style={{ position: 'absolute', bottom: 30, left: 20, zIndex: 100, display: 'flex', gap: 10 }}>
        <button
          onClick={() => setAreaHeatmapEnabled(!areaHeatmapEnabled)}
          style={{
            background: 'linear-gradient(135deg, #1e3a8a, #3b82f6)',
            color: 'white', border: 'none', borderRadius: 8, padding: '10px 16px',
            fontWeight: 700, fontSize: 14, cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(0,0,0,0.2)', display: 'flex', alignItems: 'center', gap: 8
          }}
        >
          ðŸŒ Area Heatmap
        </button>
      </div>
      {view && (
        <SceneIdentifyTool
          view={view}
          enabled={identifyEnabled}
          onClose={() => setIdentifyEnabled(false)}
        />
      )}
    </div>
  );
};

export default TwoDMap;

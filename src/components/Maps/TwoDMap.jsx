import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useMap } from '../../context/MapContext';
import ShadowAnalysisWidget from '../Tools/ShadowAnalysisWidget';
import SolarSuitabilityTool from '../Tools/SolarSuitabilityTool';
import SceneIdentifyTool from '../Tools/SceneIdentifyTool';
import WelcomeSplash from './WelcomeSplash';
import AreaHeatmapTool from '../Tools/AreaHeatmapTool';
import GuidedDemoTour from '../Tools/GuidedDemoTour';
import { FaGlobe } from 'react-icons/fa';
import './TwoDMap.css';

const TwoDMap = ({ isSidebarCollapsed }) => {
  const { registerQuickAccessButtonFunction, registerQuickAccessButtonState, setSceneView } = useMap();
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
          setSceneView(v);
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
    const el = mapContainer3DRef.current;
    if (!el || !view) return;

    let raf = null;
    const ro = new ResizeObserver(() => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        window.dispatchEvent(new Event('resize'));
      });
    });
    ro.observe(el);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [view]);

  useEffect(() => {
    const t = setTimeout(() => window.dispatchEvent(new Event('resize')), 350);
    return () => clearTimeout(t);
  }, [solarSuitabilityEnabled]);

  useEffect(() => {
    registerQuickAccessButtonFunction('identify', toggleIdentify);
    registerQuickAccessButtonState('identify', identifyEnabled);
  }, [toggleIdentify, identifyEnabled, registerQuickAccessButtonFunction, registerQuickAccessButtonState]);

  // New state for the divider
  const [toolPanelWidth, setToolPanelWidth] = useState(420); // default width in px
  const dividerRef = useRef(null);
  const isDraggingDivider = useRef(false);
  const panelRef = useRef(null);

  // Divider drag handlers
  const onDividerMouseDown = useCallback((e) => {
    e.preventDefault();
    isDraggingDivider.current = true;
    const startX = e.clientX;
    const startWidth = toolPanelWidth;

    const onMouseMove = (moveEvent) => {
      if (!isDraggingDivider.current) return;
      const diff = startX - moveEvent.clientX;
      const newWidth = Math.max(340, Math.min(800, startWidth + diff));
      if (panelRef.current) {
        panelRef.current.style.width = `${newWidth}px`;
      }
    };
    const onMouseUp = (upEvent) => {
      isDraggingDivider.current = false;
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      const diff = startX - upEvent.clientX;
      const finalWidth = Math.max(340, Math.min(800, startWidth + diff));
      setToolPanelWidth(finalWidth);
    };
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  }, [toolPanelWidth]);

  // Effect to auto-open Solar Suitability Tool based on URL query param
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('tool') === 'solar') {
      setSolarSuitabilityEnabled(true);
      registerQuickAccessButtonState('solarSuitability', true);
    }
  }, [registerQuickAccessButtonState]);

  return (
    <div className={`map-wrapper ${isSidebarCollapsed ? 'expanded' : ''}`} style={{ position: 'absolute', inset: 0, display: 'flex', overflow: 'hidden' }}>
      {showSplash && <WelcomeSplash onDismiss={handleSplashDismiss} />}

      {/* === Map container — takes remaining width === */}
      <div
        ref={mapContainer3DRef}
        className="map-container"
        style={{
          height: '100%',
          flex: solarSuitabilityEnabled ? '1 1 0%' : '1 1 100%',
          transition: solarSuitabilityEnabled ? 'none' : 'flex 0.3s ease',
          minWidth: 300,
        }}
      />

      {/* === Shadow Analysis (still floating, it's a small widget) === */}
      {shadowAnalysisEnabled && (
        <ShadowAnalysisWidget view={view} onClose={() => setShadowAnalysisEnabled(false)} />
      )}

      {/* === Solar Suitability — Docked Right Panel === */}
      {solarSuitabilityEnabled && (
        <>
          {/* Draggable divider */}
          <div
            ref={dividerRef}
            onMouseDown={onDividerMouseDown}
            style={{
              width: 6,
              cursor: 'col-resize',
              background: '#e2e8f0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              zIndex: 10,
              transition: 'background 0.2s',
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = '#94a3b8'}
            onMouseLeave={(e) => e.currentTarget.style.background = '#e2e8f0'}
          >
            {/* Grip dots */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              {[0, 1, 2].map(i => (
                <div key={i} style={{ width: 3, height: 3, borderRadius: '50%', background: '#64748b' }} />
              ))}
            </div>
          </div>

          {/* The tool panel itself */}
          <div ref={panelRef} style={{ width: toolPanelWidth, flexShrink: 0, height: '100%', overflow: 'hidden' }}>
            <SolarSuitabilityTool
              view={view}
              onClose={() => setSolarSuitabilityEnabled(false)}
              panelWidth={toolPanelWidth}
            />
          </div>
        </>
      )}

      {/* Identify tool (floating popup, unchanged) */}
      {view && (
        <SceneIdentifyTool view={view} enabled={identifyEnabled} onClose={() => setIdentifyEnabled(false)} />
      )}

      {/* Area Heatmap and other floating tools */}
      {areaHeatmapEnabled && (
        <AreaHeatmapTool view={view} onClose={() => setAreaHeatmapEnabled(false)} />
      )}

      {/* Area Heatmap floating button removed as requested */}
    </div>
  );
};

export default TwoDMap;

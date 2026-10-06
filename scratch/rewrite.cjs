const fs = require('fs');
let code = fs.readFileSync('src/components/Maps/TwoDMap.jsx', 'utf8');
const oldReturn = code.substring(code.indexOf('  return ('), code.lastIndexOf('export default TwoDMap;') - 2);
const newReturn = `  // New state for the divider
  const [toolPanelWidth, setToolPanelWidth] = useState(420); // default width in px
  const dividerRef = useRef(null);
  const isDraggingDivider = useRef(false);

  // Divider drag handlers
  const onDividerMouseDown = useCallback((e) => {
    e.preventDefault();
    isDraggingDivider.current = true;
    const startX = e.clientX;
    const startWidth = toolPanelWidth;

    const onMouseMove = (moveEvent) => {
      if (!isDraggingDivider.current) return;
      // Moving left = panel gets wider, moving right = panel gets narrower
      const diff = startX - moveEvent.clientX;
      const newWidth = Math.max(340, Math.min(800, startWidth + diff));
      setToolPanelWidth(newWidth);
    };
    const onMouseUp = () => {
      isDraggingDivider.current = false;
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  }, [toolPanelWidth]);

  return (
    <div className={\`map-wrapper \${isSidebarCollapsed ? 'expanded' : ''}\`} style={{ height: '100%', width: '100%', display: 'flex', position: 'relative' }}>
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
          <div style={{ width: toolPanelWidth, flexShrink: 0, height: '100%', overflow: 'hidden' }}>
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
          <FaGlobe style={{ fontSize: 16 }} /> Area Heatmap
        </button>
      </div>
    </div>
  );
};
`;
code = code.replace(oldReturn, newReturn);
// Add FaGlobe import if missing
if (!code.includes('FaGlobe')) {
    code = code.replace("import './TwoDMap.css';", "import { FaGlobe } from 'react-icons/fa';\nimport './TwoDMap.css';");
}
fs.writeFileSync('src/components/Maps/TwoDMap.jsx', code);

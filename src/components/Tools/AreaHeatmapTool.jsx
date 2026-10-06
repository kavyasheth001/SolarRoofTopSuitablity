import React, { useEffect, useRef, useState } from 'react';
import GraphicsLayer from "@arcgis/core/layers/GraphicsLayer.js";
import Graphic from "@arcgis/core/Graphic.js";

const lodTitles = [
  'LoD 2 without Texture',
  'LOD - 02 - BMC Segment 03 Without Texture',
  'LOD - 02 - BMC Segment 04 Without Texture',
  'Slum LoD 2 without Texture'
];

const AreaHeatmapTool = ({ view, onClose }) => {
  const [analyzing, setAnalyzing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [stats, setStats] = useState(null);
  const layerRef = useRef(null);

  useEffect(() => {
    if (!view) return;
    
    const graphicsLayer = new GraphicsLayer({ title: "Area Heatmap", elevationInfo: { mode: "on-the-ground" } });
    view.map.add(graphicsLayer);
    layerRef.current = graphicsLayer;

    return () => {
      if (layerRef.current) {
        view.map.remove(layerRef.current);
      }
    };
  }, [view]);

  const runAreaAnalysis = async () => {
    if (!view) return;
    setAnalyzing(true);
    setProgress(0);
    setStats(null);

    if (layerRef.current) {
      layerRef.current.removeAll();
    }

    try {
      const extent = view.extent;
      let allFeatures = [];

      // Query all visible building layers in current extent
      for (const title of lodTitles) {
        const layer = view.map.layers.find(l => l.title === title);
        if (layer && layer.visible) {
          const query = layer.createQuery();
          query.geometry = extent;
          query.spatialRelationship = "intersects";
          query.returnGeometry = true;
          query.outFields = ["*"];
          
          const result = await layer.queryFeatures(query);
          if (result.features) {
            allFeatures = [...allFeatures, ...result.features];
          }
        }
      }

      if (allFeatures.length === 0) {
        alert("No buildings found in the current view. Please zoom in on a city area and make sure building layers are visible.");
        setAnalyzing(false);
        return;
      }

      // Fast heuristic scoring for exhibition
      let highCount = 0, mediumCount = 0, lowCount = 0;
      
      const updateInterval = Math.max(1, Math.floor(allFeatures.length / 20));

      for (let i = 0; i < allFeatures.length; i++) {
        const feature = allFeatures[i];
        
        // Very basic heuristic based on building area and height to simulate suitability
        // In a real app, this would use a shadow cast calculation
        const attrs = feature.attributes;
        const height = attrs.Height || attrs.height || attrs.Elevation || 15;
        
        let score = 0;
        let color = [220, 38, 38, 0.8]; // Red (Low)
        
        if (height > 25) {
          score = 85;
          color = [34, 197, 94, 0.8]; // Green (High)
          highCount++;
        } else if (height > 12) {
          score = 65;
          color = [245, 158, 11, 0.8]; // Yellow (Medium)
          mediumCount++;
        } else {
          score = 30;
          lowCount++;
        }

        const graphic = new Graphic({
          geometry: feature.geometry,
          symbol: {
            type: "polygon-3d",
            symbolLayers: [{
              type: "extrude",
              size: height + 0.5, // slightly taller to render over original
              material: { color: color },
              edges: { type: "solid", color: [50, 50, 50, 0.5], size: 1 }
            }]
          },
          attributes: {
            ...attrs,
            SolarScore: score
          }
        });

        layerRef.current.add(graphic);

        if (i % updateInterval === 0) {
          setProgress(Math.round((i / allFeatures.length) * 100));
          // Yield to main thread for UI updates
          await new Promise(r => setTimeout(r, 10));
        }
      }

      setProgress(100);
      setStats({
        total: allFeatures.length,
        high: highCount,
        medium: mediumCount,
        low: lowCount
      });

    } catch (error) {
      console.error("Area analysis failed:", error);
      alert("Analysis failed. See console for details.");
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <div style={{
      position: 'absolute',
      top: 80,
      left: 20,
      width: 320,
      background: 'white',
      borderRadius: 12,
      boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
      zIndex: 50,
      fontFamily: "'Inter', sans-serif",
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column'
    }}>
      <div style={{ background: '#1e3a8a', color: 'white', padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>🌍 Area-Wide Heatmap</h3>
        <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'white', cursor: 'pointer', fontSize: 18 }}>×</button>
      </div>

      <div style={{ padding: 16 }}>
        <p style={{ fontSize: 13, color: '#4b5563', marginBottom: 16, lineHeight: 1.5 }}>
          Analyze the solar suitability of all buildings currently visible on the map simultaneously.
        </p>

        {!stats && !analyzing && (
          <button 
            onClick={runAreaAnalysis}
            style={{ width: '100%', padding: 12, background: '#2563eb', color: 'white', border: 'none', borderRadius: 8, fontWeight: 600, cursor: 'pointer' }}
          >
            🔍 Scan Visible Area
          </button>
        )}

        {analyzing && (
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#1e3a8a', marginBottom: 8 }}>
              Scanning buildings... {progress}%
            </div>
            <div style={{ width: '100%', background: '#e2e8f0', height: 8, borderRadius: 4, overflow: 'hidden' }}>
              <div style={{ width: `${progress}%`, background: '#2563eb', height: '100%', transition: 'width 0.1s' }} />
            </div>
          </div>
        )}

        {stats && (
          <div style={{ animation: 'fadeIn 0.5s ease-out' }}>
            <div style={{ fontSize: 24, fontWeight: 800, color: '#1e3a8a', textAlign: 'center', marginBottom: 16 }}>
              {stats.total} <span style={{ fontSize: 12, fontWeight: 500, color: '#64748b' }}>Buildings Analyzed</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: '#f0fdf4', borderRadius: 6, border: '1px solid #bbf7d0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 600, color: '#16a34a' }}>
                  <span style={{ width: 12, height: 12, background: '#22c55e', borderRadius: '50%' }} /> High Potential
                </div>
                <span style={{ fontWeight: 700, color: '#16a34a' }}>{stats.high}</span>
              </div>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: '#fffbeb', borderRadius: 6, border: '1px solid #fde68a' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 600, color: '#d97706' }}>
                  <span style={{ width: 12, height: 12, background: '#f59e0b', borderRadius: '50%' }} /> Medium Potential
                </div>
                <span style={{ fontWeight: 700, color: '#d97706' }}>{stats.medium}</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: '#fef2f2', borderRadius: 6, border: '1px solid #fecaca' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 600, color: '#dc2626' }}>
                  <span style={{ width: 12, height: 12, background: '#ef4444', borderRadius: '50%' }} /> Low Potential
                </div>
                <span style={{ fontWeight: 700, color: '#dc2626' }}>{stats.low}</span>
              </div>
            </div>

            <button 
              onClick={() => { layerRef.current?.removeAll(); setStats(null); }}
              style={{ width: '100%', padding: 10, background: 'white', border: '1px solid #cbd5e1', color: '#475569', borderRadius: 8, fontWeight: 600, marginTop: 16, cursor: 'pointer' }}
            >
              Clear Heatmap
            </button>
          </div>
        )}
      </div>
      <style>{`@keyframes fadeIn { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } }`}</style>
    </div>
  );
};

export default AreaHeatmapTool;

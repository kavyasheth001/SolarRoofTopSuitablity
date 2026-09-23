import React, { useEffect, useRef, useState } from 'react';

/**
 * ArcGIS SceneView Identify Tool
 * Click any feature in the 3D scene → shows its attributes in a draggable popup
 * Also highlights the clicked geometry with a cyan outline graphic
 */
const SceneIdentifyTool = ({ view, enabled, onClose }) => {
  const [popupData, setPopupData] = useState(null);
  const [position, setPosition] = useState({ top: 120, right: 20, left: null });
  const [isBodyVisible, setIsBodyVisible] = useState(true);
  const clickHandleRef = useRef(null);
  const highlightHandleRef = useRef(null);
  const graphicRef = useRef(null);
  const panelRef = useRef(null);

  // Drag state
  const dragOffset = useRef({ x: 0, y: 0 });

  const onDragStart = (e) => {
    if (e.button !== 0) return;
    if (e.target.closest('button')) return;
    e.preventDefault();
    const panel = panelRef.current;
    if (!panel) return;
    const rect = panel.getBoundingClientRect();
    dragOffset.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    const onMove = (me) => {
      const parent = panel.offsetParent?.getBoundingClientRect() || { left: 0, top: 0, width: window.innerWidth, height: window.innerHeight };
      let left = me.clientX - parent.left - dragOffset.current.x;
      let top = me.clientY - parent.top - dragOffset.current.y;
      left = Math.max(0, Math.min(left, parent.width - panel.offsetWidth));
      top = Math.max(0, Math.min(top, parent.height - panel.offsetHeight));
      setPosition({ top, left, right: null });
    };
    const onUp = () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  };

  // Clear highlight graphic
  const clearHighlight = () => {
    if (graphicRef.current && view) {
      view.graphics.remove(graphicRef.current);
      graphicRef.current = null;
    }
    if (highlightHandleRef.current) {
      highlightHandleRef.current.remove();
      highlightHandleRef.current = null;
    }
  };

  // Draw highlight ring around clicked feature
  const highlightGeometry = async (geometry, layerView) => {
    clearHighlight();
    if (!view || !geometry) return;

    try {
      // Try layerView highlight first (works for FeatureLayers)
      if (layerView?.highlight) {
        highlightHandleRef.current = layerView.highlight(geometry);
        return;
      }
    } catch (e) { /* fallthrough */ }

    // Fallback: draw a graphic outline (works for SceneLayers / mesh hits)
    try {
      const [Graphic, SimpleFillSymbol, SimpleLineSymbol, SimpleMarkerSymbol] = await Promise.all([
        import('@arcgis/core/Graphic.js').then(m => m.default),
        import('@arcgis/core/symbols/SimpleFillSymbol.js').then(m => m.default),
        import('@arcgis/core/symbols/SimpleLineSymbol.js').then(m => m.default),
        import('@arcgis/core/symbols/SimpleMarkerSymbol.js').then(m => m.default),
      ]);

      let symbol;
      if (geometry.type === 'polygon' || geometry.type === 'extent') {
        symbol = new SimpleFillSymbol({
          color: [0, 220, 255, 0.15],
          outline: { color: [0, 220, 255, 1], width: 3 }
        });
      } else if (geometry.type === 'polyline') {
        symbol = new SimpleLineSymbol({ color: [0, 220, 255, 1], width: 3 });
      } else {
        symbol = new SimpleMarkerSymbol({ color: [0, 220, 255, 0.8], size: 14, outline: { color: [255, 255, 255], width: 2 } });
      }

      const graphic = new Graphic({ geometry, symbol });
      view.graphics.add(graphic);
      graphicRef.current = graphic;
    } catch (err) {
      console.warn('[Identify] Could not draw highlight graphic:', err);
    }
  };

  // Main click handler
  useEffect(() => {
    if (!view || !enabled) return;

    // Remove previous handler
    if (clickHandleRef.current) {
      clickHandleRef.current.remove();
      clickHandleRef.current = null;
    }
    clearHighlight();

    clickHandleRef.current = view.on('click', async (event) => {
      try {
        const hitResult = await view.hitTest(event);
        if (!hitResult.results || hitResult.results.length === 0) {
          setPopupData(null);
          clearHighlight();
          return;
        }

        // Find best hit — prefer features with attributes over mesh
        let bestHit = hitResult.results.find(r => r.graphic?.attributes && Object.keys(r.graphic.attributes).length > 0)
          || hitResult.results[0];

        const graphic = bestHit.graphic;
        const layer = bestHit.layer || graphic?.layer;
        const attrs = graphic?.attributes || {};
        const geom = graphic?.geometry;

        // Try to get more attributes if sparse
        let fullAttrs = attrs;
        if (layer && layer.queryFeatures && Object.keys(attrs).length < 3) {
          try {
            const oid = attrs?.objectid ?? attrs?.OBJECTID ?? attrs?.OID;
            if (oid != null) {
              const q = layer.createQuery ? layer.createQuery() : { objectIds: [oid], outFields: ['*'], returnGeometry: true };
              if (layer.createQuery) {
                q.objectIds = [oid];
                q.outFields = ['*'];
                q.returnGeometry = true;
              }
              const res = await layer.queryFeatures(q);
              if (res.features.length > 0) fullAttrs = res.features[0].attributes;
            }
          } catch (e) { /* ignore */ }
        }

        // Highlight
        let lv = null;
        if (layer) {
          try { lv = await view.whenLayerView(layer); } catch (e) { }
        }
        await highlightGeometry(geom, lv);

        // Zoom to feature
        if (geom) {
          view.goTo({ target: geom, zoom: 18, tilt: 60 }, { duration: 800 });
        }

        // Build popup data
        const layerTitle = layer?.title || layer?.name || 'Feature';
        const exclude = new Set(['objectid', 'oid', 'fid', 'shape_area', 'shape_length', '__globalid', 'globalid']);
        const rows = Object.entries(fullAttrs)
          .filter(([k, v]) => !exclude.has(k.toLowerCase()) && v !== null && v !== undefined && v !== '');

        const title = fullAttrs?.name || fullAttrs?.Name || fullAttrs?.NAME ||
          fullAttrs?.building_name || fullAttrs?.bld_name ||
          fullAttrs?.title || layerTitle;

        setPopupData({ title, rows, layerTitle });
        setPosition({ top: 120, right: 20, left: null });
        setIsBodyVisible(true);
      } catch (err) {
        console.warn('[Identify] Click error:', err);
      }
    });

    return () => {
      if (clickHandleRef.current) {
        clickHandleRef.current.remove();
        clickHandleRef.current = null;
      }
      clearHighlight();
    };
  }, [view, enabled]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearHighlight();
      if (clickHandleRef.current) clickHandleRef.current.remove();
    };
  }, []);

  const positionStyle = {
    top: `${position.top}px`,
    ...(position.left !== null ? { left: `${position.left}px` } : { right: `${position.right}px` }),
  };

  if (!enabled) return null;
  if (!popupData) return null;

  return (
    <div
      ref={panelRef}
      className="absolute z-[999] bg-white rounded-xl shadow-2xl overflow-hidden flex flex-col"
      style={{ ...positionStyle, width: '300px', maxHeight: '480px', border: '1px solid #e2e8f0' }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between bg-[#1a73e8] px-3 py-2 cursor-move select-none"
        onMouseDown={onDragStart}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 14 }}>🔍</span>
          <span className="text-white text-sm font-semibold truncate max-w-[200px]" title={popupData.title}>
            {popupData.title}
          </span>
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          <button
            onClick={() => setIsBodyVisible(v => !v)}
            className="text-white bg-transparent border-none cursor-pointer hover:opacity-70 text-xs px-1"
          >
            {isBodyVisible ? '▲' : '▼'}
          </button>
          <button
            onClick={() => { setPopupData(null); clearHighlight(); if (onClose) onClose(); }}
            className="text-white bg-transparent border-none cursor-pointer hover:opacity-70 text-sm px-1"
          >
            ✖
          </button>
        </div>
      </div>

      {/* Layer badge */}
      {isBodyVisible && (
        <div style={{ padding: '4px 12px', background: '#eff6ff', borderBottom: '1px solid #dbeafe', fontSize: 10, color: '#2563eb', fontWeight: 600 }}>
          {popupData.layerTitle}
        </div>
      )}

      {/* Attributes */}
      {isBodyVisible && (
        <div style={{ overflowY: 'auto', flex: 1 }}>
          {popupData.rows.length === 0 ? (
            <div style={{ padding: 16, fontSize: 12, color: '#64748b', textAlign: 'center' }}>
              No attributes available for this feature.
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <tbody>
                {popupData.rows.map(([key, val], i) => (
                  <tr key={key} style={{ background: i % 2 === 0 ? '#fff' : '#f8fafc' }}>
                    <td style={{ padding: '5px 10px', color: '#64748b', fontWeight: 600, whiteSpace: 'nowrap', textTransform: 'capitalize', maxWidth: 110 }}>
                      {key.replace(/_/g, ' ')}
                    </td>
                    <td style={{ padding: '5px 10px', color: '#1e293b', wordBreak: 'break-word' }}>
                      {String(val)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
};

export default SceneIdentifyTool;

import React, { useEffect, useRef, useState, useCallback } from 'react';
import Daylight from "@arcgis/core/widgets/Daylight.js";
import Graphic from "@arcgis/core/Graphic.js";
import GraphicsLayer from "@arcgis/core/layers/GraphicsLayer.js";
import SketchViewModel from "@arcgis/core/widgets/Sketch/SketchViewModel.js";
import SimpleFillSymbol from "@arcgis/core/symbols/SimpleFillSymbol.js";
import * as geometryEngine from "@arcgis/core/geometry/geometryEngine.js";
import * as webMercatorUtils from "@arcgis/core/geometry/support/webMercatorUtils.js";
import SearchLocationTool from './SearchLocationTool';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, CartesianGrid,
} from 'recharts';

const lodTitles = [
  'LoD 2 without Texture',
  'LOD - 02 - BMC Segment 03 Without Texture',
  'LOD - 02 - BMC Segment 04 Without Texture',
  'Slum LoD 2 without Texture'
];

/* --- Animated Score Gauge ---------------------------------------- */
/* --- InfoAccordion Component ---------------------------------------- */
const InfoAccordion = ({ children, onShowMethodology }) => {
  const [open, setOpen] = React.useState(false);
  return (
    <div style={{ marginTop: 4, border: '1px solid #e5e7eb', borderRadius: 6, overflow: 'hidden' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px 10px', background: '#f8fafc', border: 'none', cursor: 'pointer', fontSize: 11, color: '#475569', fontWeight: 500 }}
      >
        <span>How is this calculated?</span>
        <span style={{ fontSize: 9, color: '#94a3b8' }}>{open ? String.fromCharCode(9650) : String.fromCharCode(9660)}</span>
      </button>
      {open && (
        <div style={{ padding: '8px 10px', background: '#fff', fontSize: 11, color: '#64748b', lineHeight: 1.6 }}>
          {children}
          <button onClick={onShowMethodology}
            style={{ marginTop: 6, fontSize: 10, color: '#2563eb', background: 'none', border: 'none', cursor: 'pointer', padding: 0, textDecoration: 'underline' }}>
            View full methodology &#x2192;
          </button>
        </div>
      )}
    </div>
  );
};
const ScoreGauge = ({ score }) => {
  const [displayed, setDisplayed] = useState(0);
  const radius = 40;
  const strokeWidth = 8;
  const circumference = 2 * Math.PI * radius;
  const dashoffset = circumference - (displayed / 100) * circumference;

  let color = '#ef4444';
  if (displayed > 40 && displayed <= 70) color = '#f59e0b';
  if (displayed > 70) color = '#22c55e';

  // Animate score count-up from 0 → target
  useEffect(() => {
    setDisplayed(0);
    let frame;
    const start = performance.now();
    const duration = 1400;
    const animate = (now) => {
      const progress = Math.min((now - start) / duration, 1);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayed(Math.round(eased * score));
      if (progress < 1) frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [score]);

  return (
    <div className="flex flex-col items-center justify-center relative w-24 h-24">
      {/* Glow ring */}
      <div style={{
        position: 'absolute', inset: -4, borderRadius: '50%',
        boxShadow: `0 0 18px 4px ${color}40`,
        animation: 'pulseGlow 2s ease-in-out infinite',
        opacity: displayed === score ? 1 : 0,
        transition: 'opacity 0.5s ease',
      }} />
      <svg className="transform -rotate-90 w-24 h-24">
        <circle cx="48" cy="48" r={radius} stroke="currentColor"
          strokeWidth={strokeWidth} fill="transparent" className="text-gray-200" />
        <circle cx="48" cy="48" r={radius} stroke={color}
          strokeWidth={strokeWidth} fill="transparent"
          strokeDasharray={circumference} strokeDashoffset={dashoffset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 0.05s linear, stroke 0.3s ease' }} />
      </svg>
      <div className="absolute flex flex-col items-center justify-center">
        <span className="text-xl font-bold text-gray-800">{displayed}</span>
      </div>
      <style>{`@keyframes pulseGlow {
        0%, 100% { transform: scale(1); opacity: 0.7; }
        50% { transform: scale(1.08); opacity: 1; }
      }`}</style>
    </div>
  );
};

/* --- Hourly Sunlight Bar Chart ----------------------------------- */
const HourlySunlightChart = ({ hourlyResults }) => {
  if (!hourlyResults || hourlyResults.length === 0) return null;

  const data = hourlyResults.map(h => ({
    hour: `${h.hour}:00`,
    sunlit: Number(h.sunlitPct),
    label: h.hour <= 11 ? `${h.hour} AM` : h.hour === 12 ? '12 PM' : `${h.hour - 12} PM`,
  }));

  const getBarColor = (pct) => {
    if (pct >= 70) return '#22c55e';
    if (pct >= 40) return '#f59e0b';
    if (pct > 0) return '#f97316';
    return '#374151';
  };

  return (
    <div style={{ marginTop: 4 }}>
      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', color: '#1e3a5f', padding: '6px 0 8px', borderBottom: '2px solid #bfdbfe' }}>
        📊 HOURLY SUNLIGHT PROFILE
      </div>
      <div style={{ width: '100%', height: 180, marginTop: 8 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 4, left: -20, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize: 9, fill: '#64748b' }} tickLine={false} axisLine={{ stroke: '#e2e8f0' }} />
            <YAxis domain={[0, 100]} tick={{ fontSize: 9, fill: '#64748b' }} tickLine={false} axisLine={false}
              tickFormatter={(v) => `${v}%`} />
            <Tooltip
              contentStyle={{ background: '#1e293b', border: 'none', borderRadius: 8, fontSize: 12, color: '#f1f5f9', boxShadow: '0 8px 24px rgba(0,0,0,0.4)' }}
              labelStyle={{ color: '#94a3b8', fontWeight: 600 }}
              formatter={(v) => [`${v}% sunlit`, 'Rooftop']}
              cursor={{ fill: 'rgba(59,130,246,0.08)' }}
            />
            <Bar dataKey="sunlit" radius={[4, 4, 0, 0]} animationDuration={1200} animationBegin={200}>
              {data.map((entry, i) => (
                <Cell key={i} fill={getBarColor(entry.sunlit)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div style={{ display: 'flex', justifyContent: 'center', gap: 12, marginTop: 4, fontSize: 10, color: '#6b7280' }}>
        <span><span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: 2, background: '#22c55e', marginRight: 3 }} />Good (≥70%)</span>
        <span><span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: 2, background: '#f59e0b', marginRight: 3 }} />Moderate</span>
        <span><span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: 2, background: '#374151', marginRight: 3 }} />No Sun</span>
      </div>
    </div>
  );
};

/* --- Smart AI Recommendations ------------------------------------ */
const SmartRecommendations = ({ result }) => {
  if (!result) return null;

  const recs = [];
  const score = result.score;
  const gen = Number(result.generation);
  const capacity = Number(result.capacity);
  const householdsEquiv = Math.round(gen / 1200); // avg Mumbai household ~1200 kWh/yr
  const treesEquiv = Math.round(Number(result.co2Saved) * 1000 / 22); // 1 tree ~ 22kg CO2/yr

  // Score-based primary recommendation
  if (score >= 80) {
    recs.push({
      icon: '\u2705',
      color: '#16a34a',
      bg: '#f0fdf4',
      border: '#bbf7d0',
      title: 'Excellent Solar Candidate',
      text: `This rooftop is highly suitable for solar panels. Estimated generation can power ~${householdsEquiv} average Mumbai household${householdsEquiv !== 1 ? 's' : ''} annually.`,
    });
  } else if (score >= 55) {
    recs.push({
      icon: '\u26A1',
      color: '#d97706',
      bg: '#fffbeb',
      border: '#fde68a',
      title: 'Good Potential with Optimization',
      text: `Moderate shadow interference detected. Consider optimizing panel tilt angle (15-20\u00B0 for Mumbai) and using micro-inverters to maximize output despite partial shading.`,
    });
  } else if (score >= 40) {
    recs.push({
      icon: '\u26A0\uFE0F',
      color: '#ea580c',
      bg: '#fff7ed',
      border: '#fed7aa',
      title: 'Moderate Potential \u2014 Needs Assessment',
      text: `Significant shadow interference from neighbouring buildings. Consider a detailed on-site survey. Bifacial panels may help capture reflected light.`,
    });
  } else {
    recs.push({
      icon: '\uD83D\uDD34',
      color: '#dc2626',
      bg: '#fef2f2',
      border: '#fecaca',
      title: 'Low Solar Potential',
      text: `Heavy shadow coverage makes this rooftop less viable. Consider nearby rooftops with better sun exposure, or explore community solar options.`,
    });
  }

  // Environmental impact
  if (treesEquiv > 0) {
    recs.push({
      icon: '\uD83C\uDF33',
      color: '#059669',
      bg: '#ecfdf5',
      border: '#a7f3d0',
      title: 'Environmental Impact',
      text: `Installing solar here saves ${result.co2Saved} tonnes of CO\u2082 per year \u2014 equivalent to planting ~${treesEquiv} trees annually.`,
    });
  }

  // Financial insight
  if (Number(result.paybackYears) > 0 && Number(result.paybackYears) <= 6) {
    recs.push({
      icon: '\uD83D\uDCB0',
      color: '#7c3aed',
      bg: '#f5f3ff',
      border: '#ddd6fe',
      title: 'Strong ROI',
      text: `Payback in just ${result.paybackYears} years. After that, you save \u20B9${Number(result.annualSavings).toLocaleString('en-IN')} every year \u2014 effectively free electricity for 20+ years.`,
    });
  } else if (Number(result.paybackYears) > 6) {
    recs.push({
      icon: '\uD83D\uDCCA',
      color: '#6366f1',
      bg: '#eef2ff',
      border: '#c7d2fe',
      title: 'Long-term Investment',
      text: `Payback period of ${result.paybackYears} years. Consider government subsidies (MNRE scheme provides 20-40% subsidy) to reduce this significantly.`,
    });
  }

  // Seasonal warning based on sunny hours
  if (result.sunnyHours <= 5) {
    recs.push({
      icon: '\uD83C\uDF24\uFE0F',
      color: '#b45309',
      bg: '#fffbeb',
      border: '#fde68a',
      title: 'Seasonal Consideration',
      text: `Only ${result.sunnyHours} sunny hours detected. Performance may vary significantly between seasons. Winter months may see reduced output.`,
    });
  }

  return (
    <div style={{ marginTop: 4 }}>
      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', color: '#1e3a5f', padding: '6px 0 2px', borderBottom: '2px solid #e0e7ff' }}>
        \uD83E\uDD16 SMART RECOMMENDATIONS
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
        {recs.map((rec, i) => (
          <div key={i} style={{
            padding: '10px 12px',
            background: rec.bg,
            border: `1px solid ${rec.border}`,
            borderRadius: 8,
            borderLeft: `4px solid ${rec.color}`,
            animation: `fadeSlideIn 0.4s ease-out ${i * 0.15}s both`,
          }}>
            <div style={{ fontWeight: 700, fontSize: 12, color: rec.color, marginBottom: 3 }}>
              {rec.icon} {rec.title}
            </div>
            <div style={{ fontSize: 11, color: '#374151', lineHeight: 1.5 }}>
              {rec.text}
            </div>
          </div>
        ))}
      </div>
      <style>{`@keyframes fadeSlideIn {
        from { opacity: 0; transform: translateY(8px); }
        to { opacity: 1; transform: translateY(0); }
      }`}</style>
    </div>
  );
};

const SolarSuitabilityTool = ({ view, onClose }) => {
  const contentDivRef = useRef(null);
  const daylightWidgetRef = useRef(null);
  const widgetContainerRef = useRef(null);
  const lodOriginalVisibility = useRef({});
  const clickHandle = useRef(null);
  const highlightHandleRef = useRef(null);

  const [position, setPosition] = useState({ top: 120, left: null, right: 20 });
  const [isBodyVisible, setIsBodyVisible] = useState(true);

  const [buildingLayer, setBuildingLayer] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);

  const [selectedBuilding, setSelectedBuilding] = useState(null);
  const [analysisMode, setAnalysisMode] = useState('existing');
  const [designedBuilding, setDesignedBuilding] = useState(null);
  const [isDrawingDesigned, setIsDrawingDesigned] = useState(false);
  const [designedFloors, setDesignedFloors] = useState(3);
  const [isPicking, setIsPicking] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const [analysisResult, setAnalysisResult] = useState(null);
  const [isWidgetReady, setIsWidgetReady] = useState(false);
  const [savedMsg, setSavedMsg] = useState(''); // 'saving' | 'saved' | ''

  // Resizable panel
  const [panelSize, setPanelSize] = useState({ width: 340, height: 520 });
  const resizingRef = useRef(null); // stores { startX, startY, startW, startH }

  const onResizeStart = (e) => {
    e.preventDefault();
    e.stopPropagation();
    resizingRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      startW: panelSize.width,
      startH: panelSize.height,
    };
    const onMove = (ev) => {
      if (!resizingRef.current) return;
      const { startX, startY, startW, startH } = resizingRef.current;
      const newW = Math.max(280, Math.min(700, startW + (ev.clientX - startX)));
      const newH = Math.max(320, Math.min(900, startH + (ev.clientY - startY)));
      setPanelSize({ width: newW, height: newH });
    };
    const onUp = () => {
      resizingRef.current = null;
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  const [simulating, setSimulating] = useState(false);
  const [simulationProgress, setSimulationProgress] = useState(0);

  // --- Seasonal Analysis state ---
  const seasonOptions = [
    { id: 'today', label: 'Today', dayOfYear: null },
    { id: 'summer', label: 'Summer Solstice (Jun 21)', dayOfYear: 172 },
    { id: 'winter', label: 'Winter Solstice (Dec 21)', dayOfYear: 355 },
    { id: 'equinox', label: 'Equinox (Mar 21)', dayOfYear: 80 },
    { id: 'monsoon', label: 'Monsoon (Aug 15)', dayOfYear: 227 },
  ];
  const [selectedSeason, setSelectedSeason] = useState('today');

  // --- What-If Building Simulator state ---
  const [simulatedBuildings, setSimulatedBuildings] = useState([]);
  const [isPlacingSimBuilding, setIsPlacingSimBuilding] = useState(false);
  const [simFloors, setSimFloors] = useState(8);
  const [simSizeM, setSimSizeM] = useState(20);
  const [showSimPanel, setShowSimPanel] = useState(false);
  const [drawingInstructions, setDrawingInstructions] = useState('');
  const sketchVMRef = useRef(null);       // SketchViewModel instance
  const sketchLayerRef = useRef(null);    // GraphicsLayer for sketch (actual layer object)
  const simGraphicsRef = useRef([]);      // All placed 3D extrusion graphics

  // --- Time Slider & Methodology ---
  const [timeSliderHour, setTimeSliderHour] = useState(12);
  const [isPlayingShadow, setIsPlayingShadow] = useState(false);
  const [showMethodology, setShowMethodology] = useState(false);
  const [editingSimId, setEditingSimId] = useState(null);
  const [editFloorValue, setEditFloorValue] = useState(8);

  // Initialize tool: LOD layers & find building layer
  useEffect(() => {
    if (!view || !view.map) return;

    // 1. LOD Layers: enable by title (search top-level AND inside group layers)
    function findAndEnableLayers(layers) {
      layers.forEach(layer => {
        if (lodTitles.includes(layer.title)) {
          lodOriginalVisibility.current[layer.title] = layer.visible;
          layer.visible = true;
          console.log(`[Solar] Enabled LOD layer: "${layer.title}"`);
        }
        // Also recurse into group layers
        if (layer.layers) {
          findAndEnableLayers(layer.layers);
        }
      });
    }
    findAndEnableLayers(view.map.layers);


    view.environment.lighting.directShadowsEnabled = true;
    view.environment.lighting.ambientOcclusionEnabled = true;

    // 2. Find Building layer
    function findBuildingLayer(map) {
      let found = null;
      map.layers.forEach(layer => {
        if (!found) {
          if (layer.title?.toLowerCase() === 'building' && layer.type === 'feature') {
            found = layer;
          } else if (layer.type === 'group' || layer.layers) {
            layer.layers?.forEach(child => {
              if (!found && child.title?.toLowerCase() === 'building' && child.type === 'feature') {
                found = child;
              }
              if (!found && (child.type === 'group' || child.layers)) {
                child.layers?.forEach(grandchild => {
                  if (!found && grandchild.title?.toLowerCase() === 'building') {
                    found = grandchild;
                  }
                });
              }
            });
          }
        }
      });
      return found;
    }

    const bLayer = findBuildingLayer(view.map);
    if (bLayer) {
      setBuildingLayer(bLayer);
      view.when(() => {
        bLayer.queryFeatures({
          where: "1=1",
          outFields: ["*"],
          num: 3,
          returnGeometry: false
        }).then(result => {
          console.log("=== BUILDING LAYER FIELDS ===");
          console.log("Fields:", bLayer.fields?.map(f => `${f.name} (${f.type})`));
          console.log("Sample attrs:", result.features.map(f => f.attributes));
        });
      });
    } else {
      setErrorMsg("Building layer not found in the map. Search and pick on map will not work.");
    }

    return () => {
      // Restore LOD layers
      function restoreLayers(layers) {
        layers.forEach(layer => {
          if (lodOriginalVisibility.current[layer.title] !== undefined) {
            layer.visible = lodOriginalVisibility.current[layer.title];
          }
          if (layer.layers) restoreLayers(layer.layers);
        });
      }
      restoreLayers(view.map.layers);

      // Destroy widget and clear graphics
      if (daylightWidgetRef.current) {
        daylightWidgetRef.current.destroy();
        daylightWidgetRef.current = null;
      }
      if (clickHandle.current) {
        clickHandle.current.remove();
      }
      if (highlightHandleRef.current) {
        highlightHandleRef.current.remove();
      }
      view.graphics.removeAll();
      view.environment.lighting.directShadowsEnabled = false;
      view.environment.lighting.ambientOcclusionEnabled = false;
    };
  }, [view]);

  // Handle Daylight Widget Creation
  useEffect(() => {
    if (analysisResult && widgetContainerRef.current && !daylightWidgetRef.current) {
      const widget = new Daylight({
        view: view,
        playSpeedMultiplier: 1,
        visibleElements: { shadowsToggle: true },
        container: widgetContainerRef.current
      });
      daylightWidgetRef.current = widget;

      setTimeout(() => {
        const container = widgetContainerRef.current;
        if (!container) return;

        container.querySelectorAll('.esri-widget__heading, .esri-daylight__header')
          .forEach(el => el.style.display = 'none');

        container.querySelectorAll('button[aria-label="Close"], .esri-daylight__close-button')
          .forEach(el => el.style.display = 'none');

        const inner = container.querySelector('.esri-daylight');
        if (inner) {
          inner.style.paddingTop = '0';
          inner.style.boxShadow = 'none';
          inner.style.borderRadius = '0';
          inner.style.background = 'transparent';
        }
        setIsWidgetReady(true);
      }, 300);
    }
  }, [analysisResult, view]);

  // Drag logic
  const onDragStart = useCallback((e) => {
    e.preventDefault();
    if (e.target.dataset.role === "close-button" || e.target.dataset.role === "collapse-button") return;

    const container = contentDivRef.current;
    if (!container) return;

    const parent = container.offsetParent;
    if (!parent) return;

    const parentRect = parent.getBoundingClientRect();
    const rect = container.getBoundingClientRect();
    const offsetX = e.clientX - rect.left;
    const offsetY = e.clientY - rect.top;

    const onMouseMove = (moveEvent) => {
      let newLeft = moveEvent.clientX - parentRect.left - offsetX;
      let newTop = moveEvent.clientY - parentRect.top - offsetY;
      if (newLeft < 0) newLeft = 0;
      if (newLeft + rect.width > parentRect.width) newLeft = parentRect.width - rect.width;
      if (newTop < 0) newTop = 0;
      if (newTop + rect.height > parentRect.height) newTop = parentRect.height - rect.height;

      setPosition({ top: newTop, left: newLeft, right: null });
    };

    const onMouseUp = () => {
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
    };

    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
  }, []);

  const handleSearch = async () => {
    if (!buildingLayer || !searchTerm) return;
    setLoading(true);
    try {
      const query = buildingLayer.createQuery();
      query.where = `UPPER(name) LIKE '%${searchTerm.toUpperCase()}%' OR UPPER(address) LIKE '%${searchTerm.toUpperCase()}%'`;
      query.outFields = ["*"];
      query.returnGeometry = true;
      query.num = 10;

      const results = await buildingLayer.queryFeatures(query);
      if (results.features.length > 0) {
        setSearchResults(results.features);
      } else {
        // Fallback for ID search
        const fallbackQuery = buildingLayer.createQuery();
        fallbackQuery.where = `objectid = ${searchTerm}`;
        fallbackQuery.outFields = ["*"];
        fallbackQuery.returnGeometry = true;
        const fallbackResults = await buildingLayer.queryFeatures(fallbackQuery).catch(() => ({ features: [] }));
        setSearchResults(fallbackResults.features);
      }
    } catch (err) {
      console.warn("Search query failed.", err);
    }
    setLoading(false);
  };

  function getBuildingInfo(attributes) {
    if (!attributes) return { name: 'Unknown', floors: null, height: null, area: null, id: null, raw: {} };

    // Name: use 'name' if not blank, else 'address', else bld_id
    const rawName = attributes['name']?.trim();
    const rawAddress = attributes['address']?.trim();
    const name = (rawName && rawName !== '')
      ? rawName
      : (rawAddress && rawAddress !== '')
        ? rawAddress
        : `Building #${attributes['bld_id'] ?? attributes['objectid'] ?? '?'}`;

    // Floors: stored as "G+5", "G+3", "G+0", "G" — show as-is
    const noFloorsRaw = attributes['no_floors'];
    let floorsDisplay = null;
    if (noFloorsRaw != null && String(noFloorsRaw).trim() !== '') {
      floorsDisplay = String(noFloorsRaw).trim();
    }

    // Height: direct double field
    const height = attributes['height'] != null && parseFloat(attributes['height']) > 0
      ? parseFloat(attributes['height']).toFixed(1)
      : null;

    // Area: area_sqmtr
    const area = attributes['area_sqmtr'] != null && parseFloat(attributes['area_sqmtr']) > 0
      ? parseFloat(attributes['area_sqmtr']).toFixed(1)
      : null;

    // ID
    const id = attributes['bld_id'] ?? attributes['objectid'];

    return { name, floors: floorsDisplay, height, area, id, raw: attributes };
  }

  const selectBuilding = async (feature) => {
    setSelectedBuilding(feature);
    setSearchResults([]);
    setIsPicking(false);

    // Clear any previous highlight graphic
    view.graphics.removeAll();
    if (highlightHandleRef.current) {
      highlightHandleRef.current.remove();
      highlightHandleRef.current = null;
    }

    // 3D-aware highlight: extrude a translucent cyan building matching the real height
    try {
      const [GImport, PolygonSymbol3D, ExtrudeSymbol3DLayer, SimpleFillSymbol] = await Promise.all([
        import('@arcgis/core/Graphic.js').then(m => m.default),
        import('@arcgis/core/symbols/PolygonSymbol3D.js').then(m => m.default),
        import('@arcgis/core/symbols/ExtrudeSymbol3DLayer.js').then(m => m.default),
        import('@arcgis/core/symbols/SimpleFillSymbol.js').then(m => m.default),
      ]);

      if (feature.geometry) {
        // Determine building height for the 3D extrusion
        const attrs = feature.attributes || {};
        let highlightHeight = parseFloat(attrs['height']) > 0 ? parseFloat(attrs['height']) : null;
        if (!highlightHeight && attrs['no_floors']) {
          const m = String(attrs['no_floors']).match(/(\d+)/);
          highlightHeight = m ? (parseInt(m[1]) + 1) * 3.2 : 6;
        }
        if (!highlightHeight) highlightHeight = 8; // fallback

        // 3D extruded highlight — glowing cyan translucent building overlay
        const highlight3D = new GImport({
          geometry: feature.geometry,
          symbol: new PolygonSymbol3D({
            symbolLayers: [new ExtrudeSymbol3DLayer({
              size: highlightHeight + 1, // slightly taller to wrap the LOD
              material: { color: [0, 210, 255, 0.35] },
              edges: { type: 'solid', color: [0, 230, 255, 0.9], size: 2 },
            })],
          }),
        });
        view.graphics.add(highlight3D);

        // Also add a ground-level bright outline for extra visibility
        const highlightBase = new GImport({
          geometry: feature.geometry,
          symbol: new SimpleFillSymbol({
            color: [0, 230, 255, 0.15],
            outline: { color: [0, 230, 255, 1], width: 3 },
          }),
        });
        view.graphics.add(highlightBase);

        highlightHandleRef.current = {
          remove: () => {
            view.graphics.remove(highlight3D);
            view.graphics.remove(highlightBase);
          }
        };
      }
    } catch (err) {
      console.warn('3D Highlight failed:', err);
    }

    // Zoom to building — closer zoom (20) so building is clearly visible
    if (feature.geometry) {
      try {
        await view.goTo(
          { target: feature.geometry, zoom: 20, tilt: 60 },
          { duration: 800, easing: 'ease-in-out' }
        );
      } catch (err) {
        console.warn('goTo failed:', err);
      }
    }

    if (clickHandle.current) {
      clickHandle.current.remove();
      clickHandle.current = null;
    }
  };


  const enablePicking = () => {
    setIsPicking(true);
    if (clickHandle.current) clickHandle.current.remove();

    clickHandle.current = view.on("click", async (event) => {
      try {
        // Step 1: Try hitTest first — returns actual graphic linked to layerView
        const hitResult = await view.hitTest(event, { include: [buildingLayer] });

        let feature = null;

        if (hitResult.results && hitResult.results.length > 0) {
          const hit = hitResult.results[0];
          feature = hit.graphic;
          // Ensure full attributes are loaded (hitTest may return partial)
          if (!feature.attributes || Object.keys(feature.attributes).length < 5) {
            const q = buildingLayer.createQuery();
            q.objectIds = [feature.attributes?.objectid ?? feature.attributes?.OBJECTID];
            q.outFields = ['*'];
            q.returnGeometry = true;
            const res = await buildingLayer.queryFeatures(q);
            if (res.features.length > 0) feature = res.features[0];
          }
        } else {
          // Step 2: Fallback — spatial query at click point
          const q = buildingLayer.createQuery();
          q.geometry = event.mapPoint;
          q.spatialRelationship = 'intersects';
          q.returnGeometry = true;
          q.outFields = ['*'];
          q.num = 1;
          const res = await buildingLayer.queryFeatures(q);
          if (res.features.length > 0) feature = res.features[0];
        }

        if (feature) {
          await selectBuilding(feature);
        } else {
          console.warn("No building found at click location.");
        }
      } catch (err) {
        console.warn("Error picking building:", err);
      }
    });
  };

  function getSolarPosition(hour, dayOfYear) {
    // Use today's actual day-of-year for consistency with the visual Daylight widget
    if (dayOfYear == null) {
      const now = new Date();
      dayOfYear = Math.floor((now - new Date(now.getFullYear(), 0, 0)) / 86400000);
    }
    const lat = 19.076 * Math.PI / 180;
    const B = (360 / 365) * (dayOfYear - 81) * Math.PI / 180;
    const declination = 23.45 * Math.sin(B) * Math.PI / 180;
    const hourAngle = (hour - 12) * 15 * Math.PI / 180;

    const sinAlt = Math.sin(lat) * Math.sin(declination) +
      Math.cos(lat) * Math.cos(declination) * Math.cos(hourAngle);
    const altitude = Math.asin(Math.max(-1, Math.min(1, sinAlt)));

    const azimuth = Math.atan2(
      -Math.cos(declination) * Math.sin(hourAngle),
      Math.sin(declination) * Math.cos(lat) -
      Math.cos(declination) * Math.cos(hourAngle) * Math.sin(lat)
    );

    return {
      altitudeDeg: altitude * 180 / Math.PI,
      altitudeRad: altitude,
      azimuthRad: azimuth
    };
  }

  /**
   * Convert any ring centroid to geographic lon/lat.
   * Handles both WebMercator (3857/102100) and Geographic (4326) inputs.
   * WebMercator uses the proper inverse Mercator formula.
   */
  function ringToLonLat(ring, sr) {
    const cx = ring.reduce((s, v) => s + v[0], 0) / ring.length;
    const cy = ring.reduce((s, v) => s + v[1], 0) / ring.length;
    const isWM = sr && (sr.wkid === 3857 || sr.wkid === 102100 ||
      (sr.latestWkid && (sr.latestWkid === 3857 || sr.latestWkid === 102100)));
    if (isWM) {
      const R = 6378137;
      const lon = (cx / R) * (180 / Math.PI);
      const lat = (2 * Math.atan(Math.exp(cy / R)) - Math.PI / 2) * (180 / Math.PI);
      return { lon, lat };
    }
    // Already geographic
    return { lon: cx, lat: cy };
  }

  /**
   * Bounding-box diameter of a ring in meters.
   * Handles WebMercator and Geographic inputs.
   */
  function ringDiameterM(ring, sr) {
    const isWM = sr && (sr.wkid === 3857 || sr.wkid === 102100 ||
      (sr.latestWkid && (sr.latestWkid === 3857 || sr.latestWkid === 102100)));
    const xs = ring.map(v => v[0]);
    const ys = ring.map(v => v[1]);
    let wM, hM;
    if (isWM) {
      wM = Math.max(...xs) - Math.min(...xs);
      hM = Math.max(...ys) - Math.min(...ys);
    } else {
      const avgLat = (Math.max(...ys) + Math.min(...ys)) / 2;
      wM = (Math.max(...xs) - Math.min(...xs)) * 111320 * Math.cos(avgLat * Math.PI / 180);
      hM = (Math.max(...ys) - Math.min(...ys)) * 110540;
    }
    return Math.sqrt(wM * wM + hM * hM);
  }

  /**
   * Compute the shadow polygon cast by a neighbour building at the rooftop
   * level of the selected building. Returns a polygon geometry or null.
   *
   * Uses the convex hull of the original footprint + shifted footprint to
   * capture both roof and wall shadows, avoiding self-intersecting polygons.
   */
  function computeShadowPolygon(neighbourGeom2D, nHeight, selectedHeight, solar) {
    if (solar.altitudeRad <= 0.087) return null; // sun below ~5°

    const effectiveHeight = Math.max(0, nHeight - (selectedHeight || 0));
    if (effectiveHeight <= 0) return null;

    const shadowLength = effectiveHeight / Math.tan(solar.altitudeRad);
    const shadowAzimuth = solar.azimuthRad + Math.PI; // shadow falls opposite to sun

    // Shadow offset in metres
    const dxM = shadowLength * Math.sin(shadowAzimuth);
    const dyM = shadowLength * Math.cos(shadowAzimuth);

    // Convert metres to coordinate units
    const sr = neighbourGeom2D.spatialReference;
    const isWM = sr && (sr.wkid === 3857 || sr.wkid === 102100 ||
      (sr.latestWkid && (sr.latestWkid === 3857 || sr.latestWkid === 102100)));

    let dxC, dyC;
    if (isWM) {
      dxC = dxM;
      dyC = dyM;
    } else {
      // Geographic (4326): convert metres to degrees
      const ring = neighbourGeom2D.rings[0];
      const avgLat = ring.reduce((s, v) => s + v[1], 0) / ring.length;
      dxC = dxM / (111320 * Math.cos(avgLat * Math.PI / 180));
      dyC = dyM / 110540;
    }

    try {
      const ring = neighbourGeom2D.rings[0];
      if (!ring || ring.length < 3) return null;

      const original = ring.map(v => [v[0], v[1]]);
      const shifted = ring.map(v => [v[0] + dxC, v[1] + dyC]);

      // Use convex hull of original + shifted to avoid self-intersecting polygons
      const allPts = [...original, ...shifted];
      const hull = convexHull2D(allPts);
      if (hull.length < 3) return null;

      // Close the ring
      const shadowRing = [...hull, hull[0]];

      return {
        type: 'polygon',
        rings: [shadowRing],
        spatialReference: sr,
      };
    } catch (err) {
      console.warn('[Shadow] computeShadowPolygon failed:', err);
      return null;
    }
  }

  /**
   * Compute the 2D convex hull of a set of [x,y] points.
   * Uses Andrew's monotone chain algorithm — O(n log n).
   */
  function convexHull2D(points) {
    const pts = points.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    if (pts.length <= 2) return pts;

    const cross = (O, A, B) =>
      (A[0] - O[0]) * (B[1] - O[1]) - (A[1] - O[1]) * (B[0] - O[0]);

    // Lower hull
    const lower = [];
    for (const p of pts) {
      while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0)
        lower.pop();
      lower.push(p);
    }

    // Upper hull
    const upper = [];
    for (let i = pts.length - 1; i >= 0; i--) {
      const p = pts[i];
      while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0)
        upper.pop();
      upper.push(p);
    }

    // Remove last point of each half (duplicated at junction)
    return lower.slice(0, -1).concat(upper.slice(0, -1));
  }

  async function runShadowAnalysis(designedOverride = null) {
    const targetBuilding = designedOverride || selectedBuilding;
    if (!targetBuilding) return;

    setSimulating(true);

    // Get the dayOfYear from selected season
    const seasonDayOfYear = seasonOptions.find(s => s.id === selectedSeason)?.dayOfYear || null;
    setSimulationProgress(0);

    const attrs = targetBuilding.attributes;

    // --- 1. Get selected building geometry and area ---
    // Flatten selectedGeom to 2D so geometryEngine.intersect works with shadow polygons
    const rawGeom = targetBuilding.geometry;
    let selectedGeom2D = {
      type: "polygon",
      rings: rawGeom.rings.map(ring => ring.map(v => [v[0], v[1]])),
      spatialReference: rawGeom.spatialReference
    };

    // --- SR NORMALISATION ---
    // Ensure selectedGeom2D is in the view's spatial reference (Web Mercator)
    // so it matches simulated buildings (drawn via SketchViewModel in view SR)
    const viewSR = view.spatialReference;
    const _isWM = (sr) => sr && (sr.wkid === 3857 || sr.wkid === 102100 ||
      (sr.latestWkid && (sr.latestWkid === 3857 || sr.latestWkid === 102100)));
    const viewIsWM = _isWM(viewSR);
    const selIsWM = _isWM(selectedGeom2D.spatialReference);

    if (viewIsWM && !selIsWM) {
      // Selected building is in geographic (4326), view is WM — project to WM
      try {
        const projected = webMercatorUtils.geographicToWebMercator(selectedGeom2D);
        selectedGeom2D = {
          type: 'polygon',
          rings: projected.rings.map(r => r.map(v => [v[0], v[1]])),
          spatialReference: projected.spatialReference,
        };
        console.log('[Solar] Projected selectedGeom2D from 4326 → WM');
      } catch (projErr) {
        console.warn('[Solar] Failed to project selectedGeom2D to WM:', projErr);
      }
    } else if (!viewIsWM && selIsWM) {
      // Selected building is in WM, view is geographic — project to geographic
      try {
        const projected = webMercatorUtils.webMercatorToGeographic(selectedGeom2D);
        selectedGeom2D = {
          type: 'polygon',
          rings: projected.rings.map(r => r.map(v => [v[0], v[1]])),
          spatialReference: projected.spatialReference,
        };
        console.log('[Solar] Projected selectedGeom2D from WM → 4326');
      } catch (projErr) {
        console.warn('[Solar] Failed to project selectedGeom2D to 4326:', projErr);
      }
    }

    // Use the normalised SR for all subsequent geometry operations
    const analysisSR = selectedGeom2D.spatialReference;

    let area = 0;
    if (attrs['area_sqmtr'] > 0) area = parseFloat(attrs['area_sqmtr']);
    if (selectedGeom2D) {
      const calcArea = Math.abs(geometryEngine.geodesicArea(selectedGeom2D, "square-meters"));
      if (calcArea > 0) area = calcArea;
    }
    if (area <= 0) area = 50;

    // --- 2. Get selected building height ---
    const selectedHeight = parseFloat(attrs['height']) > 0 ? parseFloat(attrs['height']) : null;
    let estimatedHeight = selectedHeight;
    if (!estimatedHeight && attrs['no_floors']) {
      const m = String(attrs['no_floors']).match(/(\d+)/);
      estimatedHeight = m ? (parseInt(m[1]) + 1) * 3 : 6;
    }
    const floors = attrs['no_floors'] ? String(attrs['no_floors']).trim() : null;

    // --- 3. Query all neighbouring buildings within 200m ---
    // Use the same SR as selectedGeom2D so all geometry operations are consistent
    let neighbourFeatures = [];
    try {
      const buffer = geometryEngine.geodesicBuffer(selectedGeom2D, 200, "meters");
      const q = buildingLayer.createQuery();
      q.geometry = buffer;
      q.spatialRelationship = 'intersects';
      q.outFields = ['objectid', 'height', 'no_floors'];
      q.returnGeometry = true;
      q.outSpatialReference = analysisSR;  // ← Force same SR as selected building
      q.num = 100;
      q.orderByFields = ['height DESC'];
      q.where = `objectid <> ${attrs['objectid']} AND (height > ${(estimatedHeight || 0)} OR no_floors IS NOT NULL)`;
      const res = await buildingLayer.queryFeatures(q);
      neighbourFeatures = res.features;
      console.log(`Neighbours found: ${neighbourFeatures.length}, tallest: ${neighbourFeatures[0]?.attributes?.height}m`);
    } catch (err) {
      console.warn("Neighbour query failed:", err);
    }

    // Snapshot simulated buildings — project each to the analysis SR for consistency
    const simSnapshot = simulatedBuildings.map(sb => {
      let geom = {
        type: 'polygon',
        rings: sb.geometry.rings.map(r => r.map(v => [v[0], v[1]])),
        spatialReference: sb.geometry.spatialReference || { wkid: 4326 },
      };

      // Project simulated building geometry to match the analysis SR
      const simIsWM = _isWM(geom.spatialReference);
      const analysisIsWM = _isWM(analysisSR);
      if (simIsWM && !analysisIsWM) {
        try {
          const proj = webMercatorUtils.webMercatorToGeographic(geom);
          geom = { type: 'polygon', rings: proj.rings.map(r => r.map(v => [v[0], v[1]])), spatialReference: proj.spatialReference };
          console.log('[SimBuilding] Projected sim building from WM → 4326');
        } catch (e) { console.warn('[SimBuilding] Projection WM→4326 failed:', e); }
      } else if (!simIsWM && analysisIsWM) {
        try {
          const proj = webMercatorUtils.geographicToWebMercator(geom);
          geom = { type: 'polygon', rings: proj.rings.map(r => r.map(v => [v[0], v[1]])), spatialReference: proj.spatialReference };
          console.log('[SimBuilding] Projected sim building from 4326 → WM');
        } catch (e) { console.warn('[SimBuilding] Projection 4326→WM failed:', e); }
      }

      return {
        attributes: { height: sb.height, no_floors: String(sb.floors) },
        geometry: geom,
        _isSim: true,
      };
    });
    console.log('[SimBuilding] simSnapshot count:', simSnapshot.length,
      simSnapshot.map(s => `h=${s.attributes.height}m SR=${s.geometry.spatialReference?.wkid || s.geometry.spatialReference?.latestWkid}`).join(', '));
    const allNeighbours = [...neighbourFeatures, ...simSnapshot];
    console.log(`[Solar] Analysis SR: wkid=${analysisSR?.wkid}, Simulated buildings: ${simSnapshot.length}, total neighbours: ${allNeighbours.length}`);

    // --- 4. Animate the view lighting AND compute real shadow geometry per hour ---
    const today = new Date();
    const hours = Array.from({ length: 13 }, (_, i) => i + 6); // 6 to 18
    let sunnyHours = 0;
    const hourlyResults = [];

    for (let i = 0; i < hours.length; i++) {
      const hour = hours[i];

      // Animate view lighting (visual feedback for user)
      const date = new Date(today);
      date.setHours(hour, 0, 0, 0);
      view.environment.lighting.date = date;
      setSimulationProgress(Math.round((i / hours.length) * 100));

      // Compute real solar position
      const solar = getSolarPosition(hour, seasonDayOfYear);

      if (solar.altitudeDeg < 5) {
        hourlyResults.push({ hour, sunlitPct: 0, sunny: false });
        await new Promise(r => setTimeout(r, 150));
        continue;
      }

      // --- Polygon-based shadow analysis for this hour ---
      const shadowPolygons = [];

      for (const neighbour of allNeighbours) {
        const nAttrs = neighbour.attributes;
        let nHeight = parseFloat(nAttrs['height']) > 0 ? parseFloat(nAttrs['height']) : null;
        if (!nHeight && nAttrs['no_floors']) {
          const m = String(nAttrs['no_floors']).match(/(\d+)/);
          nHeight = m ? (parseInt(m[1]) + 1) * 3 : 6;
        }
        if (!nHeight || !neighbour.geometry) continue;

        let nGeom2D = {
          type: "polygon",
          rings: neighbour.geometry.rings.map(ring => ring.map(v => [v[0], v[1]])),
          spatialReference: neighbour.geometry.spatialReference || analysisSR,
        };

        // Ensure neighbour geometry is in the analysis SR
        const nIsWM = _isWM(nGeom2D.spatialReference);
        const aIsWM = _isWM(analysisSR);
        if (nIsWM && !aIsWM) {
          try {
            const proj = webMercatorUtils.webMercatorToGeographic(nGeom2D);
            nGeom2D = { type: 'polygon', rings: proj.rings.map(r => r.map(v => [v[0], v[1]])), spatialReference: proj.spatialReference };
          } catch (e) { console.warn('[Shadow] Neighbour SR projection failed:', e); }
        } else if (!nIsWM && aIsWM) {
          try {
            const proj = webMercatorUtils.geographicToWebMercator(nGeom2D);
            nGeom2D = { type: 'polygon', rings: proj.rings.map(r => r.map(v => [v[0], v[1]])), spatialReference: proj.spatialReference };
          } catch (e) { console.warn('[Shadow] Neighbour SR projection failed:', e); }
        }

        const shadowPoly = computeShadowPolygon(nGeom2D, nHeight, estimatedHeight || 0, solar);
        if (shadowPoly) {
          shadowPolygons.push(shadowPoly);
          if (neighbour._isSim && (hour === 8 || hour === 12 || hour === 16)) {
            console.log(`[SimShadow] h=${hour} nH=${nHeight} effH=${nHeight - (estimatedHeight || 0)} shadowLen=${(Math.max(0, nHeight - (estimatedHeight || 0)) / Math.tan(solar.altitudeRad)).toFixed(1)}m`);
          }
        } else if (neighbour._isSim && (hour === 8 || hour === 12 || hour === 16)) {
          console.warn(`[SimShadow] h=${hour} shadow polygon NULL — nH=${nHeight} selH=${estimatedHeight} effH=${nHeight - (estimatedHeight || 0)}`);
        }
      }

      // Compute shadow fraction via polygon union + intersection
      let totalShadowFraction = 0;
      if (shadowPolygons.length > 0) {
        try {
          // Union all shadow polygons, then intersect once with the target rooftop
          const combinedShadow = shadowPolygons.length === 1
            ? shadowPolygons[0]
            : geometryEngine.union(shadowPolygons);
          const intersection = geometryEngine.intersect(combinedShadow, selectedGeom2D);
          if (intersection) {
            const intersectArea = Math.abs(geometryEngine.geodesicArea(intersection, 'square-meters'));
            totalShadowFraction = Math.min(1.0, intersectArea / Math.max(area, 1));
          }
        } catch (unionErr) {
          console.warn(`[Shadow] Union/intersect failed at hour ${hour}, falling back to individual:`, unionErr?.message || unionErr);
          // Fallback: intersect each shadow polygon individually and sum
          for (const sp of shadowPolygons) {
            try {
              const inter = geometryEngine.intersect(sp, selectedGeom2D);
              if (inter) {
                const iArea = Math.abs(geometryEngine.geodesicArea(inter, 'square-meters'));
                totalShadowFraction = Math.min(1.0, totalShadowFraction + iArea / Math.max(area, 1));
              }
            } catch (spErr) {
              console.warn(`[Shadow] Individual intersect failed:`, spErr?.message || spErr);
            }
          }
        }
      }

      // Debug at key hours
      if (hour === 8 || hour === 12 || hour === 16) {
        console.log(`=== HOUR ${hour} ===`);
        console.log(`Sun alt: ${solar.altitudeDeg.toFixed(1)}°, azimuth: ${(solar.azimuthRad * 180 / Math.PI).toFixed(1)}°`);
        console.log(`Shadow polygons built: ${shadowPolygons.length}`);
        console.log(`Shadow fraction: ${totalShadowFraction.toFixed(3)} → sunlit: ${((1 - totalShadowFraction) * 100).toFixed(1)}%`);
      }

      const sunlitPct = Math.max(0, (1 - totalShadowFraction) * 100);
      const isSunny = sunlitPct > 30;
      if (isSunny) sunnyHours++;
      hourlyResults.push({ hour, sunlitPct: sunlitPct.toFixed(0), sunny: isSunny });

      await new Promise(r => setTimeout(r, 150)); // pacing for visual effect
    }

    // Reset lighting to noon
    const noon = new Date(today);
    noon.setHours(12, 0, 0, 0);
    view.environment.lighting.date = noon;

    // --- 5. Compute final score from REAL data ---
    // Denominator = hours where sun altitude >= 5° (eligible hours), not all 13
    const eligibleHours = hourlyResults.filter(h => {
      const solar = getSolarPosition(h.hour, seasonDayOfYear);
      return solar.altitudeDeg >= 5;
    }).length;
    const sunlightScore = eligibleHours > 0 ? (sunnyHours / eligibleHours) * 100 : 0;
    const areaScore = Math.min(100, (Math.log10(Math.max(area, 1)) / Math.log10(500)) * 100);
    const heightScore = estimatedHeight ? Math.min(100, (estimatedHeight / 50) * 100) : 40;
    const irradianceScore = 92;

    const finalScore = Math.round(
      (sunlightScore * 0.50) +
      (areaScore * 0.20) +
      (heightScore * 0.10) +
      (irradianceScore * 0.20)
    );
    const clampedScore = Math.max(0, Math.min(100, finalScore));

    const usableArea = area * 0.70;
    const capacity = (usableArea * 0.15).toFixed(1);
    const generation = (parseFloat(capacity) * 1500).toFixed(0);

    const avgSunlit = (
      hourlyResults.reduce((sum, h) => sum + parseFloat(h.sunlitPct), 0) / hourlyResults.length
    ).toFixed(0);

    let potentialLabel = "Good Solar Potential";
    if (clampedScore <= 40) potentialLabel = "Low Solar Potential";
    else if (clampedScore <= 70) potentialLabel = "Moderate Solar Potential";

    // Compute without simulated buildings for baseline comparison
    let baselineScore = clampedScore;
    if (simSnapshot.length > 0) {
      // Re-run score ignoring simulated buildings (polygon-based)
      let baseSunnyHours = 0;
      for (const hrData of hourlyResults) {
        const solar = getSolarPosition(hrData.hour, seasonDayOfYear);
        if (solar.altitudeDeg < 5) continue;
        const baseShadows = [];
        for (const neighbour of neighbourFeatures) {
          const nAttrs = neighbour.attributes;
          let nH = parseFloat(nAttrs['height']) > 0 ? parseFloat(nAttrs['height']) : null;
          if (!nH && nAttrs['no_floors']) {
            const mm = String(nAttrs['no_floors']).match(/(\d+)/);
            nH = mm ? (parseInt(mm[1]) + 1) * 3 : 6;
          }
          if (!nH || !neighbour.geometry) continue;
          // Use analysisSR for consistency (neighbour query already uses outSpatialReference)
          const nGeom2D = { type: 'polygon', rings: neighbour.geometry.rings.map(r => r.map(v => [v[0], v[1]])), spatialReference: neighbour.geometry.spatialReference || analysisSR };
          const sp = computeShadowPolygon(nGeom2D, nH, estimatedHeight || 0, solar);
          if (sp) baseShadows.push(sp);
        }
        let baseFrac = 0;
        if (baseShadows.length > 0) {
          try {
            const combined = baseShadows.length === 1 ? baseShadows[0] : geometryEngine.union(baseShadows);
            const inter = geometryEngine.intersect(combined, selectedGeom2D);
            if (inter) baseFrac = Math.min(1.0, Math.abs(geometryEngine.geodesicArea(inter, 'square-meters')) / Math.max(area, 1));
          } catch (baseErr) {
            console.warn('[Baseline] Union/intersect failed, falling back:', baseErr?.message);
            for (const sp of baseShadows) {
              try {
                const inter = geometryEngine.intersect(sp, selectedGeom2D);
                if (inter) baseFrac = Math.min(1.0, baseFrac + Math.abs(geometryEngine.geodesicArea(inter, 'square-meters')) / Math.max(area, 1));
              } catch (spErr) {
                console.warn('[Baseline] Individual intersect failed:', spErr?.message);
              }
            }
          }
        }
        if ((1 - baseFrac) * 100 > 30) baseSunnyHours++;
      }
      const baseSunlightScore = eligibleHours > 0 ? (baseSunnyHours / eligibleHours) * 100 : 0;
      baselineScore = Math.max(0, Math.min(100, Math.round(
        (baseSunlightScore * 0.50) + (areaScore * 0.20) + (heightScore * 0.10) + (irradianceScore * 0.20)
      )));
      console.log(`[Solar] Baseline (no sim): sunnyHrs=${baseSunnyHours}, score=${baselineScore} | With sim: score=${clampedScore} | Impact=${clampedScore - baselineScore}`);
    }

    const simImpact = simSnapshot.length > 0 ? (clampedScore - baselineScore) : null;

    // --- Extended metrics for dashboard & PDF ---
    const capacityNum = parseFloat(capacity);
    const generationNum = parseFloat(generation);
    // CO₂ savings: 0.82 kg per kWh (India grid emission factor)
    const co2Saved = (generationNum * 0.82 / 1000).toFixed(2); // tonnes/yr
    // Financial: avg tariff ₹7/unit in Mumbai
    const annualSavings = (generationNum * 7).toFixed(0); // ₹/yr
    // Installation cost: ₹60,000 per kWp
    const installCost = (capacityNum * 60000).toFixed(0);
    // Payback period
    const paybackYears = parseFloat(annualSavings) > 0
      ? (parseFloat(installCost) / parseFloat(annualSavings)).toFixed(1)
      : '—';
    // Panel count: 330W panel, 1.7m² each
    const panelCount = Math.floor((usableArea * 0.85) / 1.7);
    // Roof orientation classification based on score ranges
    let suitabilityClass = 'Highly Suitable';
    if (clampedScore < 40) suitabilityClass = 'Less Suitable';
    else if (clampedScore < 55) suitabilityClass = 'Moderately Suitable';
    else if (clampedScore < 70) suitabilityClass = 'Suitable';

    setAnalysisResult({
      score: clampedScore,
      label: potentialLabel,
      seasonLabel: seasonOptions.find(s => s.id === selectedSeason)?.label || 'Today',
      suitabilityClass,
      sunnyHours,
      avgSunlit,
      hourlyResults,
      area: area.toFixed(1),
      usableArea: usableArea.toFixed(1),
      floors: floors ?? '—',
      height: estimatedHeight ? estimatedHeight.toFixed(1) : '—',
      capacity,
      generation,
      co2Saved,
      annualSavings,
      installCost,
      paybackYears,
      panelCount,
      neighbourCount: neighbourFeatures.length,
      simCount: simSnapshot.length,
      baselineScore: simSnapshot.length > 0 ? baselineScore : null,
      simImpact,
    });

    setSimulating(false);
    setLoading(false);
  }

  // --- Simulated building helpers ---

  /**
   * Draw a yellow 3D extruded building graphic using a polygon geometry.
   */
  async function drawSimBuildingGraphic(geom, floors, mode = 'sim') {
    try {
      const [PolygonSymbol3D, ExtrudeSymbol3DLayer] = await Promise.all([
        import('@arcgis/core/symbols/PolygonSymbol3D.js').then(m => m.default),
        import('@arcgis/core/symbols/ExtrudeSymbol3DLayer.js').then(m => m.default),
      ]);
      const heightM = floors * 3.2;
      const isDesigned = mode === 'designed';
      const graphic = new Graphic({
        geometry: geom,
        symbol: new PolygonSymbol3D({
          symbolLayers: [new ExtrudeSymbol3DLayer({
            size: heightM,
            material: { color: isDesigned ? [34, 197, 94, 0.70] : [255, 200, 0, 0.70] },
            edges: { type: 'solid', color: isDesigned ? [22, 163, 74, 1] : [200, 120, 0, 1], size: 2 },
          })],
        }),
      });
      view.graphics.add(graphic);
      return graphic;
    } catch (err) {
      console.warn('[SimBuilding] Failed to draw 3D graphic:', err);
      return null;
    }
  }

  /**
   * Cancel and destroy any active SketchViewModel session.
   * Removes the sketch layer from map and resets state.
   */
  const cancelSketchVM = () => {
    if (sketchVMRef.current) {
      try { sketchVMRef.current.cancel(); } catch (e) { }
      try { sketchVMRef.current.destroy(); } catch (e) { }
      sketchVMRef.current = null;
    }
    if (sketchLayerRef.current) {
      try {
        sketchLayerRef.current.removeAll();
        view.map.remove(sketchLayerRef.current);
        sketchLayerRef.current.destroy();
      } catch (e) { }
      sketchLayerRef.current = null;
    }
    setIsPlacingSimBuilding(false);
    setIsDrawingDesigned(false);
    setDrawingInstructions('');
  };

  /**
   * Start free-form polygon drawing using ArcGIS SketchViewModel.
   * Pattern matches TrueGeoMap's BuildingConstructionWidget / AssetPlacementWidget.
   * User clicks vertices, double-clicks to finish.
   */
  const startDrawingPolygon = (mode = 'sim', overrideFloors = null) => {
    // Cancel any existing session first
    cancelSketchVM();

    const floorsAtDraw = overrideFloors !== null ? overrideFloors : simFloors;
    const isDesigned = mode === 'designed';

    // 1. Create a dedicated GraphicsLayer for the 2D sketch preview
    const sketchLayer = new GraphicsLayer({
      title: 'Sim Building Sketch',
      listMode: 'hide',
    });
    view.map.add(sketchLayer);
    sketchLayerRef.current = sketchLayer;

    // 2. Create SketchViewModel — exact pattern from TrueGeoMap
    const sketchVM = new SketchViewModel({
      view,
      layer: sketchLayer,
      defaultCreateOptions: { hasZ: false },
      polygonSymbol: {
        type: 'simple-fill',
        color: isDesigned ? [34, 197, 94, 0.25] : [255, 200, 0, 0.25],
        outline: { type: 'simple-line', color: isDesigned ? [22, 163, 74, 1] : [220, 140, 0, 1], width: 2, style: 'dash' },
      },
    });
    sketchVMRef.current = sketchVM;

    // 3. Listen for completion
    sketchVM.on('create', async (event) => {
      if (event.state === 'complete') {
        const poly = event.graphic?.geometry;

        // Remove sketch preview layer before adding 3D extrusion
        try { sketchLayer.removeAll(); view.map.remove(sketchLayer); sketchLayer.destroy(); } catch (e) { }
        sketchLayerRef.current = null;
        sketchVMRef.current = null;

        if (!poly || !poly.rings || poly.rings.length === 0) {
          if (isDesigned) setIsDrawingDesigned(false);
          else setIsPlacingSimBuilding(false);
          setDrawingInstructions('');
          return;
        }

        // Store geometry with correct SR for shadow analysis
        const geomForShadow = {
          type: 'polygon',
          rings: poly.rings.map(r => r.map(v => [v[0], v[1]])),
          spatialReference: poly.spatialReference
            ? { wkid: poly.spatialReference.wkid, latestWkid: poly.spatialReference.latestWkid }
            : { wkid: 4326 },
        };

        console.log('[SimBuilding] Polygon complete, SR:', geomForShadow.spatialReference, 'floors:', floorsAtDraw);

        // Draw the 3D extrusion
        const graphic = await drawSimBuildingGraphic(geomForShadow, floorsAtDraw, mode);

        const entry = {
          id: Date.now(),
          floors: floorsAtDraw,
          height: floorsAtDraw * 3.2,
          geometry: geomForShadow,
          graphic,
        };

        if (isDesigned) {
          setDesignedBuilding(prev => {
            if (prev?.graphic) try { view.graphics.remove(prev.graphic); } catch (e) { }
            return entry;
          });
          setIsDrawingDesigned(false);
        } else {
          setSimulatedBuildings(prev => [...prev, entry]);
          simGraphicsRef.current.push(graphic);
          setIsPlacingSimBuilding(false);
        }
        setDrawingInstructions('');

      } else if (event.state === 'cancel') {
        try { sketchLayer.removeAll(); view.map.remove(sketchLayer); sketchLayer.destroy(); } catch (e) { }
        sketchLayerRef.current = null;
        sketchVMRef.current = null;
        setIsPlacingSimBuilding(false);
        setIsDrawingDesigned(false);
        setDrawingInstructions('');
      }
    });

    // 4. Start drawing
    sketchVM.create('polygon');

    if (isDesigned) setIsDrawingDesigned(true);
    else setIsPlacingSimBuilding(true);
    setDrawingInstructions('Click to add vertices · Double-click to complete polygon');
  };


  /** Remove one simulated building */
  const removeSimBuilding = (id) => {
    setSimulatedBuildings(prev => {
      const entry = prev.find(b => b.id === id);
      if (entry?.graphic) try { view.graphics.remove(entry.graphic); } catch (e) { }
      return prev.filter(b => b.id !== id);
    });
  };

  /** Remove all simulated buildings */
  const clearAllSimBuildings = () => {
    cancelSketchVM();
    simGraphicsRef.current.forEach(g => { try { view.graphics.remove(g); } catch (e) { } });
    simGraphicsRef.current = [];
    setSimulatedBuildings([]);
  };

  /** Update floors of an already-placed simulated building */
  const updateSimBuildingFloors = async (id, newFloors) => {
    const entry = simulatedBuildings.find(b => b.id === id);
    if (!entry) return;
    // Remove old 3D graphic
    if (entry.graphic) try { view.graphics.remove(entry.graphic); } catch (e) { }
    // Draw new 3D graphic with updated floors
    const newGraphic = await drawSimBuildingGraphic(entry.geometry, newFloors, 'sim');
    setSimulatedBuildings(prev => prev.map(b =>
      b.id === id ? { ...b, floors: newFloors, height: newFloors * 3.2, graphic: newGraphic } : b
    ));
    // Update simGraphicsRef
    const oldIdx = simGraphicsRef.current.indexOf(entry.graphic);
    if (oldIdx >= 0) simGraphicsRef.current[oldIdx] = newGraphic;
    else simGraphicsRef.current.push(newGraphic);
    setEditingSimId(null);
  };

  /** Update the time on the view's lighting for the time slider */
  const updateTimeSlider = (hour) => {
    setTimeSliderHour(hour);
    const now = new Date();
    now.setHours(Math.floor(hour), (hour % 1) * 60, 0, 0);
    view.environment.lighting.date = now;
  };

  const runAnalysis = () => {
    if (analysisMode === 'existing') {
      if (!selectedBuilding) return;
      setLoading(true);
      view.environment.lighting.directShadowsEnabled = true;
      runShadowAnalysis();
    } else {
      if (!designedBuilding) return;
      setLoading(true);
      view.environment.lighting.directShadowsEnabled = true;
      const designedFeature = {
        geometry: designedBuilding.geometry,
        attributes: {
          height: designedBuilding.height,
          no_floors: designedBuilding.floors,
          area_sqmtr: 0,
          objectid: -1,
          name: 'Designed Building'
        }
      };
      runShadowAnalysis(designedFeature);
    }
  };

  const resetTool = () => {
    if (highlightHandleRef.current) {
      highlightHandleRef.current.remove();
      highlightHandleRef.current = null;
    }
    setSelectedBuilding(null);
    setDesignedBuilding(null);
    if (designedBuilding?.graphic) {
      try { view.graphics.remove(designedBuilding.graphic); } catch (e) { }
    }
    setAnalysisResult(null);
    setSearchTerm('');
    setSearchResults([]);
    view.graphics.removeAll();
    if (daylightWidgetRef.current) {
      daylightWidgetRef.current.destroy();
      daylightWidgetRef.current = null;
    }
    setIsWidgetReady(false);
    if (clickHandle.current) {
      clickHandle.current.remove();
      clickHandle.current = null;
    }
    setIsPicking(false);
    // Clear simulated buildings
    clearAllSimBuildings();
    setShowSimPanel(false);
  };

  /** Capture map screenshot + save analysis to localStorage */
  const saveAnalysis = async () => {
    const isDesigned = analysisMode === 'designed';
    const targetBuilding = isDesigned ? designedBuilding : selectedBuilding;
    if (!analysisResult || !targetBuilding) return;
    setSavedMsg('saving');
    try {
      const screenshot = await view.takeScreenshot({ width: 800, height: 500, format: 'png' });
      const buildingInfo = isDesigned ? { name: 'Designed Building', floors: targetBuilding.floors, height: targetBuilding.height } : getBuildingInfo(targetBuilding.attributes);
      const buildingName = buildingInfo.name || 'Unknown Building';
      const entry = {
        id: Date.now(),
        timestamp: new Date().toISOString(),
        buildingName,
        buildingInfo,
        result: analysisResult,
        mapScreenshot: screenshot.dataUrl,
      };
      const existing = JSON.parse(localStorage.getItem('solar_analyses') || '[]');
      existing.unshift(entry);
      localStorage.setItem('solar_analyses', JSON.stringify(existing.slice(0, 20))); // keep last 20
      setSavedMsg('saved');
      setTimeout(() => setSavedMsg(''), 3000);
    } catch (err) {
      console.error('[Save] Failed:', err);
      setSavedMsg('');
    }
  };

  /** Export current analysis as a PDF report */
  const exportPDF = async () => {
    const isDesigned = analysisMode === 'designed';
    const targetBuilding = isDesigned ? designedBuilding : selectedBuilding;
    if (!analysisResult || !targetBuilding) return;
    const { jsPDF } = await import('jspdf');
    const html2canvas = (await import('html2canvas')).default;

    const buildingInfo = isDesigned ? { name: 'Designed Building' } : getBuildingInfo(targetBuilding.attributes);
    const buildingName = buildingInfo.name || 'Building';
    const now = new Date().toLocaleString('en-IN');
    const r = analysisResult;

    // Take map screenshot
    const screenshot = await view.takeScreenshot({ width: 900, height: 500, format: 'png' });

    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const W = 210; const H = 297;
    const margin = 14;
    let y = 0;

    // -- COVER HEADER ----------------------------------------
    pdf.setFillColor(30, 58, 95);
    pdf.rect(0, 0, W, 38, 'F');
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(22); pdf.setFont('helvetica', 'bold');
    pdf.text('SolarSight', margin, 16);
    pdf.setFontSize(10); pdf.setFont('helvetica', 'normal');
    pdf.text('Solar Rooftop Suitability Analysis Report', margin, 24);
    pdf.setFontSize(8); pdf.text(`Generated: ${now}`, margin, 31);
    y = 44;

    // -- BUILDING INFO ----------------------------------------
    pdf.setTextColor(30, 58, 95);
    pdf.setFontSize(14); pdf.setFont('helvetica', 'bold');
    pdf.text(buildingName, margin, y); y += 6;
    pdf.setFontSize(9); pdf.setFont('helvetica', 'normal'); pdf.setTextColor(80, 80, 80);
    pdf.text(`Floors: ${r.floors}   Height: ${r.height !== '—' ? r.height + ' m' : '—'}   Neighbours analysed: ${r.neighbourCount}`, margin, y); y += 5;
    pdf.text(`Suitability Class: ${r.suitabilityClass}`, margin, y); y += 8;

    // -- MAP SCREENSHOT ---------------------------------------
    pdf.addImage(screenshot.dataUrl, 'PNG', margin, y, W - margin * 2, 55);
    y += 60;

    // -- SCORE BANNER -----------------------------------------
    const scoreColor = r.score > 70 ? [22, 163, 74] : r.score > 40 ? [217, 119, 6] : [220, 38, 38];
    pdf.setFillColor(...scoreColor);
    pdf.rect(margin, y, W - margin * 2, 14, 'F');
    pdf.setTextColor(255, 255, 255); pdf.setFontSize(13); pdf.setFont('helvetica', 'bold');
    pdf.text(`Suitability Score: ${r.score} / 100  —  ${r.label}`, margin + 4, y + 9.5);
    y += 20;

    // -- METRICS TABLE ----------------------------------------
    pdf.setTextColor(30, 58, 95); pdf.setFontSize(11); pdf.setFont('helvetica', 'bold');
    pdf.text('Analysis Metrics', margin, y); y += 5;

    const metrics = [
      ['Sunny Hours (out of 13)', `${r.sunnyHours} hrs`],
      ['Average Rooftop Sunlit', `${r.avgSunlit}%`],
      ['Total Rooftop Area', `${r.area} m²`],
      ['Usable Area (70%)', `${r.usableArea} m²`],
      ['Estimated Panel Count', `${r.panelCount} panels (330W each)`],
      ['Estimated Capacity', `${r.capacity} kWp`],
      ['Estimated Annual Generation', `${r.generation} kWh/yr`],
      ['CO₂ Emission Saved', `${r.co2Saved} tonnes/yr`],
      ['Annual Electricity Savings', `₹${Number(r.annualSavings).toLocaleString('en-IN')}/yr`],
      ['Installation Cost (est.)', `₹${Number(r.installCost).toLocaleString('en-IN')}`],
      ['Estimated Payback Period', `${r.paybackYears} years`],
    ];

    metrics.forEach(([label, value], i) => {
      const rowY = y + i * 7;
      pdf.setFillColor(i % 2 === 0 ? 248 : 255, i % 2 === 0 ? 250 : 255, i % 2 === 0 ? 252 : 255);
      pdf.rect(margin, rowY - 4, W - margin * 2, 7, 'F');
      pdf.setFontSize(9); pdf.setFont('helvetica', 'normal'); pdf.setTextColor(80, 80, 80);
      pdf.text(label, margin + 2, rowY);
      pdf.setFont('helvetica', 'bold'); pdf.setTextColor(30, 58, 95);
      pdf.text(value, W - margin - 2, rowY, { align: 'right' });
    });
    y += metrics.length * 7 + 6;

    // -- WHAT-IF SECTION --------------------------------------
    if (r.simCount > 0 && r.baselineScore !== null) {
      pdf.setFillColor(245, 158, 11);
      pdf.rect(margin, y, W - margin * 2, 8, 'F');
      pdf.setTextColor(255, 255, 255); pdf.setFontSize(10); pdf.setFont('helvetica', 'bold');
      pdf.text('⚡ What-If Impact Analysis', margin + 4, y + 5.5);
      y += 12;
      pdf.setFontSize(9); pdf.setFont('helvetica', 'normal'); pdf.setTextColor(80, 80, 80);
      pdf.text(`Baseline score (without simulated buildings): ${r.baselineScore}/100`, margin + 4, y); y += 5;
      pdf.text(`Score with ${r.simCount} simulated building(s): ${r.score}/100`, margin + 4, y); y += 5;
      const impact = r.simImpact;
      pdf.setFont('helvetica', 'bold'); pdf.setTextColor(impact <= -5 ? 220 : 22, impact <= -5 ? 38 : 163, impact <= -5 ? 38 : 74);
      pdf.text(`Impact: ${impact > 0 ? '+' : ''}${impact} points`, margin + 4, y); y += 8;
    }

    // -- METHODOLOGY NOTE ------------------------------------
    if (y < H - 30) {
      pdf.setDrawColor(200, 200, 200); pdf.line(margin, y, W - margin, y); y += 5;
      pdf.setFontSize(7); pdf.setFont('helvetica', 'italic'); pdf.setTextColor(140, 140, 140);
      const note = 'Methodology: Shadow simulation using solar position (azimuth/altitude) at Mumbai (19.076°N, 72.877°E). Score = 50% sunlight hours + 20% area + 10% height + 20% irradiance (fixed 92). CO₂ factor: 0.82 kg/kWh (India grid). Tariff: ₹7/unit. Install cost: ₹60,000/kWp.';
      const lines = pdf.splitTextToSize(note, W - margin * 2);
      pdf.text(lines, margin, y);
    }

    pdf.save(`SolarSight_Report_${buildingName.replace(/\s+/g, '_')}.pdf`);
  };

  const positionStyle = {
    top: `${position.top}px`,
    ...(position.left !== null ? { left: `${position.left}px` } : { right: `${position.right}px` }),
  };

  const handleClose = () => {
    if (onClose) onClose();
  };

  return (
    <>
      {/* -- Methodology Overlay Page ------------------------------- */}
      {showMethodology && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 9999,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <div style={{
            background: 'white', borderRadius: 12, width: 540, maxHeight: '85vh',
            overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.3)', padding: '28px 28px 20px',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div style={{ fontSize: 18, fontWeight: 700, color: '#1e3a5f' }}>Solar Suitability Methodology</div>
              <button onClick={() => setShowMethodology(false)}
                style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#6b7280' }}>
                &#10005;
              </button>
            </div>

            {[
              {
                title: 'Overall Suitability Score',
                color: '#1e3a5f',
                content: 'Score = (Sunlight % x 0.50) + (Area Score x 0.20) + (Height Score x 0.10) + (Irradiance Score x 0.20). Each component is normalised to 0–100 before weighting. The sunlight component is the most influential at 50%.',
              },
              {
                title: 'Shadow & Sunlight Hours',
                color: '#1e40af',
                content: 'Sun position (altitude and azimuth) is computed for each hour from 6 AM to 6 PM using the solar position algorithm at Mumbai\'s latitude (19.076°N). For each hour, shadow polygons from all neighbouring buildings (within 200 m) are projected using the effective height difference. An hour is counted as "sunny" if less than 70% of the rooftop area is covered by shadow.',
              },
              {
                title: 'Area Score',
                color: '#15803d',
                content: 'Rooftop area is calculated from the building polygon geometry using geodesic area. A building with ≥100 m² scores 100; below that it is proportionally scaled. 70% of the total rooftop area is considered usable for panel placement (accounting for setbacks, obstructions, HVAC equipment).',
              },
              {
                title: 'Height Score',
                color: '#15803d',
                content: 'Taller buildings receive a slight bonus since they are less likely to be shaded by neighbours. The height score is calculated as min(100, height / 30 × 100). A building ≥30 m scores 100. This component carries only 10% weight in the final score.',
              },
              {
                title: 'Solar Irradiance Score',
                color: '#b45309',
                content: 'Mumbai receives approximately 1,500 kWh per kWp per year of global horizontal irradiance. A fixed irradiance value of 92 (out of 100) is used for all buildings in the Mumbai region, reflecting high but not peak solar resource. Future versions may use actual GHI data from satellite imagery.',
              },
              {
                title: 'Panel Count & System Capacity',
                color: '#b45309',
                content: 'Panel Count = Usable Area / 2 m² (approximate footprint per 330 W panel). System Capacity (kWp) = Panel Count × 330 W / 1000. Annual Generation (kWh) = Capacity × 1,500 kWh/kWp (Mumbai irradiance factor).',
              },
              {
                title: 'Financial Estimates',
                color: '#be185d',
                content: 'Annual Savings = Annual Generation × ₹7/unit (average Mumbai grid tariff). Installation Cost = Capacity × ₹60,000/kWp (industry standard for rooftop solar in Maharashtra, 2024). Payback Period = Installation Cost / Annual Savings.',
              },
              {
                title: 'CO₂ Savings',
                color: '#be185d',
                content: 'CO₂ Saved (tonnes/yr) = Annual Generation × 0.82 kg/kWh ÷ 1000. The emission factor 0.82 kg CO₂/kWh is the India national grid average published by the Central Electricity Authority (CEA).',
              },
              {
                title: 'What-If Simulation Impact',
                color: '#92400e',
                content: 'When simulated buildings are added, the full shadow analysis runs twice — once including the simulated buildings and once without. The "impact" is the difference between these two scores. A negative impact means the simulated building reduces solar potential by casting more shadow on the analysed rooftop.',
              },
            ].map(sec => (
              <div key={sec.title} style={{ marginBottom: 16 }}>
                <div style={{ fontWeight: 700, fontSize: 13, color: sec.color, marginBottom: 4 }}>{sec.title}</div>
                <div style={{ fontSize: 12, color: '#374151', lineHeight: 1.7 }}>{sec.content}</div>
              </div>
            ))}

            <div style={{ marginTop: 8, padding: '10px 12px', background: '#f1f5f9', borderRadius: 8, fontSize: 11, color: '#64748b' }}>
              <strong>Location reference:</strong> Mumbai (19.076°N, 72.877°E). Analysis hours: 6 AM–6 PM (13 hourly steps). Neighbour search radius: 200 m. Coordinate system normalised to view spatial reference before all geometry operations.
            </div>

            <button
              onClick={() => setShowMethodology(false)}
              style={{
                marginTop: 20, width: '100%', padding: '10px 0', borderRadius: 8,
                background: '#1a73e8', color: 'white', fontWeight: 700, fontSize: 14,
                border: 'none', cursor: 'pointer',
              }}
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* -- Main Panel -------------------------------------------- */}
      <div
        ref={contentDivRef}
        className="absolute bg-white text-gray-800 font-sans rounded-xl overflow-hidden shadow-lg z-[99] flex flex-col"
        style={{ ...positionStyle, width: `${panelSize.width}px`, maxHeight: `${panelSize.height}px`, position: 'absolute' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between bg-[#1a73e8] px-3 py-2 cursor-move select-none" onMouseDown={onDragStart}>
          <button
            data-role="collapse-button"
            className="bg-transparent border-none text-white cursor-pointer hover:opacity-80 transition-opacity"
            onClick={() => setIsBodyVisible(!isBodyVisible)}
            aria-label={isBodyVisible ? 'Collapse' : 'Expand'}
          >
            {isBodyVisible ? '\u25B2' : '\u25BC'}
          </button>
          <div className="text-base text-white font-medium">Solar Suitability</div>
          <button
            data-role="close-button"
            className="bg-transparent border-none text-white cursor-pointer hover:opacity-80 transition-opacity"
            onClick={handleClose}
            aria-label="Close"
          >
            &#10005;
          </button>
        </div>

        <div className={`overflow-y-auto flex-1 ${!isBodyVisible ? 'hidden' : ''}`}>
          <div className="p-3 bg-blue-50 text-blue-800 text-xs text-center border-b border-blue-100">
            LoD layers have been enabled for shadow simulation.
          </div>

          {errorMsg && (
            <div className="p-3 text-red-600 text-sm bg-red-50">{errorMsg}</div>
          )}

          <div className="p-4 space-y-4">
            {/* Mode tabs — only shown before analysis */}
            {!analysisResult && (
              <div className="flex border border-blue-200 rounded overflow-hidden">
                <button
                  className={`flex-1 py-2 text-sm font-medium transition-colors ${analysisMode === 'existing' ? 'bg-[#1a73e8] text-white' : 'bg-gray-50 text-gray-600 hover:bg-gray-100'}`}
                  onClick={() => setAnalysisMode('existing')}
                >
                  Existing Building
                </button>
                <button
                  className={`flex-1 py-2 text-sm font-medium transition-colors ${analysisMode === 'designed' ? 'bg-green-600 text-white' : 'bg-gray-50 text-gray-600 hover:bg-gray-100'}`}
                  onClick={() => setAnalysisMode('designed')}
                >
                  Design New
                </button>
              </div>
            )}

            {/* Select existing building prompt */}
            {analysisMode === 'existing' && !selectedBuilding && !analysisResult && (
              <div className="space-y-3">
                <SearchLocationTool view={view} isFireWidget={true} />
                {!isPicking ? (
                  <button
                    onClick={enablePicking}
                    disabled={!buildingLayer}
                    className={`w-full py-3 rounded text-sm font-medium transition-colors ${buildingLayer ? 'bg-[#1a73e8] text-white hover:bg-blue-700' : 'bg-gray-300 text-gray-500 cursor-not-allowed'}`}
                  >
                    Select Building on Map
                  </button>
                ) : (
                  <button
                    onClick={() => { setIsPicking(false); if (clickHandle.current) clickHandle.current.remove(); }}
                    className="w-full py-3 rounded text-sm font-medium bg-red-600 text-white hover:bg-red-700 transition-colors"
                  >
                    Cancel Selection
                  </button>
                )}
              </div>
            )}

            {/* Design new building prompt */}
            {analysisMode === 'designed' && !designedBuilding && !analysisResult && (
              <div className="space-y-3 border border-green-200 bg-green-50/30 p-4 rounded-lg">
                <div className="text-sm font-medium text-gray-700 mb-2">Design New Building</div>
                <div className="flex items-center space-x-2">
                  <label className="text-xs text-gray-600 w-16">Floors:</label>
                  <input
                    type="number" min="1" max="50"
                    value={designedFloors}
                    onChange={(e) => setDesignedFloors(parseInt(e.target.value) || 1)}
                    className="w-20 px-2 py-1 text-sm border border-gray-300 rounded"
                  />
                </div>
                <button
                  onClick={() => {
                    if (isDrawingDesigned) { cancelSketchVM(); setIsDrawingDesigned(false); }
                    else startDrawingPolygon('designed', designedFloors);
                  }}
                  className={`w-full py-3 rounded text-sm font-medium transition-colors ${isDrawingDesigned ? 'bg-red-600 hover:bg-red-700 text-white' : 'bg-green-600 hover:bg-green-700 text-white'}`}
                >
                  {isDrawingDesigned ? 'Cancel Drawing' : 'Draw Polygon on Map'}
                </button>
              </div>
            )}

            {/* Pre-analysis: building selected, configure & run */}
            {((analysisMode === 'existing' && selectedBuilding) || (analysisMode === 'designed' && designedBuilding)) && !analysisResult && (
              <div className="space-y-4">
                {/* Step 1: Building info */}
                <div style={{ padding: '12px', background: '#eff6ff', borderLeft: '3px solid #3b82f6', borderRadius: '6px', fontSize: '13px' }}>
                  <div style={{ fontWeight: '600', marginBottom: '8px', color: '#1e40af' }}>Step 1: Building Selected</div>
                  {analysisMode === 'existing' && selectedBuilding ? (
                    <>
                      <div className="flex justify-between"><span className="text-gray-500">Name/ID:</span> <span className="font-medium truncate max-w-[150px]" title={getBuildingInfo(selectedBuilding.attributes).name}>{getBuildingInfo(selectedBuilding.attributes).name}</span></div>
                      <div className="flex justify-between"><span className="text-gray-500">Floors:</span> <span className="font-medium">{getBuildingInfo(selectedBuilding.attributes).floors || '—'}</span></div>
                      <div className="flex justify-between"><span className="text-gray-500">Height:</span> <span className="font-medium">{getBuildingInfo(selectedBuilding.attributes).height ? getBuildingInfo(selectedBuilding.attributes).height + ' m' : '—'}</span></div>
                    </>
                  ) : (
                    <>
                      <div className="flex justify-between"><span className="text-gray-500">Type:</span> <span className="font-medium">Designed Building</span></div>
                      <div className="flex justify-between"><span className="text-gray-500">Floors:</span> <span className="font-medium">{designedBuilding?.floors || '—'}</span></div>
                      <div className="flex justify-between"><span className="text-gray-500">Height:</span> <span className="font-medium">{designedBuilding?.height ? designedBuilding.height.toFixed(1) + ' m' : '—'}</span></div>
                    </>
                  )}
                </div>

                {/* Step 2: Simulate Future Buildings */}
                <div style={{ border: '1px solid #fbbf24', borderRadius: '8px', overflow: 'hidden' }}>
                  <button
                    onClick={() => setShowSimPanel(p => !p)}
                    style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', background: '#fffbeb', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: '600', color: '#92400e' }}
                  >
                    <span>Step 2: Simulate Future Buildings <span style={{ fontWeight: 400, color: '#b45309', fontSize: 11 }}>(optional)</span></span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10 }}>
                      {simulatedBuildings.length > 0 && <span style={{ background: '#f59e0b', color: 'white', borderRadius: 10, padding: '1px 6px', fontSize: 10 }}>{simulatedBuildings.length}</span>}
                      {showSimPanel ? '\u25B2' : '\u25BC'}
                    </span>
                  </button>

                  {showSimPanel && (
                    <div style={{ padding: '12px', background: '#fffdf0', borderTop: '1px solid #fde68a' }}>
                      <p style={{ fontSize: 11, color: '#78716c', marginBottom: 10 }}>
                        Draw the footprint of a future building to see its shadow impact on solar potential.
                      </p>

                      {/* Floors slider */}
                      <div style={{ marginBottom: 10 }}>
                        <label style={{ fontSize: 11, color: '#57534e', display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                          <span>New building floors</span>
                          <strong style={{ color: '#92400e' }}>{simFloors} fl = {(simFloors * 3.2).toFixed(0)} m</strong>
                        </label>
                        <input type="range" min={1} max={60} value={simFloors}
                          onChange={e => setSimFloors(Number(e.target.value))}
                          style={{ width: '100%', accentColor: '#f59e0b' }} />
                      </div>

                      {/* Draw button */}
                      {!isPlacingSimBuilding ? (
                        <button
                          onClick={() => startDrawingPolygon('sim')}
                          style={{ width: '100%', padding: '8px', borderRadius: 6, border: 'none', cursor: 'pointer', background: '#f59e0b', color: 'white', fontWeight: 600, fontSize: 12, marginBottom: 8 }}
                        >
                          Draw Building Footprint on Map
                        </button>
                      ) : (
                        <div style={{ marginBottom: 8 }}>
                          <div style={{ padding: '8px 10px', background: '#fef3c7', border: '1px dashed #f59e0b', borderRadius: 6, fontSize: 11, color: '#92400e', marginBottom: 6, textAlign: 'center' }}>
                            {drawingInstructions}
                          </div>
                          <button onClick={cancelSketchVM}
                            style={{ width: '100%', padding: '7px', borderRadius: 6, border: 'none', cursor: 'pointer', background: '#dc2626', color: 'white', fontWeight: 600, fontSize: 12 }}>
                            Cancel Drawing
                          </button>
                        </div>
                      )}

                      {/* Placed buildings list with edit */}
                      {simulatedBuildings.length > 0 && (
                        <div style={{ marginTop: 4 }}>
                          <div style={{ fontSize: 11, color: '#92400e', fontWeight: 600, marginBottom: 4 }}>Placed buildings:</div>
                          {simulatedBuildings.map((sb, i) => (
                            <div key={sb.id} style={{ padding: '6px 8px', background: '#fef3c7', borderRadius: 4, marginBottom: 3, fontSize: 12 }}>
                              {editingSimId === sb.id ? (
                                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                  <span style={{ color: '#78350f', fontSize: 11, whiteSpace: 'nowrap' }}>Floors:</span>
                                  <input type="number" min={1} max={60} value={editFloorValue}
                                    onChange={e => setEditFloorValue(Number(e.target.value) || 1)}
                                    style={{ width: 48, padding: '2px 4px', border: '1px solid #f59e0b', borderRadius: 3, fontSize: 12 }}
                                    autoFocus />
                                  <button onClick={() => updateSimBuildingFloors(sb.id, editFloorValue)}
                                    style={{ background: '#16a34a', color: 'white', border: 'none', borderRadius: 3, padding: '2px 8px', fontSize: 11, cursor: 'pointer' }}>OK</button>
                                  <button onClick={() => setEditingSimId(null)}
                                    style={{ background: '#6b7280', color: 'white', border: 'none', borderRadius: 3, padding: '2px 6px', fontSize: 11, cursor: 'pointer' }}>Cancel</button>
                                </div>
                              ) : (
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                  <span style={{ color: '#78350f' }}>Building {i + 1} &mdash; {sb.floors} floors ({sb.height.toFixed(0)} m)</span>
                                  <span style={{ display: 'flex', gap: 4 }}>
                                    <button onClick={() => { setEditingSimId(sb.id); setEditFloorValue(sb.floors); }}
                                      title="Edit floors"
                                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#b45309', fontSize: 14, lineHeight: 1 }}>&#9998;</button>
                                    <button onClick={() => removeSimBuilding(sb.id)}
                                      title="Remove"
                                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#dc2626', fontSize: 14, lineHeight: 1 }}>&#10005;</button>
                                  </span>
                                </div>
                              )}
                            </div>
                          ))}
                          <button onClick={clearAllSimBuildings}
                            style={{ fontSize: 11, color: '#dc2626', background: 'none', border: 'none', cursor: 'pointer', padding: '2px 0' }}>
                            Clear all
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Step 3: Season */}
                <div style={{ padding: '10px 12px', background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: 8, borderLeft: '3px solid #0ea5e9' }}>
                  <div style={{ fontWeight: 600, fontSize: 12, color: '#0369a1', marginBottom: 6 }}>Step 3: Select Season</div>
                  <select
                    value={selectedSeason}
                    onChange={(e) => setSelectedSeason(e.target.value)}
                    style={{ width: '100%', padding: '7px 10px', borderRadius: 6, border: '1px solid #7dd3fc', background: 'white', fontSize: 12, color: '#0c4a6e', cursor: 'pointer', outline: 'none' }}
                  >
                    {seasonOptions.map(opt => (
                      <option key={opt.id} value={opt.id}>{opt.label}</option>
                    ))}
                  </select>
                  <div style={{ fontSize: 10, color: '#64748b', marginTop: 4 }}>
                    Different seasons affect sun angle &mdash; winter sun is lower and causes more shadow.
                  </div>
                </div>

                {/* Step 4: Run */}
                <div className="flex gap-2 pt-1">
                  <button
                    onClick={runAnalysis}
                    disabled={loading}
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 rounded-lg font-medium text-sm transition-colors shadow-sm disabled:opacity-50"
                  >
                    {loading ? 'Computing...' : `Run Analysis${simulatedBuildings.length > 0 ? ` (+${simulatedBuildings.length} sim)` : ''}`}
                  </button>
                  <button
                    onClick={resetTool}
                    className="px-3 py-2 bg-white hover:bg-gray-50 text-gray-600 border border-gray-300 rounded-lg text-sm transition-colors shadow-sm"
                  >
                    Cancel
                  </button>
                </div>

                {simulating && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <div className="text-xs font-medium text-gray-700 mb-2">
                      Analysing shadows: {Math.floor(6 + (simulationProgress / 100) * 12)}:00 &rarr;
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className="bg-blue-600 h-2 rounded-full transition-all duration-200 ease-linear" style={{ width: `${simulationProgress}%` }} />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* -- ANALYSIS RESULTS -------------------------------- */}
            {analysisResult && (
              <div className="space-y-4">

                {/* Score header */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '14px', background: '#f8fafc', border: '1px solid #e5e7eb', borderRadius: 10 }}>
                  <ScoreGauge score={analysisResult.score} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 28, fontWeight: 800, color: '#1f2937', lineHeight: 1.1 }}>
                      {analysisResult.score} <span style={{ fontSize: 13, fontWeight: 400, color: '#9ca3af' }}>/ 100</span>
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 600, marginTop: 2, color: analysisResult.score > 70 ? '#16a34a' : analysisResult.score > 40 ? '#d97706' : '#dc2626' }}>
                      {analysisResult.label}
                    </div>
                    <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>
                      Class: <strong style={{ color: '#1e3a5f' }}>{analysisResult.suitabilityClass}</strong>
                    </div>
                    {analysisResult.seasonLabel && analysisResult.seasonLabel !== 'Today' && (
                      <div style={{ fontSize: 10, color: '#0369a1', marginTop: 4, background: '#e0f2fe', padding: '2px 8px', borderRadius: 4, display: 'inline-block' }}>
                        {analysisResult.seasonLabel}
                      </div>
                    )}
                  </div>
                </div>

                {/* What-If impact */}
                {analysisResult.simCount > 0 && analysisResult.baselineScore !== null && (
                  <div style={{ border: '1px solid #fbbf24', borderRadius: 8, overflow: 'hidden', background: '#fffbeb' }}>
                    <div style={{ padding: '8px 12px', background: '#f59e0b', color: 'white', fontWeight: 700, fontSize: 12, letterSpacing: '0.04em' }}>
                      What-If Impact Analysis
                    </div>
                    <div style={{ padding: '10px 12px', fontSize: 13 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                        <span style={{ color: '#57534e' }}>Without simulated buildings:</span>
                        <span style={{ fontWeight: 700, color: analysisResult.baselineScore > 70 ? '#16a34a' : analysisResult.baselineScore > 40 ? '#d97706' : '#dc2626' }}>
                          {analysisResult.baselineScore} / 100
                        </span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                        <span style={{ color: '#57534e' }}>With {analysisResult.simCount} simulated building{analysisResult.simCount > 1 ? 's' : ''}:</span>
                        <span style={{ fontWeight: 700, color: analysisResult.score > 70 ? '#16a34a' : analysisResult.score > 40 ? '#d97706' : '#dc2626' }}>
                          {analysisResult.score} / 100
                        </span>
                      </div>
                      <div style={{ textAlign: 'center', padding: '6px 0', borderTop: '1px solid #fde68a', fontWeight: 700, fontSize: 15, color: analysisResult.simImpact <= -5 ? '#dc2626' : analysisResult.simImpact >= 0 ? '#16a34a' : '#d97706' }}>
                        {analysisResult.simImpact > 0 ? '+' : ''}{analysisResult.simImpact} points impact
                        {'  '}{analysisResult.simImpact <= -10 ? '(High Impact)' : analysisResult.simImpact <= -5 ? '(Moderate Impact)' : '(Low Impact)'}
                      </div>
                    </div>
                  </div>
                )}

                {/* -- Add Building & Recalculate ------------------- */}
                <div style={{ border: '1px solid #d1d5db', borderRadius: 8, overflow: 'hidden' }}>
                  <button
                    onClick={() => setShowSimPanel(p => !p)}
                    style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 12px', background: showSimPanel ? '#fef3c7' : '#f9fafb', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600, color: '#374151' }}
                  >
                    <span>Add Simulated Building &amp; Recalculate</span>
                    <span style={{ fontSize: 10, color: '#9ca3af' }}>{showSimPanel ? '\u25B2' : '\u25BC'}{simulatedBuildings.length > 0 && <span style={{ marginLeft: 5, background: '#f59e0b', color: 'white', borderRadius: 10, padding: '1px 6px', fontSize: 10 }}>{simulatedBuildings.length}</span>}</span>
                  </button>

                  {showSimPanel && (
                    <div style={{ padding: '12px', background: '#fffdf5', borderTop: '1px solid #e5e7eb' }}>
                      <div style={{ marginBottom: 8 }}>
                        <label style={{ fontSize: 11, color: '#57534e', display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                          <span>Building floors</span>
                          <strong style={{ color: '#92400e' }}>{simFloors} fl = {(simFloors * 3.2).toFixed(0)} m</strong>
                        </label>
                        <input type="range" min={1} max={60} value={simFloors}
                          onChange={e => setSimFloors(Number(e.target.value))}
                          style={{ width: '100%', accentColor: '#f59e0b' }} />
                      </div>

                      {!isPlacingSimBuilding ? (
                        <button onClick={() => startDrawingPolygon('sim')}
                          style={{ width: '100%', padding: '7px', borderRadius: 6, border: 'none', cursor: 'pointer', background: '#f59e0b', color: 'white', fontWeight: 600, fontSize: 12, marginBottom: 6 }}>
                          Draw Building Footprint
                        </button>
                      ) : (
                        <div style={{ marginBottom: 6 }}>
                          <div style={{ padding: '7px 10px', background: '#fef3c7', border: '1px dashed #f59e0b', borderRadius: 6, fontSize: 11, color: '#92400e', marginBottom: 5, textAlign: 'center' }}>
                            {drawingInstructions}
                          </div>
                          <button onClick={cancelSketchVM}
                            style={{ width: '100%', padding: '6px', borderRadius: 6, border: 'none', cursor: 'pointer', background: '#dc2626', color: 'white', fontWeight: 600, fontSize: 12 }}>
                            Cancel Drawing
                          </button>
                        </div>
                      )}

                      {simulatedBuildings.length > 0 && (
                        <div style={{ marginBottom: 8 }}>
                          {simulatedBuildings.map((sb, i) => (
                            <div key={sb.id} style={{ padding: '5px 8px', background: '#fef3c7', borderRadius: 4, marginBottom: 3, fontSize: 11 }}>
                              {editingSimId === sb.id ? (
                                <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                                  <span style={{ color: '#78350f', whiteSpace: 'nowrap' }}>Floors:</span>
                                  <input type="number" min={1} max={60} value={editFloorValue}
                                    onChange={e => setEditFloorValue(Number(e.target.value) || 1)}
                                    style={{ width: 44, padding: '1px 3px', border: '1px solid #f59e0b', borderRadius: 3, fontSize: 11 }}
                                    autoFocus />
                                  <button onClick={() => updateSimBuildingFloors(sb.id, editFloorValue)}
                                    style={{ background: '#16a34a', color: 'white', border: 'none', borderRadius: 3, padding: '1px 6px', fontSize: 10, cursor: 'pointer' }}>OK</button>
                                  <button onClick={() => setEditingSimId(null)}
                                    style={{ background: '#6b7280', color: 'white', border: 'none', borderRadius: 3, padding: '1px 5px', fontSize: 10, cursor: 'pointer' }}>X</button>
                                </div>
                              ) : (
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                  <span style={{ color: '#78350f' }}>Bldg {i + 1}: {sb.floors} fl / {sb.height.toFixed(0)} m</span>
                                  <span style={{ display: 'flex', gap: 3 }}>
                                    <button onClick={() => { setEditingSimId(sb.id); setEditFloorValue(sb.floors); }}
                                      title="Edit floors" style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#b45309', fontSize: 13 }}>&#9998;</button>
                                    <button onClick={() => removeSimBuilding(sb.id)}
                                      title="Remove" style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#dc2626', fontSize: 13 }}>&#10005;</button>
                                  </span>
                                </div>
                              )}
                            </div>
                          ))}
                          {simulatedBuildings.length > 0 && (
                            <button onClick={clearAllSimBuildings} style={{ fontSize: 11, color: '#dc2626', background: 'none', border: 'none', cursor: 'pointer', padding: '2px 0' }}>
                              Clear all
                            </button>
                          )}
                        </div>
                      )}

                      {simulatedBuildings.length > 0 && (
                        <button
                          onClick={runAnalysis}
                          disabled={loading}
                          style={{ width: '100%', padding: '8px', borderRadius: 6, border: 'none', cursor: loading ? 'not-allowed' : 'pointer', background: loading ? '#9ca3af' : '#16a34a', color: 'white', fontWeight: 700, fontSize: 12 }}
                        >
                          {loading ? 'Computing...' : `Recalculate with ${simulatedBuildings.length} Building${simulatedBuildings.length > 1 ? 's' : ''}`}
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* -- Shadow & Sunlight ----------------------------- */}
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', color: '#1e3a5f', padding: '6px 0 4px', borderBottom: '2px solid #dbeafe', marginBottom: 6 }}>
                    SHADOW &amp; SUNLIGHT
                  </div>
                  <div style={{ border: '1px solid #e5e7eb', borderRadius: 8, overflow: 'hidden' }}>
                    {[
                      ['Sunny Hours (6am–6pm)', `${analysisResult.sunnyHours} / 13 hrs`],
                      ['Avg Rooftop Sunlit', `${analysisResult.avgSunlit}%`],
                      ['Neighbours Analysed', `${analysisResult.neighbourCount} buildings`],
                    ].map(([label, value], i) => (
                      <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: i % 2 === 0 ? '#eff6ff' : '#fff', fontSize: 13 }}>
                        <span style={{ color: '#6b7280' }}>{label}</span>
                        <span style={{ fontWeight: 700, color: '#1e40af' }}>{value}</span>
                      </div>
                    ))}
                  </div>
                  <InfoAccordion title="shadow">
                    Sun position is computed hourly (6 AM–6 PM, 13 steps) using the solar altitude and azimuth at Mumbai (19.076°N, 72.877°E). For each hour, neighbouring buildings within 200 m cast shadow polygons proportional to their height above the analysed rooftop. An hour is "sunny" when less than 70% of the rooftop is shadowed.
                  </InfoAccordion>
                </div>

                {/* -- Hourly Chart -- */}
                <HourlySunlightChart hourlyResults={analysisResult.hourlyResults} />

                {/* -- Time Slider (Visual Analysis) ---------------- */}
                <div style={{ padding: '12px', background: '#1e293b', borderRadius: 10 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', letterSpacing: '0.08em', marginBottom: 8 }}>
                    SHADOW VISUALISATION — TIME OF DAY
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <button
                      onClick={() => setIsPlayingShadow(p => !p)}
                      style={{ background: 'none', border: 'none', color: '#f59e0b', cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center' }}
                      title={isPlayingShadow ? 'Pause' : 'Play'}
                    >
                      {isPlayingShadow ? '\u23F8' : '\u25B6'}
                    </button>
                    <span style={{ fontSize: 11, color: '#64748b', whiteSpace: 'nowrap' }}>6 AM</span>
                    <input
                      type="range" min={6} max={18} step={0.25} value={timeSliderHour}
                      onChange={e => updateTimeSlider(Number(e.target.value))}
                      style={{ flex: 1, accentColor: '#f59e0b' }}
                    />
                    <span style={{ fontSize: 11, color: '#64748b', whiteSpace: 'nowrap' }}>6 PM</span>
                  </div>
                  <div style={{ textAlign: 'center', fontSize: 13, fontWeight: 600, color: '#f1f5f9', marginTop: 4 }}>
                    {(() => {
                      const h = Math.floor(timeSliderHour);
                      const m = Math.round((timeSliderHour % 1) * 60);
                      const ampm = h < 12 ? 'AM' : 'PM';
                      const h12 = h % 12 === 0 ? 12 : h % 12;
                      return `${h12}:${m.toString().padStart(2, '0')} ${ampm}`;
                    })()}
                    <span style={{ fontSize: 10, color: '#64748b', marginLeft: 8 }}>Drag to change time &amp; see live shadows on map</span>
                  </div>

                  {/* Daylight widget container — hidden behind our slider, used for sun position only */}
                  <div
                    ref={widgetContainerRef}
                    style={{ width: '100%', height: 0, overflow: 'hidden', position: 'absolute', pointerEvents: 'none', opacity: 0 }}
                  />
                </div>

                {/* -- Rooftop & Panels ---------------------------- */}
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', color: '#1e3a5f', padding: '6px 0 4px', borderBottom: '2px solid #dcfce7', marginBottom: 6 }}>
                    ROOFTOP &amp; PANEL PLACEMENT
                  </div>
                  <div style={{ border: '1px solid #e5e7eb', borderRadius: 8, overflow: 'hidden' }}>
                    {[
                      ['Total Rooftop Area', `${analysisResult.area} m\u00b2`],
                      ['Usable Area (70%)', `${analysisResult.usableArea} m\u00b2`],
                      ['Est. Panel Count', `${analysisResult.panelCount} panels`],
                      ['Panel Rating', '330 W each'],
                      ['Floors / Height', `${analysisResult.floors} / ${analysisResult.height !== '\u2014' ? analysisResult.height + ' m' : '\u2014'}`],
                    ].map(([label, value], i) => (
                      <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: i % 2 === 0 ? '#f0fdf4' : '#fff', fontSize: 13 }}>
                        <span style={{ color: '#6b7280' }}>{label}</span>
                        <span style={{ fontWeight: 700, color: '#15803d' }}>{value}</span>
                      </div>
                    ))}
                  </div>
                  <InfoAccordion title="panels">
                    Usable area = 70% of rooftop (accounts for setbacks, ducts, water tanks). Panel count = Usable area &divide; 2 m&sup2; (footprint per 330 W panel). System capacity (kWp) = Panel count &times; 330 W &divide; 1000.
                  </InfoAccordion>
                </div>

                {/* -- Energy Potential ---------------------------- */}
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', color: '#1e3a5f', padding: '6px 0 4px', borderBottom: '2px solid #fef9c3', marginBottom: 6 }}>
                    SOLAR ENERGY POTENTIAL
                  </div>
                  <div style={{ border: '1px solid #e5e7eb', borderRadius: 8, overflow: 'hidden' }}>
                    {[
                      ['Installed Capacity', `${analysisResult.capacity} kWp`],
                      ['Annual Generation', `${analysisResult.generation} kWh/yr`],
                      ['Solar Irradiance', '~1,500 kWh/kWp (Mumbai)'],
                    ].map(([label, value], i) => (
                      <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: i % 2 === 0 ? '#fefce8' : '#fff', fontSize: 13 }}>
                        <span style={{ color: '#6b7280' }}>{label}</span>
                        <span style={{ fontWeight: 700, color: '#b45309' }}>{value}</span>
                      </div>
                    ))}
                  </div>
                  <InfoAccordion title="energy">
                    Annual Generation = System Capacity &times; 1,500 kWh/kWp. The 1,500 kWh/kWp figure is Mumbai&rsquo;s average annual global horizontal irradiance performance ratio, based on MNRE data for Maharashtra.
                  </InfoAccordion>
                </div>

                {/* -- Financial & Environmental ------------------- */}
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', color: '#1e3a5f', padding: '6px 0 4px', borderBottom: '2px solid #fce7f3', marginBottom: 6 }}>
                    FINANCIAL &amp; ENVIRONMENTAL
                  </div>
                  <div style={{ border: '1px solid #e5e7eb', borderRadius: 8, overflow: 'hidden' }}>
                    {[
                      ['Annual Savings', `\u20b9${Number(analysisResult.annualSavings).toLocaleString('en-IN')}/yr`],
                      ['Installation Cost', `\u20b9${Number(analysisResult.installCost).toLocaleString('en-IN')}`],
                      ['Payback Period', `${analysisResult.paybackYears} years`],
                      ['CO\u2082 Saved', `${analysisResult.co2Saved} tonnes/yr`],
                    ].map(([label, value], i) => (
                      <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: i % 2 === 0 ? '#fdf2f8' : '#fff', fontSize: 13 }}>
                        <span style={{ color: '#6b7280' }}>{label}</span>
                        <span style={{ fontWeight: 700, color: '#be185d' }}>{value}</span>
                      </div>
                    ))}
                  </div>
                  <InfoAccordion title="financial">
                    Annual Savings = Annual Generation &times; &#8377;7/unit (Mumbai average grid tariff). Install cost = Capacity &times; &#8377;60,000/kWp (Maharashtra, 2024). Payback = Install cost &divide; Annual savings. CO&sup2; saved = Annual generation &times; 0.82 kg CO&sup2;/kWh (India CEA grid emission factor).
                  </InfoAccordion>
                </div>

                {/* Smart Recommendations */}
                <SmartRecommendations result={analysisResult} />

                {/* -- Action Buttons ------------------------------- */}
                <div style={{ display: 'flex', gap: 8, paddingTop: 4 }}>
                  <button
                    onClick={exportPDF}
                    style={{ flex: 1, padding: '9px 0', borderRadius: 7, border: 'none', cursor: 'pointer', background: '#1e3a5f', color: 'white', fontWeight: 700, fontSize: 13 }}
                  >
                    Export PDF
                  </button>
                  <button
                    onClick={saveAnalysis}
                    disabled={savedMsg === 'saving'}
                    style={{ flex: 1, padding: '9px 0', borderRadius: 7, border: 'none', cursor: 'pointer', background: savedMsg === 'saved' ? '#16a34a' : '#2563eb', color: 'white', fontWeight: 700, fontSize: 13, opacity: savedMsg === 'saving' ? 0.6 : 1 }}
                  >
                    {savedMsg === 'saving' ? 'Saving...' : savedMsg === 'saved' ? 'Saved!' : 'Save Analysis'}
                  </button>
                </div>

                <button
                  onClick={resetTool}
                  className="w-full py-2 bg-white hover:bg-gray-50 text-gray-700 rounded-lg font-medium text-sm border border-gray-300 shadow-sm transition-colors"
                >
                  Start Over
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Resize grip */}
        <div
          onMouseDown={onResizeStart}
          title="Drag to resize"
          style={{ position: 'absolute', bottom: 0, right: 0, width: 18, height: 18, cursor: 'nwse-resize', zIndex: 200, display: 'flex', alignItems: 'flex-end', justifyContent: 'flex-end', padding: '3px', opacity: 0.45 }}
        >
          <svg width="10" height="10" viewBox="0 0 10 10" fill="#1a73e8">
            <path d="M9 1L1 9M5 1L1 5M9 5L5 9" stroke="#1a73e8" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </div>
      </div>
    </>
  );
};

export default SolarSuitabilityTool;
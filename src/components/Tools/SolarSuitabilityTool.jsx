import React, { useEffect, useRef, useState, useCallback } from 'react';
import Daylight from "@arcgis/core/widgets/Daylight.js";
import Graphic from "@arcgis/core/Graphic.js";
import GraphicsLayer from "@arcgis/core/layers/GraphicsLayer.js";
import SketchViewModel from "@arcgis/core/widgets/Sketch/SketchViewModel.js";
import SimpleFillSymbol from "@arcgis/core/symbols/SimpleFillSymbol.js";
import * as geometryEngine from "@arcgis/core/geometry/geometryEngine.js";
import SearchLocationTool from './SearchLocationTool';

const lodTitles = [
  'LoD 2 without Texture',
  'LOD - 02 - BMC Segment 03 Without Texture',
  'LOD - 02 - BMC Segment 04 Without Texture',
  'Slum LoD 2 without Texture'
];

const ScoreGauge = ({ score }) => {
  const radius = 40;
  const strokeWidth = 8;
  const circumference = 2 * Math.PI * radius;
  const dashoffset = circumference - (score / 100) * circumference;
  
  let color = '#ef4444'; // 0-40 red
  if (score > 40 && score <= 70) color = '#f59e0b'; // amber
  if (score > 70) color = '#22c55e'; // green

  return (
    <div className="flex flex-col items-center justify-center relative w-24 h-24">
      <svg className="transform -rotate-90 w-24 h-24">
        <circle
          cx="48"
          cy="48"
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="transparent"
          className="text-gray-200"
        />
        <circle
          cx="48"
          cy="48"
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeDasharray={circumference}
          strokeDashoffset={dashoffset}
          strokeLinecap="round"
          className="transition-all duration-1000 ease-out"
        />
      </svg>
      <div className="absolute flex flex-col items-center justify-center">
        <span className="text-xl font-bold text-gray-800">{score}</span>
      </div>
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

    // Draw a bright cyan filled polygon graphic on the footprint
    // This always works for both FeatureLayer and SceneLayer picks
    try {
      const [Graphic, SimpleFillSymbol, SimpleLineSymbol] = await Promise.all([
        import('@arcgis/core/Graphic.js').then(m => m.default),
        import('@arcgis/core/symbols/SimpleFillSymbol.js').then(m => m.default),
        import('@arcgis/core/symbols/SimpleLineSymbol.js').then(m => m.default),
      ]);

      if (feature.geometry) {
        // Filled polygon with bright cyan outline
        const highlightGraphic = new Graphic({
          geometry: feature.geometry,
          symbol: new SimpleFillSymbol({
            color: [0, 230, 255, 0.20],      // semi-transparent cyan fill
            outline: {
              color: [0, 230, 255, 1],        // solid cyan outline
              width: 3,
            },
          }),
        });
        view.graphics.add(highlightGraphic);
        highlightHandleRef.current = { remove: () => view.graphics.remove(highlightGraphic) };
      }
    } catch (err) {
      console.warn('Highlight graphic failed:', err);
    }

    // Zoom to building with tilt so user can see it clearly in 3D
    if (feature.geometry) {
      try {
        await view.goTo(
          { target: feature.geometry, zoom: 18, tilt: 65 },
          { duration: 900, easing: 'ease-in-out' }
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

  function checkShadowReach(neighbourGeom2D, nHeight, selectedGeom2D, selectedHeight, solar) {
    if (solar.altitudeRad <= 0.087) return 0;

    const effectiveHeight = Math.max(0, nHeight - (selectedHeight || 0));
    if (effectiveHeight <= 0) return 0;

    const shadowLength = effectiveHeight / Math.tan(solar.altitudeRad);
    const shadowAzimuth = solar.azimuthRad + Math.PI;

    try {
      const nRing = neighbourGeom2D.rings[0];
      const sRing = selectedGeom2D.rings[0];
      if (!nRing || !sRing) return 0;

      // Convert BOTH centroids to geographic lon/lat — works for any SR mix
      const nLL = ringToLonLat(nRing, neighbourGeom2D.spatialReference);
      const sLL = ringToLonLat(sRing, selectedGeom2D.spatialReference);

      // Compute distance in meters via geographic formula
      const avgLat = (nLL.lat + sLL.lat) / 2;
      const dx = (sLL.lon - nLL.lon) * 111320 * Math.cos(avgLat * Math.PI / 180);
      const dy = (sLL.lat - nLL.lat) * 110540;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance < 1) return 0;

      const dirToSelected = Math.atan2(dx, dy);
      let angleDiff = Math.abs((dirToSelected - shadowAzimuth) % (2 * Math.PI));
      if (angleDiff > Math.PI) angleDiff = 2 * Math.PI - angleDiff;
      if (angleDiff > Math.PI / 2.6) return 0;
      if (shadowLength < distance) return 0;

      const neighbourDiameter = ringDiameterM(nRing, neighbourGeom2D.spatialReference);
      const angularCoverage = Math.atan2(neighbourDiameter / 2, distance);

      const selectedDiameter = ringDiameterM(sRing, selectedGeom2D.spatialReference);
      const selectedAngularWidth = Math.atan2(selectedDiameter / 2, distance);

      const shadowFraction = Math.min(1.0, angularCoverage / Math.max(selectedAngularWidth, 0.01));
      return shadowFraction;
    } catch {
      return 0;
    }
  }

  async function runShadowAnalysis() {
    setSimulating(true);
    setSimulationProgress(0);

    const attrs = selectedBuilding.attributes;

    // --- 1. Get selected building geometry and area ---
    // Flatten selectedGeom to 2D so geometryEngine.intersect works with shadow polygons
    const rawGeom = selectedBuilding.geometry;
    const selectedGeom2D = {
      type: "polygon",
      rings: rawGeom.rings.map(ring => ring.map(v => [v[0], v[1]])),
      spatialReference: rawGeom.spatialReference
    };
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
    let neighbourFeatures = [];
    try {
      const buffer = geometryEngine.geodesicBuffer(selectedGeom2D, 200, "meters");
      const q = buildingLayer.createQuery();
      q.geometry = buffer;
      q.spatialRelationship = 'intersects';
      q.outFields = ['objectid', 'height', 'no_floors'];
      q.returnGeometry = true;
      q.num = 100;
      q.orderByFields = ['height DESC'];
      q.where = `objectid <> ${attrs['objectid']} AND (height > ${(estimatedHeight || 0)} OR no_floors IS NOT NULL)`;
      const res = await buildingLayer.queryFeatures(q);
      neighbourFeatures = res.features;
      console.log(`Neighbours found: ${neighbourFeatures.length}, tallest: ${neighbourFeatures[0]?.attributes?.height}m`);
    } catch (err) {
      console.warn("Neighbour query failed:", err);
    }

    // Snapshot simulated buildings — preserve the ACTUAL stored spatial reference
    const simSnapshot = simulatedBuildings.map(sb => ({
      attributes: { height: sb.height, no_floors: String(sb.floors) },
      geometry: {
        type: 'polygon',
        rings: sb.geometry.rings,
        spatialReference: sb.geometry.spatialReference || { wkid: 4326 },
      },
      _isSim: true,
    }));
    console.log('[SimBuilding] simSnapshot count:', simSnapshot.length,
      simSnapshot.map(s => `h=${s.attributes.height}m SR=${s.geometry.spatialReference?.wkid}`).join(', '));
    const allNeighbours = [...neighbourFeatures, ...simSnapshot];
    console.log(`Simulated buildings added: ${simSnapshot.length}, total neighbours: ${allNeighbours.length}`);

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
      const solar = getSolarPosition(hour);

      if (solar.altitudeDeg < 5) {
        hourlyResults.push({ hour, sunlitPct: 0, sunny: false });
        await new Promise(r => setTimeout(r, 150));
        continue;
      }

      // Centroid-distance-angle shadow check per neighbour (no polygon ops)
      let totalShadowFraction = 0;

      for (const neighbour of allNeighbours) {
        const nAttrs = neighbour.attributes;
        let nHeight = parseFloat(nAttrs['height']) > 0 ? parseFloat(nAttrs['height']) : null;
        if (!nHeight && nAttrs['no_floors']) {
          const m = String(nAttrs['no_floors']).match(/(\d+)/);
          nHeight = m ? (parseInt(m[1]) + 1) * 3 : 6;
        }
        if (!nHeight || !neighbour.geometry) continue;

        const nGeom2D = {
          type: "polygon",
          rings: neighbour.geometry.rings.map(ring => ring.map(v => [v[0], v[1]])),
          spatialReference: neighbour.geometry.spatialReference || { wkid: 4326 },
        };

        const shadowFrac = checkShadowReach(
          nGeom2D, nHeight, selectedGeom2D, estimatedHeight || 0, solar
        );
        totalShadowFraction = Math.min(1.0, totalShadowFraction + shadowFrac);
      }

      // Debug logging at key hours
      if (hour === 8 || hour === 12 || hour === 16) {
        console.log(`=== HOUR ${hour} DEBUG ===`);
        console.log(`Sun altitude: ${solar.altitudeDeg.toFixed(1)}°, azimuth: ${(solar.azimuthRad * 180/Math.PI).toFixed(1)}°`);
        console.log(`Shadow direction: ${((solar.azimuthRad + Math.PI) * 180/Math.PI).toFixed(1)}°`);
        console.log(`Selected height: ${estimatedHeight}m, area: ${area.toFixed(0)}m²`);
        console.log(`Neighbours returned: ${neighbourFeatures.length}`);
        
        // Log top 5 tallest neighbours, plus any that cast a shadow
        neighbourFeatures.forEach((n, idx) => {
          const nA = n.attributes;
          let nH = parseFloat(nA['height']) > 0 ? parseFloat(nA['height']) : null;
          if (!nH && nA['no_floors']) {
            const m = String(nA['no_floors']).match(/(\d+)/);
            nH = m ? (parseInt(m[1]) + 1) * 3 : null;
          }
          const nGeom2D = n.geometry ? {
            type:"polygon", rings: n.geometry.rings.map(r=>r.map(v=>[v[0],v[1]])),
            spatialReference: n.geometry.spatialReference
          } : null;
          let dist = null;
          let shadowFracLog = 0;
          let effLog = 0;
          let angleDiffLog = 0;
          let shadowLengthLog = 0;
          if (nGeom2D && selectedGeom2D) {
            const nr = nGeom2D.rings[0]; const sr = selectedGeom2D.rings[0];
            const nCx = nr.reduce((s,v)=>s+v[0],0)/nr.length;
            const nCy = nr.reduce((s,v)=>s+v[1],0)/nr.length;
            const sCx = sr.reduce((s,v)=>s+v[0],0)/sr.length;
            const sCy = sr.reduce((s,v)=>s+v[1],0)/sr.length;
            const isWM = nGeom2D.spatialReference && (nGeom2D.spatialReference.wkid === 3857 || nGeom2D.spatialReference.wkid === 102100 || nGeom2D.spatialReference.latestWkid === 3857);
            const ddx = isWM ? sCx - nCx : (sCx - nCx) * 111320 * Math.cos(19.076 * Math.PI / 180);
            const ddy = isWM ? sCy - nCy : (sCy - nCy) * 110540;
            dist = Math.sqrt(ddx*ddx+ddy*ddy);
            
            effLog = nH ? Math.max(0, nH-(estimatedHeight||0)) : 0;
            shadowLengthLog = solar.altitudeRad > 0 ? effLog / Math.tan(solar.altitudeRad) : 0;
            
            const dirToSelected = Math.atan2(ddx, ddy);
            const shadowAzimuth = solar.azimuthRad + Math.PI;
            angleDiffLog = Math.abs((dirToSelected - shadowAzimuth) % (2 * Math.PI));
            if (angleDiffLog > Math.PI) angleDiffLog = 2 * Math.PI - angleDiffLog;
            
            shadowFracLog = checkShadowReach(nGeom2D, nH, selectedGeom2D, estimatedHeight||0, solar);
          }
          
          if (idx < 5 || shadowFracLog > 0) {
            console.log(`  N${idx}: height=${nH}m, effH=${effLog.toFixed(1)}m, dist=${dist?dist.toFixed(0):'?'}m, shadowLen=${shadowLengthLog.toFixed(1)}m, angDiff=${(angleDiffLog*180/Math.PI).toFixed(1)}° => frac=${shadowFracLog.toFixed(3)}`);
          }
        });
        console.log(`Total shadow fraction at hour ${hour}: ${totalShadowFraction.toFixed(3)}`);
        console.log(`sunlitPct at hour ${hour}: ${(Math.max(0,(1-totalShadowFraction)*100)).toFixed(1)}%`);
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
      const solar = getSolarPosition(h.hour);
      return solar.altitudeDeg >= 5;
    }).length;
    const sunlightScore = eligibleHours > 0 ? (sunnyHours / eligibleHours) * 100 : 0;
    const areaScore = Math.min(100, (Math.log10(Math.max(area, 1)) / Math.log10(500)) * 100);
    const heightScore = estimatedHeight ? Math.min(100, (estimatedHeight / 50) * 100) : 40;
    const irradianceScore = 92;

    const finalScore = Math.round(
      (sunlightScore   * 0.50) +
      (areaScore       * 0.20) +
      (heightScore     * 0.10) +
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
      // Re-run lightweight score ignoring simulated buildings
      let baseSunnyHours = 0;
      for (const hrData of hourlyResults) {
        const solar = getSolarPosition(hrData.hour);
        if (solar.altitudeDeg < 5) continue;
        let baseFrac = 0;
        for (const neighbour of neighbourFeatures) {
          const nAttrs = neighbour.attributes;
          let nH = parseFloat(nAttrs['height']) > 0 ? parseFloat(nAttrs['height']) : null;
          if (!nH && nAttrs['no_floors']) {
            const mm = String(nAttrs['no_floors']).match(/(\d+)/);
            nH = mm ? (parseInt(mm[1]) + 1) * 3 : 6;
          }
          if (!nH || !neighbour.geometry) continue;
          const nGeom2D = { type: 'polygon', rings: neighbour.geometry.rings.map(r => r.map(v => [v[0], v[1]])), spatialReference: neighbour.geometry.spatialReference };
          baseFrac = Math.min(1.0, baseFrac + checkShadowReach(nGeom2D, nH, selectedGeom2D, estimatedHeight || 0, solar));
        }
        if ((1 - baseFrac) * 100 > 30) baseSunnyHours++;
      }
      const baseSunlightScore = eligibleHours > 0 ? (baseSunnyHours / eligibleHours) * 100 : 0;
      baselineScore = Math.max(0, Math.min(100, Math.round(
        (baseSunlightScore * 0.50) + (areaScore * 0.20) + (heightScore * 0.10) + (irradianceScore * 0.20)
      )));
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
  async function drawSimBuildingGraphic(geom, floors) {
    try {
      const [PolygonSymbol3D, ExtrudeSymbol3DLayer] = await Promise.all([
        import('@arcgis/core/symbols/PolygonSymbol3D.js').then(m => m.default),
        import('@arcgis/core/symbols/ExtrudeSymbol3DLayer.js').then(m => m.default),
      ]);
      const heightM = floors * 3.2;
      const graphic = new Graphic({
        geometry: geom,
        symbol: new PolygonSymbol3D({
          symbolLayers: [new ExtrudeSymbol3DLayer({
            size: heightM,
            material: { color: [255, 200, 0, 0.70] },
            edges: { type: 'solid', color: [200, 120, 0, 1], size: 2 },
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
      try { sketchVMRef.current.cancel(); } catch (e) {}
      try { sketchVMRef.current.destroy(); } catch (e) {}
      sketchVMRef.current = null;
    }
    if (sketchLayerRef.current) {
      try {
        sketchLayerRef.current.removeAll();
        view.map.remove(sketchLayerRef.current);
        sketchLayerRef.current.destroy();
      } catch (e) {}
      sketchLayerRef.current = null;
    }
    setIsPlacingSimBuilding(false);
    setDrawingInstructions('');
  };

  /**
   * Start free-form polygon drawing using ArcGIS SketchViewModel.
   * Pattern matches TrueGeoMap's BuildingConstructionWidget / AssetPlacementWidget.
   * User clicks vertices, double-clicks to finish.
   */
  const startDrawingPolygon = () => {
    // Cancel any existing session first
    cancelSketchVM();

    // Capture simFloors NOW (avoid React stale closure since callback fires later)
    const floorsAtDraw = simFloors;

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
        color: [255, 200, 0, 0.25],
        outline: { type: 'simple-line', color: [220, 140, 0, 1], width: 2, style: 'dash' },
      },
    });
    sketchVMRef.current = sketchVM;

    // 3. Listen for completion
    sketchVM.on('create', async (event) => {
      if (event.state === 'complete') {
        const poly = event.graphic?.geometry;

        // Remove sketch preview layer before adding 3D extrusion
        try { sketchLayer.removeAll(); view.map.remove(sketchLayer); sketchLayer.destroy(); } catch (e) {}
        sketchLayerRef.current = null;
        sketchVMRef.current = null;

        if (!poly || !poly.rings || poly.rings.length === 0) {
          setIsPlacingSimBuilding(false);
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

        // Draw the 3D yellow extrusion
        const graphic = await drawSimBuildingGraphic(geomForShadow, floorsAtDraw);

        const entry = {
          id: Date.now(),
          floors: floorsAtDraw,
          height: floorsAtDraw * 3.2,
          geometry: geomForShadow,
          graphic,
        };

        setSimulatedBuildings(prev => [...prev, entry]);
        simGraphicsRef.current.push(graphic);
        setIsPlacingSimBuilding(false);
        setDrawingInstructions('');

      } else if (event.state === 'cancel') {
        try { sketchLayer.removeAll(); view.map.remove(sketchLayer); sketchLayer.destroy(); } catch (e) {}
        sketchLayerRef.current = null;
        sketchVMRef.current = null;
        setIsPlacingSimBuilding(false);
        setDrawingInstructions('');
      }
    });

    // 4. Start drawing
    sketchVM.create('polygon');

    setIsPlacingSimBuilding(true);
    setDrawingInstructions('Click to add vertices · Double-click to complete polygon');
  };


  /** Remove one simulated building */
  const removeSimBuilding = (id) => {
    setSimulatedBuildings(prev => {
      const entry = prev.find(b => b.id === id);
      if (entry?.graphic) try { view.graphics.remove(entry.graphic); } catch (e) {}
      return prev.filter(b => b.id !== id);
    });
  };

  /** Remove all simulated buildings */
  const clearAllSimBuildings = () => {
    cancelSketchVM();
    simGraphicsRef.current.forEach(g => { try { view.graphics.remove(g); } catch (e) {} });
    simGraphicsRef.current = [];
    setSimulatedBuildings([]);
  };

  const runAnalysis = () => {
    if (!selectedBuilding) return;
    setLoading(true);
    view.environment.lighting.directShadowsEnabled = true;
    runShadowAnalysis();
  };

  const resetTool = () => {
    if (highlightHandleRef.current) {
      highlightHandleRef.current.remove();
      highlightHandleRef.current = null;
    }
    setSelectedBuilding(null);
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
    if (!analysisResult || !selectedBuilding) return;
    setSavedMsg('saving');
    try {
      const screenshot = await view.takeScreenshot({ width: 800, height: 500, format: 'png' });
      const buildingName = getBuildingInfo(selectedBuilding.attributes).name || 'Unknown Building';
      const entry = {
        id: Date.now(),
        timestamp: new Date().toISOString(),
        buildingName,
        buildingInfo: getBuildingInfo(selectedBuilding.attributes),
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
    if (!analysisResult || !selectedBuilding) return;
    const { jsPDF } = await import('jspdf');
    const html2canvas = (await import('html2canvas')).default;

    const buildingName = getBuildingInfo(selectedBuilding.attributes).name || 'Building';
    const now = new Date().toLocaleString('en-IN');
    const r = analysisResult;

    // Take map screenshot
    const screenshot = await view.takeScreenshot({ width: 900, height: 500, format: 'png' });

    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const W = 210; const H = 297;
    const margin = 14;
    let y = 0;

    // ── COVER HEADER ────────────────────────────────────────
    pdf.setFillColor(30, 58, 95);
    pdf.rect(0, 0, W, 38, 'F');
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(22); pdf.setFont('helvetica', 'bold');
    pdf.text('SolarSight', margin, 16);
    pdf.setFontSize(10); pdf.setFont('helvetica', 'normal');
    pdf.text('Solar Rooftop Suitability Analysis Report', margin, 24);
    pdf.setFontSize(8); pdf.text(`Generated: ${now}`, margin, 31);
    y = 44;

    // ── BUILDING INFO ────────────────────────────────────────
    pdf.setTextColor(30, 58, 95);
    pdf.setFontSize(14); pdf.setFont('helvetica', 'bold');
    pdf.text(buildingName, margin, y); y += 6;
    pdf.setFontSize(9); pdf.setFont('helvetica', 'normal'); pdf.setTextColor(80, 80, 80);
    pdf.text(`Floors: ${r.floors}   Height: ${r.height !== '—' ? r.height + ' m' : '—'}   Neighbours analysed: ${r.neighbourCount}`, margin, y); y += 5;
    pdf.text(`Suitability Class: ${r.suitabilityClass}`, margin, y); y += 8;

    // ── MAP SCREENSHOT ───────────────────────────────────────
    pdf.addImage(screenshot.dataUrl, 'PNG', margin, y, W - margin * 2, 55);
    y += 60;

    // ── SCORE BANNER ─────────────────────────────────────────
    const scoreColor = r.score > 70 ? [22, 163, 74] : r.score > 40 ? [217, 119, 6] : [220, 38, 38];
    pdf.setFillColor(...scoreColor);
    pdf.rect(margin, y, W - margin * 2, 14, 'F');
    pdf.setTextColor(255, 255, 255); pdf.setFontSize(13); pdf.setFont('helvetica', 'bold');
    pdf.text(`Suitability Score: ${r.score} / 100  —  ${r.label}`, margin + 4, y + 9.5);
    y += 20;

    // ── METRICS TABLE ────────────────────────────────────────
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

    // ── WHAT-IF SECTION ──────────────────────────────────────
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

    // ── METHODOLOGY NOTE ────────────────────────────────────
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
    <div
      ref={contentDivRef}
      className="absolute bg-white text-gray-800 font-sans rounded-xl overflow-hidden shadow-lg z-[99] flex flex-col"
      style={{ ...positionStyle, width: `${panelSize.width}px`, maxHeight: `${panelSize.height}px`, position: 'absolute' }}
    >
      <div className="flex items-center justify-between bg-[#1a73e8] px-3 py-2 cursor-move select-none" onMouseDown={onDragStart}>
        <button
          data-role="collapse-button"
          className="bg-transparent border-none text-white cursor-pointer hover:opacity-80 transition-opacity"
          onClick={() => setIsBodyVisible(!isBodyVisible)}
          aria-label={isBodyVisible ? "Collapse" : "Expand"}
        >
          {isBodyVisible ? "▲" : "▼"}
        </button>

        <div className="text-base text-white font-medium">Solar Suitability</div>

        <button
          data-role="close-button"
          className="bg-transparent border-none text-white cursor-pointer hover:opacity-80 transition-opacity"
          onClick={handleClose}
          aria-label="Close"
        >
          ✖
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
          {!selectedBuilding && !analysisResult && (
            <div className="space-y-3">
              <SearchLocationTool view={view} isFireWidget={true} />
              
              {!isPicking ? (
                <button 
                  onClick={enablePicking} 
                  disabled={!buildingLayer}
                  className={`w-full py-3 rounded text-sm font-medium transition-colors ${buildingLayer ? 'bg-[#1a73e8] text-white hover:bg-blue-700' : 'bg-gray-300 text-gray-500 cursor-not-allowed'}`}
                >
                  🏢 Select Building
                </button>
              ) : (
                <button 
                  onClick={() => {
                    setIsPicking(false);
                    if (clickHandle.current) clickHandle.current.remove();
                  }}
                  className="w-full py-3 rounded text-sm font-medium bg-red-600 text-white hover:bg-red-700 transition-colors"
                >
                  ❌ Cancel Selection
                </button>
              )}
            </div>
          )}

          {selectedBuilding && !analysisResult && (
            <div className="space-y-4 animate-in fade-in zoom-in duration-200">
              {/* Step 1: Building info card */}
              <div style={{
                margin: '12px 0px',
                padding: '12px',
                background: '#eff6ff',
                borderLeft: '3px solid #3b82f6',
                borderRadius: '6px',
                fontSize: '13px'
              }}>
                <div style={{ fontWeight: '600', marginBottom: '8px', color: '#1e40af' }}>
                  ✅ Step 1: Building Selected
                </div>
                <div className="flex justify-between"><span className="text-gray-500">Name/ID:</span> <span className="font-medium truncate max-w-[140px]" title={getBuildingInfo(selectedBuilding.attributes).name}>{getBuildingInfo(selectedBuilding.attributes).name}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Floors:</span> <span className="font-medium">{getBuildingInfo(selectedBuilding.attributes).floors || '—'}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Height:</span> <span className="font-medium">{getBuildingInfo(selectedBuilding.attributes).height ? getBuildingInfo(selectedBuilding.attributes).height + ' m' : '—'}</span></div>
              </div>

              {/* Step 2: Simulate Future Neighbour Buildings */}
              <div style={{ border: '1px solid #fbbf24', borderRadius: '8px', overflow: 'hidden' }}>
                <button
                  onClick={() => setShowSimPanel(p => !p)}
                  style={{
                    width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '10px 12px', background: '#fffbeb', border: 'none', cursor: 'pointer',
                    fontSize: '13px', fontWeight: '600', color: '#92400e',
                  }}
                >
                  <span>🏗️ Step 2: Simulate Future Buildings <span style={{ fontWeight: 400, color: '#b45309', fontSize: 11 }}>(optional)</span></span>
                  <span style={{ fontSize: 10 }}>{showSimPanel ? '▲' : '▼'}{simulatedBuildings.length > 0 && <span style={{ marginLeft: 6, background: '#f59e0b', color: 'white', borderRadius: 10, padding: '1px 6px' }}>{simulatedBuildings.length}</span>}</span>
                </button>

                {showSimPanel && (
                  <div style={{ padding: '12px', background: '#fffdf0', borderTop: '1px solid #fde68a' }}>
                    <p style={{ fontSize: 11, color: '#78716c', marginBottom: 10 }}>
                      Draw the footprint of a hypothetical building. Set floors below, then draw on map.
                    </p>

                    {/* Floors slider */}
                    <div style={{ marginBottom: 10 }}>
                      <label style={{ fontSize: 11, color: '#57534e', display: 'flex', justifyContent: 'space-between' }}>
                        <span>Floors</span>
                        <strong style={{ color: '#92400e' }}>{simFloors} floors = {(simFloors * 3.2).toFixed(0)} m tall</strong>
                      </label>
                      <input type="range" min={1} max={60} value={simFloors}
                        onChange={e => setSimFloors(Number(e.target.value))}
                        style={{ width: '100%', accentColor: '#f59e0b' }} />
                    </div>

                    {/* Draw polygon button */}
                    {!isPlacingSimBuilding ? (
                      <button
                        onClick={startDrawingPolygon}
                        style={{
                          width: '100%', padding: '8px', borderRadius: 6, border: 'none', cursor: 'pointer',
                          background: '#f59e0b', color: 'white', fontWeight: 600, fontSize: 12, marginBottom: 8,
                        }}
                      >
                        ✏️ Draw Building Footprint on Map
                      </button>
                    ) : (
                      <div style={{ marginBottom: 8 }}>
                        <div style={{
                          padding: '8px 10px', background: '#fef3c7', border: '1px dashed #f59e0b',
                          borderRadius: 6, fontSize: 11, color: '#92400e', marginBottom: 6, textAlign: 'center'
                        }}>
                          🖊 {drawingInstructions}
                        </div>
                        <button
                          onClick={cancelSketchVM}
                          style={{
                            width: '100%', padding: '7px', borderRadius: 6, border: 'none', cursor: 'pointer',
                            background: '#dc2626', color: 'white', fontWeight: 600, fontSize: 12,
                          }}
                        >
                          ❌ Cancel Drawing
                        </button>
                      </div>
                    )}

                    {/* Placed buildings list */}
                    {simulatedBuildings.length > 0 && (
                      <div style={{ marginTop: 4 }}>
                        <div style={{ fontSize: 11, color: '#92400e', fontWeight: 600, marginBottom: 4 }}>Placed buildings:</div>
                        {simulatedBuildings.map((sb, i) => (
                          <div key={sb.id} style={{
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                            padding: '4px 8px', background: '#fef3c7', borderRadius: 4, marginBottom: 3, fontSize: 12
                          }}>
                            <span style={{ color: '#78350f' }}>🟡 Bldg {i + 1} — {sb.floors} floors ({sb.height.toFixed(0)}m)</span>
                            <button onClick={() => removeSimBuilding(sb.id)}
                              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#dc2626', fontSize: 14 }}>🗑</button>
                          </div>
                        ))}
                        <button onClick={clearAllSimBuildings}
                          style={{ fontSize: 11, color: '#dc2626', background: 'none', border: 'none', cursor: 'pointer', padding: '2px 0' }}>
                          🗑 Clear all simulated buildings
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Step 3: Run Analysis */}
              <div className="flex gap-2 pt-1">
                <button
                  onClick={runAnalysis}
                  disabled={loading}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 rounded-lg font-medium text-sm transition-colors shadow-sm disabled:opacity-50"
                >
                  {loading ? 'Computing...' : `☀️ Run Analysis${simulatedBuildings.length > 0 ? ` (+${simulatedBuildings.length} sim)` : ''}`}
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
                    Analysing shadows: {Math.floor(6 + (simulationProgress / 100) * 12)}:00 →
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all duration-200 ease-linear"
                      style={{ width: `${simulationProgress}%` }}
                    ></div>
                  </div>
                </div>
              )}
            </div>
          )}

          {analysisResult && (
            <div className="space-y-5 animate-in slide-in-from-right-4 duration-300">
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '16px',
                padding: '16px',
                background: '#f8fafc',
                borderBottom: '1px solid #e5e7eb',
                borderRadius: '8px'
              }}>
                <ScoreGauge score={analysisResult.score} />
                <div className="flex-1">
                  <div className="text-3xl font-extrabold text-gray-800">{analysisResult.score} <span className="text-base font-normal text-gray-400">/ 100</span></div>
                  <div className={`text-sm font-semibold mt-0.5 ${analysisResult.score > 70 ? 'text-green-600' : analysisResult.score > 40 ? 'text-amber-600' : 'text-red-600'}`}>{analysisResult.label}</div>
                  <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>
                    Class: <strong style={{ color: '#1e3a5f' }}>{analysisResult.suitabilityClass}</strong>
                  </div>
                </div>
              </div>

              {/* What-If Impact Card */}
              {analysisResult.simCount > 0 && analysisResult.baselineScore !== null && (
                <div style={{ border: '1px solid #fbbf24', borderRadius: 8, overflow: 'hidden', background: '#fffbeb' }}>
                  <div style={{ padding: '8px 12px', background: '#f59e0b', color: 'white', fontWeight: 700, fontSize: 12, letterSpacing: '0.05em' }}>
                    ⚡ WHAT-IF IMPACT ANALYSIS
                  </div>
                  <div style={{ padding: '10px 12px', fontSize: 13 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
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
                    <div style={{ textAlign: 'center', padding: '6px 0', borderTop: '1px solid #fde68a', fontWeight: 700, fontSize: 15,
                      color: analysisResult.simImpact <= -5 ? '#dc2626' : analysisResult.simImpact >= 0 ? '#16a34a' : '#d97706' }}>
                      {analysisResult.simImpact > 0 ? '+' : ''}{analysisResult.simImpact} points impact
                      {' '}{analysisResult.simImpact <= -10 ? '🔴 High Impact' : analysisResult.simImpact <= -5 ? '🟡 Moderate Impact' : '🟢 Low Impact'}
                    </div>
                    <p style={{ fontSize: 10, color: '#78716c', marginTop: 6, textAlign: 'center' }}>
                      {analysisResult.simImpact <= -5
                        ? `The simulated building(s) would significantly reduce solar potential by creating additional shade.`
                        : `The simulated building(s) have minimal impact on this rooftop's solar potential.`}
                    </p>
                  </div>
                </div>
              )}

              {/* ── Shadow & Sunlight ── */}
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', color: '#1e3a5f', padding: '6px 0 2px', borderBottom: '2px solid #dbeafe' }}>
                ☀️ SHADOW &amp; SUNLIGHT
              </div>
              <div className="border rounded-lg overflow-hidden shadow-sm">
                {[
                  ['Sunny Hours (6am–6pm)', `${analysisResult.sunnyHours} / 13 hrs`],
                  ['Avg Rooftop Sunlit %', `${analysisResult.avgSunlit}%`],
                  ['Neighbours Analysed', `${analysisResult.neighbourCount} buildings`],
                ].map(([label, value], i) => (
                  <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: i % 2 === 0 ? '#eff6ff' : '#fff', fontSize: 13 }}>
                    <span style={{ color: '#6b7280' }}>{label}</span>
                    <span style={{ fontWeight: 700, color: '#1e40af' }}>{value}</span>
                  </div>
                ))}
              </div>

              {/* ── Rooftop & Panels ── */}
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', color: '#1e3a5f', padding: '6px 0 2px', borderBottom: '2px solid #dcfce7' }}>
                🏠 ROOFTOP &amp; PANEL PLACEMENT
              </div>
              <div className="border rounded-lg overflow-hidden shadow-sm">
                {[
                  ['Total Rooftop Area', `${analysisResult.area} m²`],
                  ['Usable Area (70%)', `${analysisResult.usableArea} m²`],
                  ['Est. Panel Count', `${analysisResult.panelCount} panels`],
                  ['Panel Rating', '330 W each'],
                  ['Floors / Height', `${analysisResult.floors} / ${analysisResult.height !== '—' ? analysisResult.height + ' m' : '—'}`],
                ].map(([label, value], i) => (
                  <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: i % 2 === 0 ? '#f0fdf4' : '#fff', fontSize: 13 }}>
                    <span style={{ color: '#6b7280' }}>{label}</span>
                    <span style={{ fontWeight: 700, color: '#15803d' }}>{value}</span>
                  </div>
                ))}
              </div>

              {/* ── Energy Potential ── */}
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', color: '#1e3a5f', padding: '6px 0 2px', borderBottom: '2px solid #fef9c3' }}>
                ⚡ SOLAR ENERGY POTENTIAL
              </div>
              <div className="border rounded-lg overflow-hidden shadow-sm">
                {[
                  ['Installed Capacity', `${analysisResult.capacity} kWp`],
                  ['Annual Generation', `${analysisResult.generation} kWh/yr`],
                  ['Solar Irradiance', '~1500 kWh/kWp (Mumbai)'],
                ].map(([label, value], i) => (
                  <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: i % 2 === 0 ? '#fefce8' : '#fff', fontSize: 13 }}>
                    <span style={{ color: '#6b7280' }}>{label}</span>
                    <span style={{ fontWeight: 700, color: '#b45309' }}>{value}</span>
                  </div>
                ))}
              </div>

              {/* ── Financial & Environmental ── */}
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', color: '#1e3a5f', padding: '6px 0 2px', borderBottom: '2px solid #fce7f3' }}>
                💰 FINANCIAL &amp; ENVIRONMENTAL
              </div>
              <div className="border rounded-lg overflow-hidden shadow-sm">
                {[
                  ['Annual Savings', `₹${Number(analysisResult.annualSavings).toLocaleString('en-IN')}/yr`],
                  ['Installation Cost', `₹${Number(analysisResult.installCost).toLocaleString('en-IN')}`],
                  ['Payback Period', `${analysisResult.paybackYears} years`],
                  ['CO₂ Saved', `${analysisResult.co2Saved} tonnes/yr`],
                ].map(([label, value], i) => (
                  <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: i % 2 === 0 ? '#fdf2f8' : '#fff', fontSize: 13 }}>
                    <span style={{ color: '#6b7280' }}>{label}</span>
                    <span style={{ fontWeight: 700, color: '#be185d' }}>{value}</span>
                  </div>
                ))}
              </div>

              {/* ── Daylight Widget ── */}
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', color: '#6b7280', padding: '10px 0 4px', borderTop: '1px solid #e5e7eb' }}>
                VISUAL ANALYSIS
              </div>
              <div
                ref={widgetContainerRef}
                className="esri-widget daylight-container overflow-hidden bg-gray-50"
                style={{ width: '100%', minHeight: '280px', padding: 0, margin: 0, background: 'transparent', position: 'relative' }}
              >
                {!isWidgetReady && (
                  <div className="absolute inset-0 flex items-center justify-center text-gray-400 text-xs">
                    Loading daylight widget...
                  </div>
                )}
              </div>

              {/* ── Action Buttons ── */}
              <div style={{ display: 'flex', gap: 8, paddingTop: 4 }}>
                <button
                  onClick={exportPDF}
                  style={{ flex: 1, padding: '9px 0', borderRadius: 7, border: 'none', cursor: 'pointer', background: '#1e3a5f', color: 'white', fontWeight: 700, fontSize: 13 }}
                >
                  📄 Export PDF
                </button>
                <button
                  onClick={saveAnalysis}
                  disabled={savedMsg === 'saving'}
                  style={{ flex: 1, padding: '9px 0', borderRadius: 7, border: 'none', cursor: 'pointer', background: savedMsg === 'saved' ? '#16a34a' : '#2563eb', color: 'white', fontWeight: 700, fontSize: 13, opacity: savedMsg === 'saving' ? 0.6 : 1 }}
                >
                  {savedMsg === 'saving' ? '⏳ Saving...' : savedMsg === 'saved' ? '✅ Saved!' : '💾 Save Analysis'}
                </button>
              </div>

              <button
                onClick={resetTool}
                className="w-full py-2 bg-white hover:bg-gray-50 text-gray-700 rounded-lg font-medium text-sm border border-gray-300 shadow-sm transition-colors"
              >
                🔄 Start Over
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Resize grip (bottom-right corner) ── */}
      <div
        onMouseDown={onResizeStart}
        title="Drag to resize"
        style={{
          position: 'absolute',
          bottom: 0,
          right: 0,
          width: 18,
          height: 18,
          cursor: 'nwse-resize',
          zIndex: 200,
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'flex-end',
          padding: '3px',
          opacity: 0.45,
        }}
      >
        <svg width="10" height="10" viewBox="0 0 10 10" fill="#1a73e8">
          <path d="M9 1L1 9M5 1L1 5M9 5L5 9" stroke="#1a73e8" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
      </div>
    </div>
  );
};

export default SolarSuitabilityTool;

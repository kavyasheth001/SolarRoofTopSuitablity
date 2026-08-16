import React, { useEffect, useRef, useState, useCallback } from 'react';
import Daylight from "@arcgis/core/widgets/Daylight.js";
import Graphic from "@arcgis/core/Graphic.js";
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
  
  const [simulating, setSimulating] = useState(false);
  const [simulationProgress, setSimulationProgress] = useState(0);

  // Initialize tool: LOD layers & find building layer
  useEffect(() => {
    if (!view || !view.map) return;

    // 1. LOD Layers handling
    lodTitles.forEach(title => {
      const layer = view.map.layers.find(l => l.title === title);
      if (layer) {
        lodOriginalVisibility.current[title] = layer.visible;
        layer.visible = true;
      }
    });

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
      lodTitles.forEach(title => {
        const layer = view.map.layers.find(l => l.title === title);
        if (layer && lodOriginalVisibility.current[title] !== undefined) {
          layer.visible = lodOriginalVisibility.current[title];
        }
      });
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
    
    // Highlight
    view.graphics.removeAll();
    if (highlightHandleRef.current) {
      highlightHandleRef.current.remove();
      highlightHandleRef.current = null;
    }
    try {
      const layerView = await view.whenLayerView(buildingLayer);
      // Use objectid for reliable highlight on queried features
      const oid = feature.attributes?.objectid ?? feature.attributes?.OBJECTID;
      if (oid != null) {
        highlightHandleRef.current = layerView.highlight(oid);
      } else {
        highlightHandleRef.current = layerView.highlight(feature);
      }
    } catch (err) {
      console.warn("Highlight failed:", err);
    }
    
    // Zoom
    view.goTo({ target: feature.geometry, zoom: 18, tilt: 60 });
    
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

  function checkShadowReach(neighbourGeom2D, nHeight, selectedGeom2D, selectedHeight, solar) {
    if (solar.altitudeRad <= 0.087) return 0; // sun too low

    const effectiveHeight = Math.max(0, nHeight - (selectedHeight || 0));
    if (effectiveHeight <= 0) return 0; // neighbour shorter than selected

    const shadowLength = effectiveHeight / Math.tan(solar.altitudeRad);
    const shadowAzimuth = solar.azimuthRad + Math.PI; // shadow falls opposite sun

    try {
      const nRing = neighbourGeom2D.rings[0];
      const sRing = selectedGeom2D.rings[0];
      if (!nRing || !sRing) return 0;

      const nCx = nRing.reduce((s, v) => s + v[0], 0) / nRing.length;
      const nCy = nRing.reduce((s, v) => s + v[1], 0) / nRing.length;
      const sCx = sRing.reduce((s, v) => s + v[0], 0) / sRing.length;
      const sCy = sRing.reduce((s, v) => s + v[1], 0) / sRing.length;

      // Detect coordinate system: Web Mercator (wkid 3857/102100) coords are in meters
      const sr = neighbourGeom2D.spatialReference;
      const isWebMercator = sr && (sr.wkid === 3857 || sr.wkid === 102100 || sr.latestWkid === 3857);

      let dx, dy;
      if (isWebMercator) {
        // Coordinates already in meters — use directly
        dx = sCx - nCx;
        dy = sCy - nCy;
      } else {
        // Geographic (degrees) — convert to meters
        dx = (sCx - nCx) * 111320 * Math.cos(19.076 * Math.PI / 180);
        dy = (sCy - nCy) * 110540;
      }
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance < 1) return 0; // same building

      // Direction FROM neighbour TO selected building
      const dirToSelected = Math.atan2(dx, dy);

      // Angular difference between shadow direction and direction to selected building
      let angleDiff = Math.abs((dirToSelected - shadowAzimuth) % (2 * Math.PI));
      if (angleDiff > Math.PI) angleDiff = 2 * Math.PI - angleDiff;

      if (angleDiff > Math.PI / 2.6) return 0; // ±70° arc

      if (shadowLength < distance) return 0; // shadow doesn't reach

      // Shadow fraction: approximate based on angular width of neighbour vs distance
      const nXs = nRing.map(v => v[0]);
      const nYs = nRing.map(v => v[1]);
      let nWidthM, nDepthM;
      if (isWebMercator) {
        nWidthM = Math.max(...nXs) - Math.min(...nXs);
        nDepthM = Math.max(...nYs) - Math.min(...nYs);
      } else {
        nWidthM = (Math.max(...nXs) - Math.min(...nXs)) * 111320 * Math.cos(19.076 * Math.PI / 180);
        nDepthM = (Math.max(...nYs) - Math.min(...nYs)) * 110540;
      }
      const neighbourDiameter = Math.sqrt(nWidthM * nWidthM + nDepthM * nDepthM);
      const angularCoverage = Math.atan2(neighbourDiameter / 2, distance);

      const sXs = sRing.map(v => v[0]);
      const sYs = sRing.map(v => v[1]);
      let sWidthM, sDepthM;
      if (isWebMercator) {
        sWidthM = Math.max(...sXs) - Math.min(...sXs);
        sDepthM = Math.max(...sYs) - Math.min(...sYs);
      } else {
        sWidthM = (Math.max(...sXs) - Math.min(...sXs)) * 111320 * Math.cos(19.076 * Math.PI / 180);
        sDepthM = (Math.max(...sYs) - Math.min(...sYs)) * 110540;
      }
      const selectedDiameter = Math.sqrt(sWidthM * sWidthM + sDepthM * sDepthM);
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

      for (const neighbour of neighbourFeatures) {
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
          spatialReference: neighbour.geometry.spatialReference
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

    setAnalysisResult({
      score: clampedScore,
      label: potentialLabel,
      sunnyHours,
      avgSunlit,
      hourlyResults,
      area: area.toFixed(1),
      usableArea: usableArea.toFixed(1),
      floors: floors ?? "\u2014",
      height: estimatedHeight ? estimatedHeight.toFixed(1) : "\u2014",
      capacity,
      generation,
      neighbourCount: neighbourFeatures.length,
    });

    setSimulating(false);
    setLoading(false);
  }

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
      style={{ ...positionStyle, width: '340px', maxHeight: '520px' }}
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
              <div style={{
                margin: '12px 0px',
                padding: '12px',
                background: '#eff6ff',
                borderLeft: '3px solid #3b82f6',
                borderRadius: '6px',
                fontSize: '13px'
              }}>
                <div style={{ fontWeight: '600', marginBottom: '8px', color: '#1e40af' }}>
                  Building Selected
                </div>
                <div className="flex justify-between"><span className="text-gray-500">Name/ID:</span> <span className="font-medium truncate max-w-[140px]" title={getBuildingInfo(selectedBuilding.attributes).name}>{getBuildingInfo(selectedBuilding.attributes).name}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Floors:</span> <span className="font-medium">{getBuildingInfo(selectedBuilding.attributes).floors || "—"}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Height:</span> <span className="font-medium">{getBuildingInfo(selectedBuilding.attributes).height ? getBuildingInfo(selectedBuilding.attributes).height + " m" : "—"}</span></div>
              </div>
              
              <div className="flex gap-2 pt-2">
                <button 
                  onClick={runAnalysis} 
                  disabled={loading}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 rounded-lg font-medium text-sm transition-colors shadow-sm disabled:opacity-50"
                >
                  {loading ? 'Computing...' : '☀️ Run Analysis'}
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
                </div>
              </div>

              <div className="border rounded-lg overflow-hidden shadow-sm">
                {[
                  ['Sunny Hours', `${analysisResult.sunnyHours} / 13 hrs`],
                  ['Avg Rooftop Sunlit', `${analysisResult.avgSunlit}%`],
                  ['Neighbours Analysed', `${analysisResult.neighbourCount}`],
                  ['Rooftop Area', `${analysisResult.area} m²`],
                  ['Est. Capacity', `${analysisResult.capacity} kWp`],
                  ['Est. Generation', `${analysisResult.generation} kWh/yr`],
                ].map(([label, value], i) => (
                  <div key={label} style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    padding: '8px 16px',
                    background: i % 2 === 0 ? '#ffffff' : '#f9fafb',
                    fontSize: '13px',
                  }}>
                    <span style={{ color: '#6b7280' }}>{label}</span>
                    <span style={{ 
                      fontWeight: '600', 
                      color: label === 'Est. Generation' ? '#2563eb' : '#111827' 
                    }}>{value}</span>
                  </div>
                ))}
              </div>

              <div className="space-y-2">
                <div style={{ 
                  fontSize: '11px', 
                  fontWeight: '600', 
                  letterSpacing: '0.08em',
                  color: '#6b7280', 
                  padding: '10px 16px 4px',
                  borderTop: '1px solid #e5e7eb',
                  marginTop: '8px'
                }}>
                  VISUAL ANALYSIS
                </div>
                <div 
                  ref={widgetContainerRef} 
                  className="esri-widget daylight-container overflow-hidden bg-gray-50"
                  style={{
                    width: '100%',
                    minHeight: '280px',
                    padding: 0,
                    margin: 0,
                    background: 'transparent',
                    position: 'relative',
                  }}
                >
                  {!isWidgetReady && (
                    <div className="absolute inset-0 flex items-center justify-center text-gray-400 text-xs">
                      Loading daylight widget...
                    </div>
                  )}
                </div>
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
    </div>
  );
};

export default SolarSuitabilityTool;

"use client"

import { useEffect, useRef, useState } from "react"
import Graphic from "@arcgis/core/Graphic"
import Point from "@arcgis/core/geometry/Point"
import SimpleMarkerSymbol from "@arcgis/core/symbols/SimpleMarkerSymbol"
import TextSymbol from "@arcgis/core/symbols/TextSymbol"
import axios from "axios"
import { FaPage4, FaRegNewspaper, FaSearchLocation } from "react-icons/fa"
import { LuBuilding } from "react-icons/lu"
import { Paperclip } from "lucide-react"
import { IoNavigateCircle, IoSearchOutline } from "react-icons/io5"
import { TbMapPinSearch } from "react-icons/tb"

const SearchLocationTool = ({ view, enabled = true ,isFireWidget, WidgetPosition}) => {

  // --- State
  const [searchValue, setSearchValue] = useState("")
  const [searchSuggestions, setSearchSuggestions] = useState([])
  const [activeIndex, setActiveIndex] = useState(-1) // for keyboard nav
  const [showSearchSuggestions, setShowSearchSuggestions] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isVisible, setIsVisible] = useState(true)
const [searchMode, setSearchMode] = useState('location') // 'location', 'sac', 'cts', or 'latlong'
const [isSearching, setIsSearching] = useState(false)
const [isDropdownOpen, setIsDropdownOpen] = useState(false)
const dropdownRef = useRef(null)

const buildingLayerRef = useRef(null)
const propertyOwnershipLayerRef = useRef(null)
const blinkIntervalRef = useRef(null)
const highlightedGraphicRef = useRef(null)
  const BASE_URL = import.meta.env.VITE_BASE_URL
  const token = localStorage.getItem('token');

  // --- Refs
  const panelRef = useRef(null)
  const inputWrapperRef = useRef(null)
  const inputRef = useRef(null)
  const currentMarkerRef = useRef(null) // Track current marker

  useEffect(() => {
  
   setPosition({...position, width: isFireWidget ? "97%" : searchValue !== ""  ? "360px" : "260px"})
  }, [searchValue]);
  
  // --- Positioning (panel container)
  useEffect(() => {
    
    console.log(isFireWidget, "isFireWidget");
  
  }, [isFireWidget])
  
  

  const [position, setPosition] = useState({
    
    position: isFireWidget ? "static" :"absolute",
    display: isFireWidget ? "flex":"block" ,
    alignItems : "center",
    justifyContent : "center",
    top: WidgetPosition?.top || "6px",
    ...(WidgetPosition?.right
    ? { right: WidgetPosition.right }
    : { left: "55px" }),
    width:  isFireWidget ? "97%" : searchValue !== ""  ? "360px" : "260px",
    color: "#111827",
    fontFamily: "Inter, system-ui, Arial, sans-serif",
    borderRadius: "12px",
    overflow: "visible",
    zIndex: 9,
    margin : isFireWidget ?"10px 3px 10px 3px " : "0px",
  })

  
  // --- Utilities
  const debounce = (fn, wait) => {
    let t
    return (...args) => {
      clearTimeout(t)
      t = setTimeout(() => fn(...args), wait)
    }
  }

  // Find Building2 layer
const findBuildingLayer = () => {
  const findInCollection = (collection) => {
    for (const layer of collection) {
      if (layer.type === 'group') {
        const found = findInCollection(layer.layers.items);
        if (found) return found;
      } else if (layer.type === 'feature' && layer.title === 'Building2') {
        return layer;
      }
    }
    return null;
  };
  return findInCollection(view?.map?.layers?.items || []);
};

// Find Property Ownership layer from Development Plan group
const findPropertyOwnershipLayer = () => {
  const findInCollection = (collection) => {
    for (const layer of collection) {
      if (layer.type === 'group' && layer.title === 'Development Plan') {
        // Found the Development Plan group, now search for Property Ownership
        for (const subLayer of layer.layers.items) {
          if (subLayer.type === 'feature' && subLayer.title === 'Property Ownership') {
            return subLayer;
          }
        }
      } else if (layer.type === 'group') {
        const found = findInCollection(layer.layers.items);
        if (found) return found;
      }
    }
    return null;
  };
  return findInCollection(view?.map?.layers?.items || []);
};

// Create blinking graphic
const createBlinkingFeatureGraphic = (geometry, isRed = true) => {
  return new Graphic({
    geometry: geometry,
    symbol: {
      type: 'simple-fill',
      color: isRed ? [255, 0, 0, 0.8] : [0, 191, 255, 0.8],
      outline: {
        color: isRed ? [255, 0, 0, 1] : [0, 191, 255, 1],
        width: 3,
      },
    },
  });
};

// Start blink effect
const startBlinkEffect = (feature) => {
  if (blinkIntervalRef.current) {
    clearInterval(blinkIntervalRef.current);
  }

  let isRed = true;
  blinkIntervalRef.current = setInterval(() => {
    const existingFeatureGraphic = view.graphics.items.find(
      (graphic) =>
        graphic.geometry &&
        graphic.symbol &&
        graphic.symbol.type === 'simple-fill'
    );
    if (existingFeatureGraphic) {
      view.graphics.remove(existingFeatureGraphic);
    }

    const blinkingGraphic = createBlinkingFeatureGraphic(feature.geometry, isRed);
    view.graphics.add(blinkingGraphic);
    
    isRed = !isRed;
  }, 500);
};

// Stop blink effect
const stopBlinkEffect = () => {
  if (blinkIntervalRef.current) {
    clearInterval(blinkIntervalRef.current);
    blinkIntervalRef.current = null;
  }
  const blinkingGraphics = view.graphics.items.filter(
    graphic => graphic.symbol && graphic.symbol.type === 'simple-fill'
  );
  blinkingGraphics.forEach(graphic => view.graphics.remove(graphic));
};

  // --- API search (axios version)
  const searchPlaces = async (text) => {
    const q = text?.trim()
    if (!q || q.length < 3) {
      setSearchSuggestions([])
      setShowSearchSuggestions(false)
      setActiveIndex(-1)
      return
    }

    setIsLoading(true)
    try {
      const res = await axios.get(`${BASE_URL}/api/places`, {
        params: { text: q },
        // Optional: tighten the screws if your API sometimes hangs
        timeout: 10000,
        headers: {
          "Accept": "application/json",
           Authorization: token 
        },
      })

      const data = res?.data
      if (data?.message === "Search completed successfully" && data?.data?.features?.length) {
        const suggestions = data.data.features.map((f, idx) => ({
          id: f?.properties?.id ?? `feat-${idx}`,
          name: f?.properties?.name ?? f?.properties?.label ?? q,
          label: f?.properties?.label ?? "",
          address: f?.properties?.street ?? "",
          coordinates: f?.geometry?.coordinates, // [lon, lat]
          postalcode: f?.properties?.postalcode ?? "",
        }))
        setSearchSuggestions(suggestions)
        setShowSearchSuggestions(true)
        setActiveIndex(-1)
      } else {
        setSearchSuggestions([])
        setShowSearchSuggestions(true)
        setActiveIndex(-1)
      }
    } catch (e) {
      console.error("Search API error (axios):", e?.message || e)
      setSearchSuggestions([])
      setShowSearchSuggestions(true)
      setActiveIndex(-1)
    } finally {
      setIsLoading(false)
    }
  }

  // SAC Search functionality
const searchBySAC = async (sacNumber) => {
  const layer = buildingLayerRef.current;
  if (!layer) {
    console.error('Building layer not found');
    return;
  }
  
  if (!sacNumber.trim()) {
    console.log('No SAC entered');
    return;
  }

  setIsSearching(true);
  
  try {
    if (!layer.loaded) {
      await layer.load();
    }

    const query = layer.createQuery();
    
    const possibleSacFields = ['sac_number', 'sacnumber', 'SACnumber', 'SAC_Number', 'SAC'];
    let whereClause = '';
    let fieldUsed = '';
    
    if (layer.fields) {
      const availableFields = layer.fields.map(f => f.name.toLowerCase());
      
      for (const field of possibleSacFields) {
        if (availableFields.includes(field.toLowerCase())) {
          whereClause = `${field} = '${sacNumber.trim()}'`;
          fieldUsed = field;
          break;
        }
      }
    }
    
    if (!whereClause) {
      whereClause = `sacnumber = '${sacNumber.trim()}'`;
      fieldUsed = 'sacnumber';
    }
    
    query.where = whereClause;
    query.returnGeometry = true;
    query.outFields = ['*'];

    const result = await layer.queryFeatures(query);

    if (!result.features || result.features.length === 0) {
      console.log('No building found for SAC:', sacNumber);
      return;
    }

    const feature = result.features[0];
    
    layer.definitionExpression = whereClause;
    layer.visible = true;

    await view.goTo({
      target: feature.geometry,
      zoom: 19,
      tilt: 0,
    }, { duration: 1000 });

    startBlinkEffect(feature);

  } catch (error) {
    console.error('SAC search failed:', error);
  } finally {
    setIsSearching(false);
  }
};

// CTS CS No Search functionality
const searchByCTS = async (ctsNumber) => {
  const layer = propertyOwnershipLayerRef.current;
  if (!layer) {
    console.error('Property Ownership layer not found');
    return;
  }
  
  if (!ctsNumber.trim()) {
    console.log('No CTS CS No entered');
    return;
  }

  setIsSearching(true);
  
  try {
    if (!layer.loaded) {
      await layer.load();
    }

    const query = layer.createQuery();
    
    // Possible field name variations for CTS CS No
    const possibleCtsFields = ['CTS CS No', 'CTS_CS_No', 'CTSCSNO', 'cts_cs_no', 'CTSCSNo'];
    let whereClause = '';
    let fieldUsed = '';
    
    if (layer.fields) {
      const availableFields = layer.fields.map(f => f.name.toLowerCase());
      
      for (const field of possibleCtsFields) {
        if (availableFields.includes(field.toLowerCase())) {
          // Find the actual field name from layer
          const actualField = layer.fields.find(f => f.name.toLowerCase() === field.toLowerCase());
          whereClause = `${actualField.name} = '${ctsNumber.trim()}'`;
          fieldUsed = actualField.name;
          break;
        }
      }
    }
    
    if (!whereClause) {
      // Default fallback
      whereClause = `"CTS CS No" = '${ctsNumber.trim()}'`;
      fieldUsed = 'CTS CS No';
    }
    
    query.where = whereClause;
    query.returnGeometry = true;
    query.outFields = ['*'];

    const result = await layer.queryFeatures(query);

    if (!result.features || result.features.length === 0) {
      console.log('No property found for CTS CS No:', ctsNumber);
      return;
    }

    const feature = result.features[0];
    // Enable parent "Development Plan" layer
const developmentPlanLayer = view.map.layers.items.find(layer => 
  layer.type === 'group' && layer.title === 'Development Plan'
);
if (developmentPlanLayer) {
  developmentPlanLayer.visible = true;
}
    
    layer.definitionExpression = whereClause;
    layer.visible = true;

    await view.goTo({
      target: feature.geometry,
      zoom: 19,
      tilt: 0,
    }, { duration: 1000 });

    startBlinkEffect(feature);

  } catch (error) {
    console.error('CTS search failed:', error);
  } finally {
    setIsSearching(false);
  }
};

// Parse lat/long from various formats (Google Maps style)
const parseLatLong = (input) => {
  if (!input || !input.trim()) return null;

  const trimmed = input.trim();
  
  // Try to match various formats:
  // "19.0760, 72.8777"
  // "19.0760,72.8777"
  // "19.0760 72.8777"
  const patterns = [
    /^(-?\d+\.?\d*)[,\s]+(-?\d+\.?\d*)$/, // lat, lon or lat lon
  ];

  for (const pattern of patterns) {
    const match = trimmed.match(pattern);
    if (match && match.length === 3) {
      const lat = parseFloat(match[1]);
      const lon = parseFloat(match[2]);
      
      // Basic validation
      if (!isNaN(lat) && !isNaN(lon) && 
          lat >= -90 && lat <= 90 && 
          lon >= -180 && lon <= 180) {
        return { lat, lon };
      }
    }
  }

  return null;
};

// Lat/Long Search functionality
const searchByLatLong = async (latLongInput) => {
  if (!latLongInput.trim()) {
    console.log('No lat/long entered');
    return;
  }

  setIsSearching(true);
  
  try {
    const parsed = parseLatLong(latLongInput);
    
    if (!parsed) {
      alert('❌ Invalid format. Please enter coordinates like: 19.0760, 72.8777');
      setIsSearching(false);
      return;
    }

    const { lat, lon } = parsed;
    
    // Add marker and navigate to location
    await addMarkerOnGround(lon, lat, `${lat.toFixed(6)}, ${lon.toFixed(6)}`);

  } catch (error) {
    console.error('Lat/Long search failed:', error);
  } finally {
    setIsSearching(false);
  }
};

  const debouncedSearch = debounce(searchPlaces, 250)

  // --- 3D helpers
  const getGroundElevation = async (lon, lat) => {
    try {
      if (!view || view.destroyed || view.type !== "3d" || !view.map?.ground) return 0
      const pt = new Point({ longitude: lon, latitude: lat, spatialReference: { wkid: 4326 } })
      const elev = await view.map.ground.queryElevation(pt)
      return elev?.geometry?.z ?? 0
    } catch (e) {
      console.warn("Error getting ground elevation:", e)
      return 0
    }
  }

  // --- Enhanced marker creation with multiple fallback strategies
  const createReliableMarker = (point, name = "") => {
    // Strategy 1: Try picture marker first (but with better error handling)
    const pictureMarker = new Graphic({
      geometry: point,
      symbol: {
        type: "picture-marker",
        url: "https://static.arcgis.com/images/Symbols/Shapes/RedPin1LargeB.png",
        width: "32px",
        height: "32px",
        yoffset: "16px",
      },
      attributes: {
        type: "search-marker",
        name: name
      }
    })

    // Strategy 2: Create a simple marker as backup
    // const simpleMarker = new Graphic({
    //   geometry: point,
    //   symbol: new SimpleMarkerSymbol({
    //     style: "circle",
    //     color: [255, 0, 0, 0.8], // Red with transparency
    //     size: "16px",
    //     outline: {
    //       color: [255, 255, 255, 1], // White outline
    //       width: 2
    //     }
    //   }),
    //   attributes: {
    //     type: "search-marker-simple",
    //     name: name
    //   }
    // })

    // Strategy 3: Add a text label that's always visible
    const textMarker = new Graphic({
      geometry: new Point({
        longitude: point.longitude,
        latitude: point.latitude,
        z: (point.z || 0) + 50, // Slightly elevated
        spatialReference: point.spatialReference
      }),
      symbol: new TextSymbol({
        text: name || "📍",
        color: [255, 0, 0, 1],
        font: {
          size: "14px",
          weight: "bold"
        },
        haloColor: [255, 255, 255, 0.8],
        haloSize: "2px"
      }),
      attributes: {
        type: "search-marker-text",
        name: name
      }
    })

    return { pictureMarker, textMarker }
  }

  // --- Enhanced marker addition with persistence
  const addMarkerOnGround = async (lon, lat, name = "") => {
    if (!view || view.destroyed) return
    
    try {
      await view.when()
      
      // Remove existing search markers
      const existingMarkers = view.graphics.filter(g => 
        g.attributes?.type?.startsWith?.("search-marker")
      )
      existingMarkers.forEach(marker => view.graphics.remove(marker))
      
      const z = await getGroundElevation(lon, lat)
      const point = new Point({ 
        longitude: lon, 
        latitude: lat, 
        z: z + 5, // Slightly elevated to ensure visibility
        spatialReference: { wkid: 4326 } 
      })

      const { pictureMarker, textMarker } = createReliableMarker(point, name)
      
      // Add all marker types for maximum visibility
      view.graphics.addMany([pictureMarker, textMarker])
      
      // Store reference to current markers
      currentMarkerRef.current = [pictureMarker,  textMarker]

      // Enhanced navigation with better error handling
      try {
        const targetScale = view.type === "3d" ? 4500 : 50000
        await view.goTo({
          target: point,
          tilt: view.type === "3d" ? 45 : 0,
          scale: targetScale,
          heading: view.camera?.heading || 0
        }, {
          duration: 2000,
          easing: "ease-in-out"
        })
      } catch (navError) {
        console.warn("Navigation error, using fallback:", navError)
        // Fallback: Simple center and zoom
        await view.goTo(point, { duration: 1000 })
      }

      // Force refresh the view to ensure markers are visible
      setTimeout(() => {
        if (view && !view.destroyed) {
          view.tryFatalErrorRecovery()
        }
      }, 500)

    } catch (e) {
      console.error("❌ Error adding search marker:", e)
      
      // Emergency fallback: add a basic point at ground level
      try {
        const fallbackPoint = new Point({ longitude: lon, latitude: lat, spatialReference: { wkid: 4326 } })
        const fallbackMarker = new Graphic({
          geometry: fallbackPoint,
          symbol: new SimpleMarkerSymbol({
            style: "diamond",
            color: [255, 0, 0, 1],
            size: "20px",
            outline: { color: [255, 255, 255, 1], width: 3 }
          })
        })
        view.graphics.add(fallbackMarker)
        currentMarkerRef.current = [fallbackMarker]
        await view.goTo(fallbackPoint)
      } catch (fallbackError) {
        console.error("Even fallback marker failed:", fallbackError)
      }
    }
  }

  // --- Monitor view changes and re-add markers if they disappear
  useEffect(() => {
    if (!view || !enabled) return

    const handleViewUpdate = () => {
      // Check if our markers are still there
      if (currentMarkerRef.current && currentMarkerRef.current.length > 0) {
        const markersInView = currentMarkerRef.current.filter(marker => 
          view.graphics.includes(marker)
        )
        
        // If markers are missing, re-add them
        if (markersInView.length === 0 && currentMarkerRef.current.length > 0) {
          console.log("Markers disappeared, re-adding...")
          currentMarkerRef.current.forEach(marker => {
            if (!view.graphics.includes(marker)) {
              view.graphics.add(marker)
            }
          })
        }
      }
    }

    // Listen for view updates that might cause markers to disappear
    const handles = [
      view.watch("zoom", handleViewUpdate),
      view.watch("center", handleViewUpdate),
      view.watch("camera", handleViewUpdate),
      view.watch("extent", handleViewUpdate)
    ]

    // Also check periodically
    const interval = setInterval(handleViewUpdate, 2000)

    return () => {
      handles.forEach(handle => handle?.remove?.())
      clearInterval(interval)
    }
  }, [view, enabled])

  // --- Suggestion select
  const selectSuggestion = async (sug) => {
    setSearchValue(sug?.name ?? "")
    setShowSearchSuggestions(false)
    setActiveIndex(-1)

    const coords = sug?.coordinates
    if (!coords || coords.length < 2) return
    const [lonRaw, latRaw] = coords
    const lon = Number(lonRaw)
    const lat = Number(latRaw)
    if (Number.isFinite(lon) && Number.isFinite(lat)) {
      await addMarkerOnGround(lon, lat, sug?.name)
    }
  }

  useEffect(() => {
    // print the active index
    console.log('Active index:', activeIndex);
  }, [activeIndex]);
  // --- Reset
const handleReset = () => {
  setSearchValue("")
  setSearchSuggestions([])
  setShowSearchSuggestions(false)
  setActiveIndex(-1)
  
  // Remove search markers
  if (view && view.graphics) {
    const searchMarkers = view.graphics.filter(g => 
      g.attributes?.type?.startsWith?.("search-marker")
    )
    searchMarkers.forEach(marker => view.graphics.remove(marker))
  }
  
  // Clear SAC search
  stopBlinkEffect();
  const layer = buildingLayerRef.current;
  if (layer) {
    layer.definitionExpression = null;
    layer.visible = false;
  }
  const propertyLayer = propertyOwnershipLayerRef.current;
if (propertyLayer) {
  propertyLayer.definitionExpression = null;
  propertyLayer.visible = false;

  // Also hide parent Development Plan layer
  const developmentPlanLayer = view.map.layers.items.find(layer => 
    layer.type === 'group' && layer.title === 'Development Plan'
  );
  if (developmentPlanLayer) {
    developmentPlanLayer.visible = false;
  }
}
  currentMarkerRef.current = null
}



  // Close dropdown if clicked outside input/suggestions
  useEffect(() => {
    const onDocClick = (e) => {
      if (!inputWrapperRef.current) return
      if (!inputWrapperRef.current.contains(e.target)) {
        setShowSearchSuggestions(false)
        setActiveIndex(-1)
      }
    }
    document.addEventListener("mousedown", onDocClick)
    return () => document.removeEventListener("mousedown", onDocClick)
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (view && view.graphics && currentMarkerRef.current) {
        const searchMarkers = view.graphics.filter(g => 
          g.attributes?.type?.startsWith?.("search-marker")
        )
        searchMarkers.forEach(marker => view.graphics.remove(marker))
      }
    }
  }, [view])

// Initialize building layer reference
useEffect(() => {
  if (!view || !view.map) return;
  
  buildingLayerRef.current = findBuildingLayer();
  propertyOwnershipLayerRef.current = findPropertyOwnershipLayer();

  
  return () => {
    stopBlinkEffect();
  };
}, [view]);

// Close custom dropdown on outside click
useEffect(() => {
  const handleClickOutside = (e) => {
    if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
      setIsDropdownOpen(false);
    }
  };
  document.addEventListener('mousedown', handleClickOutside);
  return () => document.removeEventListener('mousedown', handleClickOutside);
}, []);

  if (!isVisible || !enabled) return null

  return (
    <div ref={panelRef} style={position}>

      {/* Body */}
      <div
        ref={inputWrapperRef}
        style={{
         width : "100%",
          position: "relative",
          display: "flex",
          flexDirection: "column",
          gap: 6,
        }}
      >
        {/* Input row */}
       <div
  style={{
    display: "grid",
    gridTemplateColumns: "auto 1fr auto auto",
    gap: 8,
    alignItems: "center",
  }}
>
  {/* Mode Toggle Button */}
 {/* Mode Selector Dropdown */}
{/* Custom Mode Selector with Tooltip */}
<div 
  ref={dropdownRef}
  style={{ position: 'relative' }}
>
  <button
    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
    title={
      searchMode === 'location' ? 'Location Search' : 
      searchMode === 'sac' ? 'SAC Number Search' : 
      searchMode === 'cts' ? 'CTS CS No Search' :
      'Lat, Long Search'
    }
    style={{
      background: 'rgba(71, 139, 255, 0.15)',
      backdropFilter: 'blur(10px)',
      WebkitBackdropFilter: 'blur(10px)',
      color: '#478bff',
      border: '1px solid rgba(71, 139, 255, 0.3)',
      borderRadius: '10px',
      padding: '6px 10px',
      fontSize: 16,
      cursor: 'pointer',
      fontWeight: '600',
      outline: 'none',
      minWidth: '42px',
      boxShadow: '0 4px 6px rgba(71, 139, 255, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.2)',
      transition: 'all 0.2s ease',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    }}
  >
    {searchMode === 'location' ? <FaSearchLocation/> : 
     searchMode === 'sac' ? <LuBuilding/> : 
     searchMode === 'cts' ? <FaRegNewspaper /> :
     <TbMapPinSearch />}
  </button>

  {isDropdownOpen && (
    <div
      style={{
        position: 'absolute',
        top: 'calc(100% + 4px)',
        left: 0,
        background: 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        border: '1px solid rgba(71, 139, 255, 0.2)',
        borderRadius: '10px',
        boxShadow: '0 8px 20px rgba(0, 0, 0, 0.15)',
        zIndex: 1001,
        overflow: 'hidden',
      }}
    >
      {[
        { mode: 'location', icon: <FaSearchLocation/>, label: 'Location' },
        { mode: 'latlong', icon: <TbMapPinSearch />, label: 'Lat, Long' },
        { mode: 'sac', icon: <LuBuilding/> , label: 'SAC Number' },
        { mode: 'cts', icon: <FaRegNewspaper />, label: 'CTS CS No' }
      ].map(item => (
        <div
          key={item.mode}
          onClick={() => {
            setSearchMode(item.mode);
            setSearchValue("");
            setSearchSuggestions([]);
            setShowSearchSuggestions(false);
            handleReset();
            setIsDropdownOpen(false);
          }}
          style={{
            padding: '10px 16px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            fontSize: '14px',
            fontWeight: searchMode === item.mode ? '600' : '400',
            color: searchMode === item.mode ? '#478bff' : '#111827',
            background: searchMode === item.mode ? 'rgba(71, 139, 255, 0.1)' : 'transparent',
            transition: 'all 0.2s ease',
            whiteSpace: 'nowrap',
          }}
          onMouseEnter={(e) => {
            e.target.style.background = 'rgba(71, 139, 255, 0.15)';
            e.target.style.color = '#478bff';
          }}
          onMouseLeave={(e) => {
            if (searchMode !== item.mode) {
              e.target.style.background = 'transparent';
              e.target.style.color = '#111827';
            } else {
              e.target.style.background = 'rgba(71, 139, 255, 0.1)';
              e.target.style.color = '#478bff';
            }
          }}
        >
          <span style={{ fontSize: '16px' }}>{item.icon}</span>
          <span>{item.label}</span>
        </div>
      ))}
    </div>
  )}
</div>

  <div style={{ position: "relative" }}>
    <input
      ref={inputRef}
      type="text"
      value={searchValue}
      onChange={(e) => {
        const val = e.target.value
        setSearchValue(val)
        if (searchMode === 'location') {
          debouncedSearch(val)
        }
      }}
      onKeyDown={(e) => {
  if (searchMode === 'sac' || searchMode === 'cts' || searchMode === 'latlong') {
    // SAC/CTS/LatLong mode - Enter key triggers search
    if (e.key === "Enter" && searchValue.trim() && !isSearching) {
      if (searchMode === 'sac') {
        searchBySAC(searchValue)
      } else if (searchMode === 'cts') {
        searchByCTS(searchValue)
      } else if (searchMode === 'latlong') {
        searchByLatLong(searchValue)
      }
    } else if (e.key === "Escape") {
      handleReset()
    }
  } else {
    // Location mode - existing keyboard handling
    if (showSearchSuggestions && searchSuggestions.length) {
      if (e.key === "ArrowDown") {
        e.preventDefault()
        setActiveIndex((i) => (i + 1) % searchSuggestions.length)
      } else if (e.key === "ArrowUp") {
        e.preventDefault()
        setActiveIndex((i) => (i <= 0 ? searchSuggestions.length - 1 : (i - 1) % searchSuggestions.length))
      } else if (e.key === "Enter") {
        if (activeIndex >= 0 && activeIndex < searchSuggestions.length) {
          selectSuggestion(searchSuggestions[activeIndex])
        } else if (searchValue.trim()) {
          searchPlaces(searchValue)
        }
      } else if (e.key === "Escape") {
        setShowSearchSuggestions(false)
        setActiveIndex(-1)
      }
    } else if (e.key === "Enter" && searchValue.trim()) {
      searchPlaces(searchValue)
    }
  }
}}
placeholder={
  searchMode === 'location' ? "Search location..." : 
  searchMode === 'sac' ? "Search by SAC number..." : 
  searchMode === 'cts' ? "Search by CTS CS No..." :
  "e.g., 19.0760, 72.8777"
}
      aria-label={
        searchMode === 'location' ? "Search location" : 
        searchMode === 'sac' ? "Search by SAC number" :
        searchMode === 'cts' ? "Search by CTS CS No" :
        "Search by Lat, Long"
      }
      disabled={isSearching}
      style={{
        width: "100%",
        padding: "6px 36px 6px 12px",
        border: "1px solid #d1d5db",
        borderRadius: "10px",
        fontSize: 14,
        backgroundColor: isSearching ? '#f9fafb' : "#fff",
        outline: "none",
        boxShadow: "0 1px 2px rgba(0,0,0,0.06) inset",
        cursor: isSearching ? 'not-allowed' : 'text',
      }}
      onFocus={() => {
        if (searchMode === 'location' && searchValue.trim().length >= 3) {
          searchPlaces(searchValue)
        }
      }}
    />

    {/* Right icon inside input */}
    <button
     onClick={() => {
  if (searchMode === 'location') {
    searchValue.trim() && searchPlaces(searchValue)
  } else if (searchMode === 'sac') {
    searchValue.trim() && searchBySAC(searchValue)
  } else if (searchMode === 'cts') {
    searchValue.trim() && searchByCTS(searchValue)
  } else if (searchMode === 'latlong') {
    searchValue.trim() && searchByLatLong(searchValue)
  }
}}
      disabled={isLoading || isSearching}
      title="Search"
      style={{
        position: "absolute",
        right: 8,
        top: "50%",
        transform: "translateY(-50%)",
        background: "transparent",
        border: "none",
        cursor: (isLoading || isSearching) ? "not-allowed" : "pointer",
        fontSize: 16,
        padding: 0,
        opacity: (isLoading || isSearching) ? 0.6 : 1,
      }}
    >
      {(isLoading || isSearching) ? "…" : searchMode === 'location' ? <IoSearchOutline /> : <IoNavigateCircle />}
    </button>
  </div>

    {(searchValue !== "" || 
    currentMarkerRef.current !== null || 
    blinkIntervalRef.current !== null ||
    (buildingLayerRef.current && buildingLayerRef.current.definitionExpression) ||
    (propertyOwnershipLayerRef.current && propertyOwnershipLayerRef.current.definitionExpression)) &&  (
  <>
    {(searchMode === 'sac' || searchMode === 'cts') && (
      <button
        onClick={stopBlinkEffect}
        title="Stop Highlight"
        disabled={isSearching}
        style={{
          background: "#2b5db1",
          color: "#fff",
          border: "1px solid #e5e7eb",
          borderRadius: "10px",
          padding: "6px 10px",
          fontSize: 14,
          cursor: isSearching ? 'not-allowed' : "pointer",
          opacity: isSearching ? 0.6 : 1,
          fontWeight: 600,
        }}
      >
        Stop
      </button>
    )}
    
    <button
      onClick={handleReset}
      title="Reset"
      disabled={isSearching}
      style={{
        background: "#478bff",
        color: "#fff",
        border: "1px solid #e5e7eb",
        borderRadius: "10px",
        padding: "6px 10px",
        fontSize: 14,
        cursor: isSearching ? 'not-allowed' : "pointer",
        opacity: isSearching ? 0.6 : 1,
      }}
    >
      Reset
    </button>
  </>
)}
</div>

        {/* Suggestions dropdown */}
       {searchMode === 'location' && showSearchSuggestions && (
          <div
            role="listbox"
            style={{
              position: "absolute",
              top: "calc(100% + 6px)",
              left: 0,
              right: 0,
              backgroundColor: "white",
              border: "1px solid #e5e7eb",
              borderRadius: "10px",
              padding: "6px 0",
              maxHeight: 280,
              overflowY: "auto",
              zIndex: 1000,
              boxShadow: "0 8px 20px rgba(0,0,0,0.14)",
            }}
            onMouseDown={(e) => e.preventDefault()}
          >
            {isLoading ? (
              <div style={{ padding: "12px", textAlign: "center", color: "#6b7280" }}>Searching…</div>
            ) : searchSuggestions.length > 0 ? (
              searchSuggestions.map((sug, idx) => {
                const isActive = idx === activeIndex
                return (
                  <div
                    role="option"
                    aria-selected={isActive}
                    key={sug.id}
                    onClick={() => selectSuggestion(sug)}
                    onMouseEnter={() => setActiveIndex(idx)}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr auto",
                      alignItems: "center",
                      gap: 8,
                      padding: "10px 12px",
                      cursor: "pointer",
                      backgroundColor: isActive ? "#f1f5f9" : "transparent",
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 14, color: "#111827" }}>{sug.name}</div>
                      <div style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>
                        { sug.label}
                      </div>
                    </div>
                  </div>
                )
              })
            ) : (
              <div style={{ padding: "12px", textAlign: "center", color: "#6b7280" }}>No results found</div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default SearchLocationTool
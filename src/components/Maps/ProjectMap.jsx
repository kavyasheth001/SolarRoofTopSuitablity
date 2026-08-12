// ProjectMap.jsx
import { useEffect, useRef, useState } from 'react';
import { toast } from 'react-toastify';

// ArcGIS core modules
import GraphicsLayer from '@arcgis/core/layers/GraphicsLayer';
import Graphic from '@arcgis/core/Graphic';
import * as geometryEngine from '@arcgis/core/geometry/geometryEngine';
import * as locator from '@arcgis/core/rest/locator';

// ArcGIS widgets
import SketchViewModel from '@arcgis/core/widgets/Sketch/SketchViewModel';
import Search from '@arcgis/core/widgets/Search';
import Expand from '@arcgis/core/widgets/Expand';
import Locate from '@arcgis/core/widgets/Locate';
import Home from '@arcgis/core/widgets/Home';
import Compass from '@arcgis/core/widgets/Compass';
import ScaleBar from '@arcgis/core/widgets/ScaleBar';
import Fullscreen from '@arcgis/core/widgets/Fullscreen.js';

// ArcGIS CSS
import '@arcgis/core/assets/esri/themes/light/main.css';

import * as mapManager from '../../utils/mapManager';
import GotoLocationProject from '../../components/Tools/GotoLocationProject';
import axios from 'axios';
import SearchLocationTool from '../Tools/SearchLocationTool';
import RealityModelToggle from '../Tools/RealityModelToggle';
import LoDModelToggle from '../Tools/LoDModelToggle';

const ProjectMap = ({
  projectGeometry,
  canEdit,
  onGeometryChange,
  onLocationChange,
  setMapView,
}) => {
  const mapRef = useRef();
  const viewRef = useRef();
  const sketchRef = useRef();
  const searchWidgetRef = useRef();
  const locateWidgetRef = useRef();
  const clippedPolygonRef = useRef(null);
  // Track every layer and widget this component adds so we can clean up properly
  const addedLayersRef = useRef([]);
  const addedWidgetsRef = useRef([]);

  const [polygonGraphic, setPolygonGraphic] = useState(null);
  const [locationName, setLocationName] = useState('');

  // Utility function for coordinate conversion
  const wmToDD = (x, y) => {
    const earthRadius = 6378137.0;
    const lon = x !== 0 ? (x / earthRadius) * (180 / Math.PI) : 0;
    let lat = 0;
    if (y !== 0) {
      lat = (y / earthRadius) * (180 / Math.PI);
      lat =
        (180 / Math.PI) *
        (2 * Math.atan(Math.exp((lat * Math.PI) / 180)) - Math.PI / 2);
    }
    return { lon, lat };
  };

  const queryZoneAndPrabhag = async (geometry) => {
    if (!viewRef.current || !geometry) return;

    try {
      const view = viewRef.current;
      const map = view.map;

      let zoneValue = '';
      let prabhagValue = '';

      // Find Zone Boundary layer
      const zoneLayers = [];
      map.allLayers.forEach((layer) => {
        if (
          layer.title &&
          layer.title.toLowerCase().includes('zone') &&
          layer.title.toLowerCase().includes('boundary')
        ) {
          zoneLayers.push(layer);
        }
      });

      // Find Prabhag Election Boundary layer
      const prabhagLayers = [];
      map.allLayers.forEach((layer) => {
        if (
          layer.title &&
          layer.title.toLowerCase().includes('prabhag') &&
          layer.title &&
          layer.title.toLowerCase().includes('election') &&
          layer.title.toLowerCase().includes('boundary')
        ) {
          prabhagLayers.push(layer);
        }
      });

      // Query Zone
      for (const layer of zoneLayers) {
        try {
          if (layer.capabilities && layer.capabilities.query !== false) {
            const query = layer.createQuery
              ? layer.createQuery()
              : {
                geometry: geometry,
                spatialRelationship: 'intersects',
                returnGeometry: false,
                outFields: ['*'],
                where: '1=1',
              };

            query.geometry = geometry;
            query.spatialRelationship = 'intersects';
            query.returnGeometry = false;
            query.outFields = ['*'];

            const result = await layer.queryFeatures(query);

            if (result && result.features && result.features.length > 0) {
              const feature = result.features[0];
              zoneValue = feature.attributes.zone_number || 'Zone Found';
              break;
            }
          }
        } catch (error) {
          console.warn(`Error querying zone layer ${layer.title}:`, error);
        }
      }

      // Query Prabhag
      for (const layer of prabhagLayers) {
        try {
          if (layer.capabilities && layer.capabilities.query !== false) {
            const query = layer.createQuery
              ? layer.createQuery()
              : {
                geometry: geometry,
                spatialRelationship: 'intersects',
                returnGeometry: false,
                outFields: ['*'],
                where: '1=1',
              };

            query.geometry = geometry;
            query.spatialRelationship = 'intersects';
            query.returnGeometry = false;
            query.outFields = ['*'];

            const result = await layer.queryFeatures(query);

            if (result && result.features && result.features.length > 0) {
              const feature = result.features[0];
              prabhagValue =
                feature.attributes.PRABHAG ||
                feature.attributes.Prabhag ||
                feature.attributes.prabhag_name ||
                feature.attributes.PRABHAG_NAME ||
                feature.attributes.name ||
                feature.attributes.NAME ||
                'Prabhag Found';
              break;
            }
          }
        } catch (error) {
          console.warn(`Error querying prabhag layer ${layer.title}:`, error);
        }
      }

      if (zoneValue || prabhagValue) {
        toast.success(
          `Zone: ${zoneValue || 'Not found'}, Prabhag: ${prabhagValue || 'Not found'}`,
        );
      }
    } catch (error) {
      console.error('Error querying zone and prabhag:', error);
      toast.error('Failed to fetch zone and prabhag information');
    }
  };

  // Reverse geocoding function to get location name
  const getLocationName = async (longitude, latitude) => {
    try {
      const response = await locator.locationToAddress(
        'https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer',
        {
          location: {
            x: longitude,
            y: latitude,
            spatialReference: { wkid: 4326 },
          },
        },
      );

      if (response && response.address) {
        const addressParts = [];
        if (response.attributes.Subregion)
          addressParts.push(response.attributes.Subregion);
        if (response.attributes.Region)
          addressParts.push(response.attributes.Region);
        if (response.attributes.CountryCode)
          addressParts.push(response.attributes.CountryCode);

        const locationString =
          addressParts.length > 0 ? addressParts.join(', ') : response.address;
        setLocationName(locationString);
        return locationString;
      }
    } catch (error) {
      console.error('Error getting location name:', error);
      const fallbackName = `${latitude.toFixed(6)}°N, ${longitude.toFixed(6)}°E`;
      setLocationName(fallbackName);
      return fallbackName;
    }
  };

  // Helper function to calculate polygon centroid
  const calculatePolygonCentroid = (rings) => {
    const ring = rings[0];
    let sumX = 0;
    let sumY = 0;

    for (let i = 0; i < ring.length - 1; i++) {
      sumX += ring[i][0];
      sumY += ring[i][1];
    }

    return {
      x: sumX / (ring.length - 1),
      y: sumY / (ring.length - 1),
    };
  };

  // Function to initialize locate widget
  const initializeLocateWidget = (view) => {
    if (!view || locateWidgetRef.current) return;

    const locateWidget = new Locate({
      view: view,
      useHeadingEnabled: false,
      goToOverride: (view, options) => {
        options.target.scale = 1500;
        return view.goTo(options.target);
      },
    });

    locateWidget.on('locate', async (event) => {
      const coords = event.position.coords;

      if (onLocationChange) {
        onLocationChange({
          latitude: coords.latitude,
          longitude: coords.longitude,
        });
      }

      await getLocationName(coords.longitude, coords.latitude);
      toast.success('Located your position!');
    });

    locateWidgetRef.current = locateWidget;
    view.ui.add(locateWidget, { position: 'top-left', index: 1 });
  };

  // Function to initialize other widgets
  const initializeMapWidgets = (view) => {
    if (!view) return;

    const homeWidget = new Home({ view: view });
    view.ui.add(homeWidget, { position: 'top-left', index: 0 });

    const compass = new Compass({ view: view });
    view.ui.add(compass, { position: 'top-left', index: 2 });

    const scaleBar = new ScaleBar({ view: view, unit: 'metric' });
    view.ui.add(scaleBar, { position: 'bottom-left' });

    const fullscreenWidget = new Fullscreen({
      view: view
    });
    view.ui.add(fullscreenWidget, 'top-left');
  };

  // Load project geometry
  const loadProjectGeometry = async () => {
    const token = localStorage.getItem('token');

    if (!projectGeometry || !sketchRef.current || !viewRef.current) {
      return;
    }

    try {
      const sketch = sketchRef.current;
      const view = viewRef.current;

      // Clear existing graphics
      sketch.layer.removeAll();
      setPolygonGraphic(null);
      clippedPolygonRef.current = null;

      let geometry;

      // Check if the geometry is in WKB format
      if (
        typeof projectGeometry === 'string' &&
        /^[0-9A-Fa-f]+$/i.test(projectGeometry)
      ) {
        try {
          const response = await axios.post(
            `${import.meta.env.VITE_BASE_URL}/api/projectss/wkb-to-geojson`,
            { wkb: projectGeometry },
            { headers: { Authorization: token } },
          );

          if (response.data && response.data.geojson) {
            geometry = response.data.geojson;
          } else {
            throw new Error('Failed to convert WKB to GeoJSON');
          }
        } catch (wkbConversionError) {
          console.error('Error converting WKB to GeoJSON:', wkbConversionError);
          toast.error('Failed to convert project geometry from WKB format');
          return;
        }
      } else {
        if (typeof projectGeometry === 'string') {
          try {
            geometry = JSON.parse(projectGeometry);
          } catch (parseError) {
            console.error('Failed to parse geometry JSON:', parseError);
            toast.error('Invalid geometry format in project data');
            return;
          }
        } else {
          geometry = projectGeometry;
        }
      }

      // Handle ArcGIS JSON format conversion
      if (geometry && geometry.rings && Array.isArray(geometry.rings)) {
        geometry = {
          type: 'Polygon',
          coordinates: geometry.rings,
        };
      } else if (geometry && geometry.paths && Array.isArray(geometry.paths)) {
        geometry = {
          type: 'LineString',
          coordinates: geometry.paths[0],
        };
      } else if (
        geometry &&
        geometry.x !== undefined &&
        geometry.y !== undefined
      ) {
        geometry = {
          type: 'Point',
          coordinates: [geometry.x, geometry.y],
        };
      }

      // Validate GeoJSON structure
      if (
        !geometry ||
        !['Polygon', 'LineString', 'Point'].includes(geometry.type) ||
        !geometry.coordinates ||
        !Array.isArray(geometry.coordinates) ||
        geometry.coordinates.length === 0
      ) {
        console.error('Invalid GeoJSON format:', geometry);
        toast.error('Invalid project geometry format');
        return;
      }

      // Handle coordinate conversion
      let firstCoord;
      if (geometry.type === 'Point') {
        firstCoord = geometry.coordinates;
      } else if (geometry.type === 'LineString') {
        firstCoord = geometry.coordinates[0];
      } else if (geometry.type === 'Polygon') {
        firstCoord = geometry.coordinates[0][0];
      }

      let finalCoordinates = geometry.coordinates;

      if (
        Math.abs(firstCoord[0]) > 20000000 ||
        Math.abs(firstCoord[1]) > 20000000 ||
        Math.abs(firstCoord[0]) > 180 ||
        Math.abs(firstCoord[1]) > 90
      ) {
        if (geometry.type === 'Point') {
          const converted = wmToDD(
            geometry.coordinates[0],
            geometry.coordinates[1],
          );
          finalCoordinates = [converted.lon, converted.lat];
        } else if (geometry.type === 'LineString') {
          finalCoordinates = geometry.coordinates.map((coord) => {
            const converted = wmToDD(coord[0], coord[1]);
            return [converted.lon, converted.lat];
          });
        } else if (geometry.type === 'Polygon') {
          finalCoordinates = geometry.coordinates.map((ring) =>
            ring.map((coord) => {
              const converted = wmToDD(coord[0], coord[1]);
              return [converted.lon, converted.lat];
            }),
          );
        }
      }

      // Create the appropriate geometry and graphic
      let displayGeometry;
      let displaySymbol;
      let centroid;

      if (geometry.type === 'Point') {
        displayGeometry = {
          type: 'point',
          x: finalCoordinates[0],
          y: finalCoordinates[1],
          spatialReference: { wkid: 4326 },
        };
        displaySymbol = {
          type: 'simple-marker',
          color: 'red',
          size: 8,
          outline: { color: [0, 0, 255], width: 1 },
        };
        centroid = { x: finalCoordinates[0], y: finalCoordinates[1] };
      } else if (geometry.type === 'LineString') {
        displayGeometry = {
          type: 'polyline',
          paths: [finalCoordinates],
          spatialReference: { wkid: 4326 },
        };
        displaySymbol = {
          type: 'simple-line',
          color: 'blue',
          width: 3,
        };
        const midIndex = Math.floor(finalCoordinates.length / 2);
        centroid = {
          x: finalCoordinates[midIndex][0],
          y: finalCoordinates[midIndex][1],
        };
      } else if (geometry.type === 'Polygon') {
        displayGeometry = {
          type: 'polygon',
          rings: finalCoordinates,
          spatialReference: { wkid: 4326 },
        };
        displaySymbol = {
          type: 'simple-fill',
          color: [0, 0, 0, 0],
          outline: { color: [0, 0, 255, 1], width: 3 },
        };
        centroid = calculatePolygonCentroid(finalCoordinates);
      }

      const graphic = new Graphic({
        geometry: displayGeometry,
        symbol: displaySymbol,
      });

      sketch.layer.add(graphic);
      setPolygonGraphic(graphic);

      // Prepare geometry for analysis
      let analysisGeometry;
      if (
        view.spatialReference.wkid === 3857 ||
        view.spatialReference.wkid === 102100
      ) {
        if (geometry.type === 'Point') {
          const lon = finalCoordinates[0];
          const lat = finalCoordinates[1];
          const x = (lon * 20037508.34) / 180;
          let y =
            Math.log(Math.tan(((90 + lat) * Math.PI) / 360)) / (Math.PI / 180);
          y = (y * 20037508.34) / 180;
          analysisGeometry = {
            type: 'point',
            x,
            y,
            spatialReference: view.spatialReference,
          };
        } else if (geometry.type === 'LineString') {
          const webMercatorPath = finalCoordinates.map((coord) => {
            const lon = coord[0];
            const lat = coord[1];
            const x = (lon * 20037508.34) / 180;
            let y =
              Math.log(Math.tan(((90 + lat) * Math.PI) / 360)) /
              (Math.PI / 180);
            y = (y * 20037508.34) / 180;
            return [x, y];
          });
          analysisGeometry = {
            type: 'polyline',
            paths: [webMercatorPath],
            spatialReference: view.spatialReference,
          };
        } else if (geometry.type === 'Polygon') {
          const webMercatorRings = finalCoordinates.map((ring) =>
            ring.map((coord) => {
              const lon = coord[0];
              const lat = coord[1];
              const x = (lon * 20037508.34) / 180;
              let y =
                Math.log(Math.tan(((90 + lat) * Math.PI) / 360)) /
                (Math.PI / 180);
              y = (y * 20037508.34) / 180;
              return [x, y];
            }),
          );
          analysisGeometry = {
            type: 'polygon',
            rings: webMercatorRings,
            spatialReference: view.spatialReference,
          };
        }
      } else {
        analysisGeometry = displayGeometry;
      }

      clippedPolygonRef.current = analysisGeometry;
      await queryZoneAndPrabhag(analysisGeometry);

      let zoomTarget;
      if (geometry.type === 'Point') {
        zoomTarget = {
          target: graphic.geometry,
          zoom: 15,
          duration: 1500,
        };
      } else {
        zoomTarget = {
          target: graphic.geometry.extent.expand(1.5),
          duration: 1500,
        };
      }

      await view.goTo(zoomTarget);

      if (centroid && onLocationChange) {
        onLocationChange({
          latitude: centroid.y,
          longitude: centroid.x,
        });
        await getLocationName(centroid.x, centroid.y);
      }

      toast.success('Project area loaded successfully!');
    } catch (error) {
      // Ignore aborted errors — these happen when navigating away mid-load
      // and the view gets destroyed, cancelling the goTo() call
      if (
        error?.name === 'AbortError' ||
        error?.message?.toLowerCase().includes('aborted') ||
        error?.message?.toLowerCase().includes('view has been destroyed') ||
        !viewRef.current ||
        viewRef.current.destroyed
      ) {
        console.log('loadProjectGeometry aborted (navigation away)');
        return;
      }
      console.error('Error loading project geometry:', error);
      toast.error('Failed to load project geometry: ' + error.message);
    }
  };

  // Initialize map — attach singleton and add ProjectMap-specific layers/widgets
  useEffect(() => {
    if (!mapRef.current) return;

    const setup = async () => {
      await mapManager.attachTo(mapRef.current);
      const view = mapManager.getView();
      if (!view) return;

      viewRef.current = view;
      if (setMapView) setMapView(view);

      // ── Add sketch GraphicsLayer ──────────────────────────────────────
      const layer = new GraphicsLayer();
      view.map.add(layer);
      addedLayersRef.current.push(layer);

      const sketch = new SketchViewModel({
        view,
        layer,
        creationMode: 'update',
        updateOnGraphicClick: false,
        defaultCreateOptions: { hasZ: false, defaultZ: 0 },
        defaultUpdateOptions: {
          enableRotation: false,
          enableScaling: false,
          multipleSelectionEnabled: false,
          toggleToolOnClick: false,
        },
      });
      sketchRef.current = sketch;

      sketch.on('create', async (event) => {
        if (event.state !== 'complete') return;
        if (!canEdit) {
          layer.removeAll();
          toast.error('You do not have permission to modify this project area');
          return;
        }
        layer.removeAll();

        let symbol;
        const geom = event.graphic.geometry;
        switch (geom.type) {
          case 'point':    symbol = { type: 'simple-marker', color: 'red',  size: 8 }; break;
          case 'polyline': symbol = { type: 'simple-line',   color: 'blue', width: 3 }; break;
          case 'polygon':  symbol = { type: 'simple-fill', color: [0,0,0,0], outline: { color: [0,0,255,1], width: 3 } }; break;
          default:         symbol = {};
        }

        const newGraphic = new Graphic({ geometry: geom, symbol });
        layer.add(newGraphic);
        setPolygonGraphic(newGraphic);
        clippedPolygonRef.current = geom;

        const centroid = geom.centroid || (geom.type === 'point' ? geom : null);
        const lengthM  = geom.type === 'polyline'  ? geometryEngine.geodesicLength(geom, 'meters')       : 0;
        const areaM2   = geom.type === 'polygon'   ? geometryEngine.geodesicArea(geom, 'square-meters')  : 0;

        let geoJSONGeometry = null;
        if (geom.type === 'polygon' && geom.rings?.length > 0) {
          geoJSONGeometry = { type: 'Polygon',    coordinates: geom.rings.map(ring => ring.map(c => wmToDD(c[0], c[1])).map(c => [c.lon, c.lat])) };
        } else if (geom.type === 'polyline' && geom.paths?.length > 0) {
          geoJSONGeometry = { type: 'LineString', coordinates: geom.paths[0].map(c => { const d = wmToDD(c[0], c[1]); return [d.lon, d.lat]; }) };
        } else if (geom.type === 'point') {
          const d = (Math.abs(geom.x) > 180 || Math.abs(geom.y) > 90) ? wmToDD(geom.x, geom.y) : { lon: geom.x, lat: geom.y };
          geoJSONGeometry = { type: 'Point', coordinates: [d.lon, d.lat] };
        }

        if (centroid) await getLocationName(centroid.x, centroid.y);
        if (onGeometryChange) {
          onGeometryChange({
            latitude:      centroid ? centroid.y : null,
            longitude:     centroid ? centroid.x : null,
            shape__length: +lengthM.toFixed(2),
            shape__area:   +areaM2.toFixed(2),
            geometry:      geoJSONGeometry ? JSON.stringify(geoJSONGeometry) : null,
          });
        }
        await queryZoneAndPrabhag(geom);
        toast.success('Project area drawn successfully!');
      });

      // ── Add standard map widgets ──────────────────────────────────────
      const homeWidget = new Home({ view });
      view.ui.add(homeWidget, { position: 'top-left', index: 0 });
      addedWidgetsRef.current.push(homeWidget);

      const locateWidget = new Locate({
        view,
        useHeadingEnabled: false,
        goToOverride: (v, options) => { options.target.scale = 1500; return v.goTo(options.target); },
      });
      locateWidget.on('locate', async (event) => {
        const coords = event.position.coords;
        if (onLocationChange) onLocationChange({ latitude: coords.latitude, longitude: coords.longitude });
        await getLocationName(coords.longitude, coords.latitude);
        toast.success('Located your position!');
      });
      locateWidgetRef.current = locateWidget;
      view.ui.add(locateWidget, { position: 'top-left', index: 1 });
      addedWidgetsRef.current.push(locateWidget);

      const compass = new Compass({ view });
      view.ui.add(compass, { position: 'top-left', index: 2 });
      addedWidgetsRef.current.push(compass);

      const scaleBar = new ScaleBar({ view, unit: 'metric' });
      view.ui.add(scaleBar, { position: 'bottom-left' });
      addedWidgetsRef.current.push(scaleBar);

      const fullscreenWidget = new Fullscreen({ view });
      view.ui.add(fullscreenWidget, 'top-left');
      addedWidgetsRef.current.push(fullscreenWidget);

      // ── Load existing geometry ────────────────────────────────────────
      if (projectGeometry) {
        setTimeout(() => loadProjectGeometry(), 1000);
      }
    };

    setup().catch((err) => {
      console.error('[ProjectMap] setup error:', err);
      toast.error('Failed to initialize map');
    });

    // Cleanup — remove everything this component added; DO NOT destroy the view
    return () => {
      const view = viewRef.current;

      // Destroy sketch
      if (sketchRef.current) {
        sketchRef.current.destroy();
        sketchRef.current = null;
      }

      // Remove widgets
      if (view) {
        addedWidgetsRef.current.forEach((w) => {
          try { view.ui.remove(w); w.destroy(); } catch (_) {}
        });
      }
      addedWidgetsRef.current = [];

      // Remove layers
      if (view) {
        addedLayersRef.current.forEach((l) => {
          try { view.map.remove(l); } catch (_) {}
        });
      }
      addedLayersRef.current = [];

      viewRef.current = null;
      locateWidgetRef.current = null;

      // Detach the singleton view — keeps it alive for next consumer
      mapManager.detach();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps


  // Load geometry when projectGeometry changes
  useEffect(() => {
    if (projectGeometry && viewRef.current && sketchRef.current) {
      setTimeout(() => {
        loadProjectGeometry();
      }, 500);
    }
  }, [projectGeometry]);

  return (
    <div className="rounded-xl bg-white p-2 shadow-lg lg:col-span-2">
      <div className="relative">
        <div
          ref={mapRef}
          className="h-[500px] w-full rounded-lg border-2 border-gray-200 shadow-inner"
          style={{ position: 'relative' }}
        />
        <SearchLocationTool
          view={viewRef.current}
          WidgetPosition={{ top: '12px', right: '0px' }}
        />
        <RealityModelToggle
          view={viewRef.current}
          position={{ top: '13px', left: '60px' }}
        />
        <LoDModelToggle
          view={viewRef.current}
          position={{ top: '13px', left: '107px' }}
        />
        <GotoLocationProject />
      </div>
    </div>
  );
};

export default ProjectMap;

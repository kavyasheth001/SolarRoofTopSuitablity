import { useEffect, useRef, useState } from 'react';
import FeatureLayer from '@arcgis/core/layers/FeatureLayer';
import GraphicsLayer from '@arcgis/core/layers/GraphicsLayer';
import Graphic from '@arcgis/core/Graphic';
import { useSelector } from 'react-redux';
import { MdLayers, MdBusiness, MdImage, MdLocationCity } from 'react-icons/md';

import * as mapManager from '../../utils/mapManager';

import '@arcgis/core/assets/esri/themes/light/main.css';

export default function AssessmentMap({ setMapView, externalBuilding }) {
  const mapDivRef = useRef(null);
  const viewRef = useRef(null);
  const graphicsLayerRef = useRef(null);
  const featureLayerRef = useRef(null);
  // Track widgets added to view.ui for cleanup
  const addedWidgetsRef = useRef([]);

  const [isMeshVisible, setIsMeshVisible] = useState(true);
  const [isOrthoVisible, setIsOrthoVisible] = useState(true);
  const [isLodVisible, setIsLodVisible] = useState(true);
  const [isBuildingVisible, setIsBuildingVisible] = useState(true);

  const selectedBuilding = useSelector((s) => s.assessment.selectedBuilding);
  const filters = useSelector((s) => s.assessment.filters);
  const buildings = useSelector((s) => s.assessment.buildings);

  // Initialize map — attach singleton and add AssessmentMap-specific layers
  useEffect(() => {
    if (!mapDivRef.current) return;

    const setup = async () => {
      await mapManager.attachTo(mapDivRef.current);
      const view = mapManager.getView();
      if (!view) return;

      viewRef.current = view;
      if (setMapView) setMapView(view);

      // ── Add widgets ─────────────────────────────────────────────
      const { default: Home }       = await import('@arcgis/core/widgets/Home');
      const { default: Locate }     = await import('@arcgis/core/widgets/Locate');
      const { default: Compass }    = await import('@arcgis/core/widgets/Compass');
      const { default: ScaleBar }   = await import('@arcgis/core/widgets/ScaleBar');
      const { default: Fullscreen } = await import('@arcgis/core/widgets/Fullscreen');

      const home = new Home({ view });
      view.ui.add(home, { position: 'top-left', index: 0 });
      addedWidgetsRef.current.push(home);

      const locate = new Locate({ view });
      view.ui.add(locate, { position: 'top-left', index: 1 });
      addedWidgetsRef.current.push(locate);

      const compass = new Compass({ view });
      view.ui.add(compass, { position: 'top-left', index: 2 });
      addedWidgetsRef.current.push(compass);

      const fullscreen = new Fullscreen({ view });
      view.ui.add(fullscreen, 'top-left');
      addedWidgetsRef.current.push(fullscreen);

      const scaleBar = new ScaleBar({ view, unit: 'metric' });
      view.ui.add(scaleBar, 'bottom-left');
      addedWidgetsRef.current.push(scaleBar);

      // ── Add Building FeatureLayer ───────────────────────────────────
      const buildingLayer = new FeatureLayer({
        url: 'https://bmc3dmumbai.com/server/rest/services/Hosted/Updated_20260415_V2_WFL1/FeatureServer/5',
        title: 'Buildings',
        outFields: ['*'],
        popupEnabled: true,
      });

      buildingLayer.load().then(() => {
        buildingLayer.popupTemplate = buildingLayer.createPopupTemplate();
      });

      view.map.add(buildingLayer);
      featureLayerRef.current = buildingLayer;

      // ── Add Graphics layer for selection pins ─────────────────────────
      const gLayer = new GraphicsLayer();
      view.map.add(gLayer);
      graphicsLayerRef.current = gLayer;

      view.when(() => {
        const meshLayer   = view.map.layers.find((l) => l.title === 'Reality Model');
        const orthoLayer  = view.map.layers.find((l) => l.title === 'Imagery');
        const lodLayer    = view.map.layers.find((l) => l.title && l.title.toLowerCase().includes('lod'));
        if (meshLayer)  setIsMeshVisible(meshLayer.visible);
        if (orthoLayer) setIsOrthoVisible(orthoLayer.visible);
        if (lodLayer)   setIsLodVisible(lodLayer.visible);
      });
    };

    setup().catch((err) => console.error('[AssessmentMap] setup error:', err));

    // Cleanup — remove layers/widgets; DO NOT destroy the singleton view
    return () => {
      const view = viewRef.current;

      if (view) {
        // Remove widgets
        addedWidgetsRef.current.forEach((w) => {
          try { view.ui.remove(w); w.destroy(); } catch (_) {}
        });

        // Remove layers
        if (featureLayerRef.current) {
          try { view.map.remove(featureLayerRef.current); } catch (_) {}
        }
        if (graphicsLayerRef.current) {
          try { view.map.remove(graphicsLayerRef.current); } catch (_) {}
        }
      }

      addedWidgetsRef.current = [];
      featureLayerRef.current = null;
      graphicsLayerRef.current = null;
      viewRef.current = null;

      mapManager.detach();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Toggle Layers
  const toggleLayer = (title, setState, isContains = false) => {
    if (!viewRef.current) return;
    let found = false;
    let visibility = false;

    viewRef.current.map.layers.forEach((layer) => {
      if (layer.title) {
        const match = isContains 
          ? layer.title.toLowerCase().includes(title.toLowerCase())
          : layer.title === title;
        
        if (match) {
          layer.visible = !layer.visible;
          found = true;
          visibility = layer.visible;
        }
      }
    });

    if (found) {
      setState(visibility);
    }
  };

  // Apply Filters to FeatureLayer
  useEffect(() => {
    if (!featureLayerRef.current) return;

    const conditions = ['1=1'];
    if (filters.ward)          conditions.push(`UPPER(ward_name) = UPPER('${filters.ward.replace(/'/g, "''")}')`);
    if (filters.zone)          conditions.push(`zone_id = ${parseInt(filters.zone) || 0}`);
    if (filters.locality)      conditions.push(`UPPER(locality) LIKE UPPER('%${filters.locality.replace(/'/g, "''")}%')`);
    if (filters.building_name) conditions.push(`UPPER(name) LIKE UPPER('%${filters.building_name.replace(/'/g, "''")}%')`);
    if (filters.uid)           conditions.push(`UPPER(bld_id) = UPPER('${filters.uid.replace(/'/g, "''")}')`);
    if (filters.sac)           conditions.push(`(UPPER(sac_number) LIKE UPPER('%${filters.sac.replace(/'/g, "''")}%'))`);
    if (filters.floors_min)    conditions.push(`no_floors >= ${parseInt(filters.floors_min)}`);
    if (filters.floors_max)    conditions.push(`no_floors <= ${parseInt(filters.floors_max)}`);

    featureLayerRef.current.definitionExpression = conditions.join(' AND ');

  }, [filters]);

  // Update map pin when building is selected
  useEffect(() => {
    const view = viewRef.current;
    const gLayer = graphicsLayerRef.current;

    if (!view || !gLayer) return;

    // Clear old graphics
    gLayer.removeAll();

    const buildingToDraw = externalBuilding || selectedBuilding;

    if (!buildingToDraw) return;

    // Use geometry if returned directly from the API
    if (buildingToDraw.geometry) {
      let geom;
      if (buildingToDraw.geometry.rings) {
        geom = { type: 'polygon', rings: buildingToDraw.geometry.rings, spatialReference: { wkid: 4326 } };
      } else if (buildingToDraw.geometry.x && buildingToDraw.geometry.y) {
        geom = { type: 'point', longitude: buildingToDraw.geometry.x, latitude: buildingToDraw.geometry.y };
      }
      
      if (geom) {
        const fillSymbol = {
          type: 'simple-fill',
          color: [226, 119, 40, 0.5],
          outline: { color: [255, 0, 0], width: 3 }
        };

        const pointSymbol = {
          type: 'simple-marker', color: [226, 119, 40],
          outline: { color: [255, 255, 255], width: 2 }, size: 14
        };

        const graphic = new Graphic({
          geometry: geom,
          symbol: geom.type === 'polygon' ? fillSymbol : pointSymbol
        });

        gLayer.add(graphic);
        
        view.goTo({
          target: graphic.geometry,
          zoom: 19,
          tilt: 60,
        }, { duration: 2500, easing: 'in-out-expo' });
      }
    }
  }, [selectedBuilding, externalBuilding]);

  return (
    <div className="relative w-full h-full rounded-lg shadow-sm overflow-hidden border border-stroke dark:border-strokedark">
      <div ref={mapDivRef} className="w-full h-full" />

      {/* Layer Toggles & Tools Overlay */}
      <div className="absolute top-4 right-4 flex flex-col gap-2 z-[99]">
        <button
          onClick={() => toggleLayer('Reality Model', setIsMeshVisible)}
          className={`w-9 h-9 flex items-center justify-center rounded shadow transition-colors font-bold text-sm ${isMeshVisible ? 'bg-primary text-white' : 'bg-white dark:bg-boxdark text-gray-700 dark:text-gray-200 hover:bg-gray-100'}`}
          title="Toggle Mesh (Reality Model)"
        >
          <svg className="w-5 h-5 text-current" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
            />
          </svg>
        </button>
        <button
          onClick={() => toggleLayer('lod', setIsLodVisible, true)}
          className={`w-9 h-9 flex items-center justify-center rounded shadow transition-colors font-bold text-sm ${isLodVisible ? 'bg-primary text-white' : 'bg-white dark:bg-boxdark text-gray-700 dark:text-gray-200 hover:bg-gray-100'}`}
          title="Toggle LoD (3D Buildings)"
        >
          <svg className="w-5 h-5 text-current" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <button
          onClick={() => toggleLayer('Imagery', setIsOrthoVisible)}
          className={`w-9 h-9 flex items-center justify-center rounded shadow transition-colors font-bold text-sm ${isOrthoVisible ? 'bg-primary text-white' : 'bg-white dark:bg-boxdark text-gray-700 dark:text-gray-200 hover:bg-gray-100'}`}
          title="Toggle Ortho (Imagery)"
        >
          <svg className="w-5 h-5 text-current" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 7l9-4 9 4-9 4-9-4zm0 6l9 4 9-4M3 13v6l9 4 9-4v-6" />
          </svg>
        </button>
        <button
          onClick={() => toggleLayer('Buildings', setIsBuildingVisible)}
          className={`w-9 h-9 flex items-center justify-center rounded shadow transition-colors font-bold text-sm ${isBuildingVisible ? 'bg-primary text-white' : 'bg-white dark:bg-boxdark text-gray-700 dark:text-gray-200 hover:bg-gray-100'}`}
          title="Toggle Building Layer"
        >
          <MdLocationCity size={20} />
        </button>
      </div>
    </div>
  );
}

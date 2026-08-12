"use client"

import { useEffect, useRef, useState } from "react"
import Graphic from "@arcgis/core/Graphic"

import "@arcgis/core/assets/esri/themes/light/main.css"
import FeatureTable from "../Tools/Feature-Table"
import * as mapManager from '../../utils/mapManager'

const InitialMap = ({ selectedPropertyCategory, onPropertyCategoryChange }) => {
  const mapContainer3DRef = useRef(null)
  const [view, setView] = useState(null)
  const [webScene, setWebScene] = useState(null)
  const [buildingLayer, setBuildingLayer] = useState(null)
  const [filteredFeatures, setFilteredFeatures] = useState([])
  const [showFeatureTable, setShowFeatureTable] = useState(false)
  const [highlightGraphics, setHighlightGraphics] = useState([])
  const [layerFields, setLayerFields] = useState([])

  // Property category mapping - exact names from your list
  const propertyCategories = [
    "Central Govt.",
    "Commercial",
    "Communication",
    "Educational",
    "Health Services",
    "Heritage",
    "Industrial",
    "Mixed",
    "Other",
    "Others",
    "Public & Semi-Public",
    "Public Utilities",
    "Railway",
    "Recreational",
    "Religious",
    "Residential",
    "Solid Waste Management",
    "State Govt. Property",
    "Traffic Related",
    "Transportation",
    "others",
  ]

  // Suppress console warnings and errors from ArcGIS/Lit
  useEffect(() => {
    // Store original console methods
    const originalWarn = console.warn
    const originalError = console.error
    const originalLog = console.log

    // Override console methods to filter out specific warnings
    console.warn = function(...args) {
      const warningString = args.join(' ')
      
      // Filter out specific warnings
      if (
        warningString.includes('Lit is in dev mode') ||
        warningString.includes('Using Calcite Components') ||
        warningString.includes('Overriding ReactiveElement.createProperty') ||
        warningString.includes('esri.views.3d.layers.graphics.Graphics3DCore') ||
        warningString.includes('picture-fill') ||
        warningString.includes('CIM polygon symbology') ||
        warningString.includes('Renderer for layer') ||
        warningString.includes('useCIMFallbackSymbology')
      ) {
        return // Suppress these warnings
      }
      
      // Call original warn for other warnings
      originalWarn.apply(console, args)
    }

    console.error = function(...args) {
      const errorString = args.join(' ')
      
      // Filter out specific errors
      if (
        errorString.includes('picture-fill') ||
        errorString.includes('unsupported in 3D') ||
        errorString.includes('esri.views.3d.layers.graphics.Graphics3DCore')
      ) {
        return // Suppress these errors
      }
      
      // Call original error for other errors
      originalError.apply(console, args)
    }

    console.log = function(...args) {
      const logString = args.join(' ')
      
      // Filter out specific logs
      if (
        logString.includes('Using Calcite Components') ||
        logString.includes('chunk-')
      ) {
        return // Suppress these logs
      }
      
      // Call original log for other logs
      originalLog.apply(console, args)
    }

    // Cleanup function to restore original console methods
    return () => {
      console.warn = originalWarn
      console.error = originalError
      console.log = originalLog
    }
  }, [])

  // Initialize the map — attach singleton, find building layer once ready
  useEffect(() => {
    if (!mapContainer3DRef.current) return;

    mapManager.attachTo(mapContainer3DRef.current).then(() => {
      const v = mapManager.getView();
      const ws = mapManager.getMap();
      if (!v || !ws) return;

      setView(v);
      setWebScene(ws);

      v.goTo({
        center: [72.847187, 18.999758],
        zoom: 13,
        tilt: 65,
      }).catch(() => {});

      // Find the building layer (already loaded by the singleton WebScene)
      ws.when(() => {
        const buildingLayerFound = ws.allLayers.find(
          (layer) =>
            layer.title === "Building 2024" ||
            layer.title === "building_2024" ||
            layer.title === "Building_2024" ||
            (layer.title?.toLowerCase().includes("building") && layer.title?.includes("2024")),
        );

        if (buildingLayerFound) {
          buildingLayerFound.load().then(() => {
            setBuildingLayer(buildingLayerFound);
            if (buildingLayerFound.fields) {
              setLayerFields(buildingLayerFound.fields);
            }
          }).catch(() => {});
        }
      });
    });

    return () => {
      mapManager.detach();
    };
  }, []);

  // Function to find the correct field name for property type
  const findPropertyTypeField = () => {
    if (!layerFields || layerFields.length === 0) return null

    // Common field names for property type/class
    const possibleFieldNames = [
      "class",
      "Class",
      "CLASS",
      "property_type",
      "propertyType",
      "PROPERTY_TYPE",
      "type",
      "Type",
      "TYPE",
      "category",
      "Category",
      "CATEGORY",
      "usage",
      "Usage",
      "USAGE",
      "land_use",
      "landuse",
      "LAND_USE",
      "building_type",
      "buildingType",
      "BUILDING_TYPE",
    ]

    for (const fieldName of possibleFieldNames) {
      const field = layerFields.find((f) => f.name === fieldName)
      if (field) {
        return fieldName
      }
    }

    return null
  }

  // Handle property category filtering
  useEffect(() => {
    if (!buildingLayer || !view || !selectedPropertyCategory || selectedPropertyCategory === "All") {
      // Clear highlights if no category selected
      if (selectedPropertyCategory === "All" || !selectedPropertyCategory) {
        clearHighlights()
        setShowFeatureTable(false)
        setFilteredFeatures([])
      }
      return
    }

    const queryAndHighlightFeatures = async () => {
      try {
        // Clear existing highlights
        clearHighlights()

        // Find the correct field name for property type
        const propertyTypeField = findPropertyTypeField()

        if (!propertyTypeField) {
          return
        }

        // Create query for F/S ward and selected property category
        const query = buildingLayer.createQuery()

        // Build where clause - filtering by ward F/S and property category
        let whereClause = "ward_no = 'F/S'"

        if (selectedPropertyCategory && selectedPropertyCategory !== "All") {
          // Use the found field name for property category filter
          whereClause += ` AND ${propertyTypeField} = '${selectedPropertyCategory}'`
        }

        query.where = whereClause
        query.outFields = ["*"]
        query.returnGeometry = true

        const results = await buildingLayer.queryFeatures(query)

        if (results.features.length > 0) {
          // Highlight the features
          highlightFeatures(results.features)

          // Set features for the feature table
          setFilteredFeatures(results.features)
          setShowFeatureTable(true)

          // Zoom to the features
          const geometries = results.features.map((f) => f.geometry).filter((g) => g)
          if (geometries.length > 0) {
            view.goTo({
              target: geometries,
              padding: { top: 50, bottom: 50, left: 50, right: 50 },
            })
          }
        } else {
          setFilteredFeatures([])
          setShowFeatureTable(false)

          // Try alternative query without ward filter to see if category exists
          const testQuery = buildingLayer.createQuery()
          testQuery.where = `${propertyTypeField} = '${selectedPropertyCategory}'`
          testQuery.returnCountOnly = true

          try {
            await buildingLayer.queryFeatureCount(testQuery)
          } catch (e) {
            // Silently handle query errors
          }
        }
      } catch (error) {
        // Silently handle query errors
        setFilteredFeatures([])
        setShowFeatureTable(false)
      }
    }

    queryAndHighlightFeatures()
  }, [selectedPropertyCategory, buildingLayer, view, layerFields])

  // Function to highlight features on the map
  const highlightFeatures = (features) => {
    if (!view) return

    // Clear existing highlights
    clearHighlights()

    const graphics = features.map((feature) => {
      let symbol

      if (feature.geometry.type === "point") {
        symbol = {
          type: "point-3d",
          symbolLayers: [
            {
              type: "object",
              resource: { primitive: "cylinder" },
              width: 15,
              height: 30,
              material: { color: [255, 140, 0, 0.8] },
            },
          ],
        }
      } else if (feature.geometry.type === "polygon") {
        symbol = {
          type: "polygon-3d",
          symbolLayers: [
            {
              type: "fill",
              material: { color: [255, 140, 0, 0.7] },
              outline: { color: [255, 69, 0], size: 2 },
            },
            {
              type: "extrude",
              size: 20,
              material: { color: [255, 140, 0, 0.5] },
            },
          ],
        }
      } else if (feature.geometry.type === "polyline") {
        symbol = {
          type: "line-3d",
          symbolLayers: [
            {
              type: "line",
              material: { color: [255, 140, 0] },
              size: 4,
            },
          ],
        }
      }

      return new Graphic({
        geometry: feature.geometry,
        symbol: symbol,
      })
    })

    view.graphics.addMany(graphics)
    setHighlightGraphics(graphics)
  }

  // Function to clear highlights
  const clearHighlights = () => {
    if (view && highlightGraphics.length > 0) {
      view.graphics.removeMany(highlightGraphics)
      setHighlightGraphics([])
    }
  }

  // Handle feature selection from feature table
  const handleFeatureSelect = (feature) => {
    if (!view || !feature) {
      return
    }

    // Clear existing highlights
    clearHighlights()

    if (feature.geometry) {
      // Create a more prominent highlight for the selected feature
      let symbol

      if (feature.geometry.type === "point") {
        symbol = {
          type: "point-3d",
          symbolLayers: [
            {
              type: "object",
              resource: { primitive: "cylinder" },
              width: 20,
              height: 40,
              material: { color: [0, 255, 0, 0.9] },
            },
          ],
        }
      } else if (feature.geometry.type === "polygon") {
        symbol = {
          type: "polygon-3d",
          symbolLayers: [
            {
              type: "fill",
              material: { color: [0, 255, 0, 0.8] },
              outline: { color: [0, 200, 0], size: 3 },
            },
            {
              type: "extrude",
              size: 30,
              material: { color: [0, 255, 0, 0.6] },
            },
          ],
        }
      } else if (feature.geometry.type === "polyline") {
        symbol = {
          type: "line-3d",
          symbolLayers: [
            {
              type: "line",
              material: { color: [0, 255, 0] },
              size: 6,
            },
          ],
        }
      }

      const graphic = new Graphic({
        geometry: feature.geometry,
        symbol: symbol,
      })

      view.graphics.add(graphic)
      setHighlightGraphics([graphic])

      // Zoom to the selected feature
      view.goTo({
        target: feature.geometry,
        zoom: 19,
        tilt: 45,
        padding: 40,
      })
    }
  }

  // Handle closing feature table
  const handleCloseFeatureTable = () => {
    setShowFeatureTable(false)
    clearHighlights()
  }

  return (
    <div className="bg-white rounded-xl shadow-md p-4 mb-6" style={{ height: "500px", width: "100%" }}>
      <div className="flex justify-between items-center mb-3">
        <h3 className="font-semibold text-gray-700 flex items-center">
          <span className="mr-2">🗺️</span>
          3D Building Map - F/S Ward
          {selectedPropertyCategory && selectedPropertyCategory !== "All" && (
            <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-800 rounded-md text-sm">
              Showing: {selectedPropertyCategory}
            </span>
          )}
        </h3>
        {filteredFeatures.length > 0 && (
          <div className="text-xs bg-green-50 text-green-600 px-2 py-1 rounded-md">
            Found: {filteredFeatures.length} buildings
          </div>
        )}
      </div>

      <div
        ref={mapContainer3DRef}
        style={{
          height: "calc(100% - 60px)",
          width: "100%",
          position: "relative",
          overflow: "hidden",
        }}
      />

      {/* Feature Table */}
      {/* {showFeatureTable && filteredFeatures.length > 0 && (
        <FeatureTable
          features={filteredFeatures}
          layerTitle={`Building 2024 - ${selectedPropertyCategory} (F/S Ward)`}
          view={view}
          onClose={handleCloseFeatureTable}
          onFeatureSelect={handleFeatureSelect}
        />
      )} */}
    </div>
  )
}

export default InitialMap
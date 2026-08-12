import React, { useEffect, useState } from "react";
import MapImageLayer from "@arcgis/core/layers/MapImageLayer";
import FeatureLayer from "@arcgis/core/layers/FeatureLayer";
import Query from "@arcgis/core/rest/support/Query";
import Graphic from "@arcgis/core/Graphic";
import GraphicsLayer from "@arcgis/core/layers/GraphicsLayer";
import "@arcgis/core/assets/esri/themes/light/main.css";

const QueryTools = ({ mapView }) => {
  const [fields, setFields] = useState([]);
  const [selectedField, setSelectedField] = useState("");
  const [selectedCondition, setSelectedCondition] = useState("=");
  const [inputValue, setInputValue] = useState("");
  const [featureLayer, setFeatureLayer] = useState(null);
  const graphicsLayer = new GraphicsLayer();

  useEffect(() => {
    if (!mapView) return;
    
    mapView.when(() => {
      mapView.map.loadAll().then(() => {
        console.log("All layers loaded");
        console.log("Available Layers:", mapView.map.allLayers.items.map(layer => layer.title));
        
        const gsBuildingLayer = mapView.map.allLayers.find(layer => layer.title === "GS_Building" && layer.type === "map-image");
        
        if (gsBuildingLayer) {
          console.log("GS_Building MapImageLayer found, checking sublayers...");
          
          gsBuildingLayer.load().then(() => {
            const buildingSublayer = gsBuildingLayer.sublayers.find(sub => sub.title === "Building");
            
            if (buildingSublayer) {
              console.log("Building sublayer found:", buildingSublayer.title);
              
              buildingSublayer.createFeatureLayer().then(featureLayer => {
                console.log("Feature Layer created from sublayer.");
                setFeatureLayer(featureLayer);
                
                featureLayer.load().then(() => {
                  if (featureLayer.fields) {
                    setFields(featureLayer.fields.map((field) => field.name));
                  } else {
                    console.error("Building sublayer found but has no fields.");
                  }
                });
              });
            } else {
              console.error("Building sublayer not found inside GS_Building.");
            }
          });
        } else {
          console.error("GS_Building MapImageLayer not found.");
        }
      });
    });
  }, [mapView]);

  const executeQuery = () => {
    if (!featureLayer || !selectedField || !selectedCondition || !inputValue) {
      console.error("Ensure all fields are selected before executing query.");
      return;
    }
    
    const isNumeric = !isNaN(inputValue);
    const queryValue = isNumeric ? inputValue : `'${inputValue}'`;
    
    const query = new Query();
    query.where = `${selectedField} ${selectedCondition} ${queryValue}`;
    query.returnGeometry = true;
    query.outFields = ["*"];
    query.num = 500;

    featureLayer.queryFeatures(query).then((results) => {
      console.log("Query Results:", results.features);
      
      graphicsLayer.removeAll();
      mapView.map.remove(graphicsLayer);
      
      if (results.features.length > 0) {
        const highlightGraphics = results.features.map((feature) => new Graphic({
          geometry: feature.geometry,
          symbol: {
            type: "simple-fill",
            color: [0, 0, 255, 0.5], // Blue highlight
            outline: {
              color: [0, 0, 255],
              width: 2,
            },
          },
        }));
        
        graphicsLayer.addMany(highlightGraphics);
        mapView.map.add(graphicsLayer);
        
        mapView.goTo(results.features.map(feature => feature.geometry)).catch(err => console.error("Zoom error:", err));
      } else {
        console.warn("No matching features found.");
      }
    }).catch(error => {
      console.error("Query failed:", error);
    });
  };

  return (
    <div style={{ position: "absolute", top: 10, left: 10, background: "white", padding: "10px", borderRadius: "5px", boxShadow: "0px 0px 10px rgba(0,0,0,0.1)" }}>
      <h3>Buildings Query Tools</h3>
      <label>Field: </label>
      <select style={{border:'1px solid black'}} value={selectedField} onChange={(e) => setSelectedField(e.target.value)}>
        <option value="">Select Field</option>
        {fields.map((field) => (
          <option key={field} value={field}>{field}</option>
        ))}
      </select>
      <br /><br />
      
      <label>Condition: </label>
      <select style={{border:'1px solid black'}} value={selectedCondition} onChange={(e) => setSelectedCondition(e.target.value)}>
        <option value=">">&gt;</option>
        <option value="<">&lt;</option>
        <option value="=">=</option>
        <option value=">=">&gt;=</option>
        <option value="<=">&lt;=</option>
      </select>
      <br /><br />
      
      <label>Input Value: </label>
      <input
      style={{border:'1px solid black'}}
        type="text"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        placeholder="Enter value"
      />
      <br /><br />
      
      <button style={{border:'1px solid black', padding:'1px 5px'}} onClick={executeQuery}>Search</button>
    </div>
  );
};

export default QueryTools;
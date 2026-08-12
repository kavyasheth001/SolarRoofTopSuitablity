import React, { useEffect, useRef, useState } from "react";
import "@arcgis/core/assets/esri/themes/light/main.css";
import esriConfig from "@arcgis/core/config";
import WebScene from "@arcgis/core/WebScene";
import SceneView from "@arcgis/core/views/SceneView";
import Editor from "@arcgis/core/widgets/Editor";
import { LayoutList } from "lucide-react";
import Camera from "@arcgis/core/Camera";

// Custom CSS for the Editor widget - updated with your own custom positioning
const editorStyles = `
  .esri-view-height-xsmall .esri-ui-corner .esri-component.esri-widget--panel, 
  .esri-view-height-xsmall .esri-ui-corner .esri-component.esri-widget--panel-height-only {
    height: 400px !important;
  }
  
  /* Your custom CSS here - example of custom positioning */
  .esri-editor {
    position: absolute !important;
    top: 19px !important;
    left: 55px !important;
    margin: 0 !important;
    max-width: 300px !important;
    background-color: white !important;
    border-radius: 8px !important;
    box-shadow: 0 3px 12px rgba(0, 0, 0, 0.2) !important;
    max-height: 374px !important;
  }
  
  .esri-editor__header {
    background-color: #3b5998 !important;
    color: white !important;
    border-radius: 8px 8px 0 0 !important;
    padding: 10px !important;
  }
  
  .esri-editor__panel {
    border-radius: 0 0 8px 8px !important;
    padding: 10px !important;
  }
  
  .esri-editor__content {
    max-height: 350px !important;
    overflow-y: auto !important;
  }
`;

const Proposed = () => {
  const sceneDiv = useRef(null);
  const [sceneView, setSceneView] = useState(null);
  const [editor, setEditor] = useState(null);
  const [isEditorVisible, setIsEditorVisible] = useState(true);

  useEffect(() => {
    esriConfig.portalUrl = `${import.meta.env.VITE_PORTAL_URL}/portal`; 

    // Add custom styles to document head
    const styleEl = document.createElement('style');
    styleEl.innerHTML = editorStyles;
    document.head.appendChild(styleEl);

    // Create a WebScene instead of WebMap
    const webSceneInstance = new WebScene({
      portalItem: { id: import.meta.env.VITE_WEBSCENE_ID },
    });

    // Worli, Mumbai coordinates
    // Latitude: 18.9986° N, Longitude: 72.8174° E
    const worliCamera = new Camera({
      position: {
        x: 72.8174, // longitude
        y: 18.9986, // latitude
        z: 500 // altitude in meters
      },
      heading: 0,
      tilt: 45
    });

    // Create a SceneView instead of MapView
    const sceneViewInstance = new SceneView({
      container: sceneDiv.current,
      map: webSceneInstance,
      camera: worliCamera // Set the camera to Worli, Mumbai
    });

    sceneViewInstance.when(() => {
      setSceneView(sceneViewInstance);

      const layers = webSceneInstance.layers.items;

      layers.forEach((layer) => {
        layer.visible = layer.title === "Proposed Layer";
      });

      // Setup Editor widget with Proposed_Layer
      const proposedLayer = layers.filter(
        (layer) => layer.title === "Proposed Layer" && layer.visible
      );

      const editorWidget = new Editor({
        view: sceneViewInstance,
        layerInfos: proposedLayer.map((layer) => ({
          layer,
          disableGeometryUpdate: false,
        })),
      });

      // Add the editor widget to a custom position - NOT using "top-left"
      // We're using CSS to position it instead of the built-in UI positioning
      if (isEditorVisible) {
        sceneViewInstance.ui.add(editorWidget, "manual");
      }
      
      // Event listeners for the editor
      editorWidget.viewModel.watch("state", (state) => {
        console.log("Editor state changed:", state);
      });
      
      proposedLayer.forEach(layer => {
        if (layer && layer.editingEnabled) {
          console.log("Adding event listeners to layer:", layer.title);
          
          layer.on("edits", (editsEvent) => {
            console.log("Layer edits event triggered:", editsEvent);
            if (editsEvent.addedFeatures && editsEvent.addedFeatures.length > 0) {
              console.log("Form submitted! Features added:", editsEvent.addedFeatures);
            }
          });
          
          layer.on("add", (addEvent) => {
            console.log("Feature added to layer:", addEvent);
          });
        }
      });
      
      editorWidget.on("workflow-step-change", (event) => {
        console.log("Workflow step changed:", event.workflow, event.state, event);
        
        if (event.workflow === "create") {
          console.log(`Create workflow: ${event.info?.previousState || 'start'} -> ${event.state}`);
        }
      });
      
      if (editorWidget.viewModel && editorWidget.viewModel.featureFormViewModel) {
        editorWidget.viewModel.featureFormViewModel.watch("valid", (isValid) => {
          console.log("Form validation state:", isValid);
        });
        
        editorWidget.viewModel.featureFormViewModel.watch("feature", (feature) => {
          if (feature) {
            console.log("Form feature changed:", feature);
          }
        });
      }

      setEditor(editorWidget);
    });

    return () => {
      if (sceneViewInstance) {
        sceneViewInstance.destroy();
      }
    };
  }, []);

  const toggleEditor = () => {
    if (editor) {
      if (isEditorVisible) {
        // If editor is visible, hide it
        sceneView.ui.remove(editor);
      } else {
        // If editor is hidden, show it
        sceneView.ui.add(editor, "manual");
      }
      setIsEditorVisible(!isEditorVisible);
    }
  };

  return (
    <div style={{ position: "relative", height: "82vh", width: "100vw" }}>
      <div ref={sceneDiv} style={{ height: "100%", width: "100%" }}></div>
      <button 
        title={isEditorVisible ? "Hide Editor" : "Show Editor"}
        onClick={toggleEditor}
        style={{
          position: "absolute",
          top: "20px",
          left: "10px",
          background: "white",
          color: "#333",
          border: "1px solid #ddd",
          borderRadius: "4px",
          width: 40,
          height: 40,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          zIndex: 1000,
          boxShadow: "0 2px 5px rgba(0, 0, 0, 0.1)",
          transition: "background-color 0.2s"
        }}
      >
        <LayoutList size={20} />
      </button>
    </div>
  );
};

export default Proposed;
import React, { useEffect, useRef } from 'react';
import LayerList from "@arcgis/core/widgets/LayerList";

const LayerListModal = ({ view, position }) => {
  const containerRef = useRef(null);
  const layerListInstanceRef = useRef(null);
  
  useEffect(() => {
    if (!view || !containerRef.current) return;
    
    // Create the layer list widget
    const layerListWidget = new LayerList({
      view: view,
      container: containerRef.current,
      // For each layer item, show the legend panel inline
      listItemCreatedFunction: (event) => {
        const item = event.item;
        item.panel = { content: "legend", open: true };
      },
    });
    
    layerListInstanceRef.current = layerListWidget;
    
    // Clean up when component unmounts
    return () => {
      if (layerListInstanceRef.current) {
        layerListInstanceRef.current.destroy();
      }
    };
  }, [view]);
  
  return (
    <div
      style={{
        width: "310px",
        height: "400px",
        background: "white",
        borderRadius: "8px",
        overflow: "hidden",
        boxShadow: "0 4px 12px rgba(0, 0, 0, 0.3)",
        padding: "10px",
        position: position || "absolute",
        top: "50px",
        right: "60px",
        zIndex: 100
      }}
    >
      <div ref={containerRef} style={{ width: "100%", height: "100%" }}></div>
    </div>
  );
};

export default LayerListModal;
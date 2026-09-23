import React, { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import { Style, Stroke, Fill } from 'ol/style';
import Feature from 'ol/Feature';

const MIN_WIDTH = 220;
const MIN_HEIGHT = 150;

const IdentifyTool = ({ map, enabled, onClose }) => {
  const [popupContent, setPopupContent] = useState(null);
  const [isVisible, setIsVisible] = useState(false);

  const popupRef = useRef(null);
  const overlayRef = useRef(null);
  const clickListenerRef = useRef(null);
  const highlightFeatureRef = useRef(null);
  const highlightLayerRef = useRef(null);

  const hasBeenDragged = useRef(false);

  // DRAG STATE
  const [dragPosition, setDragPosition] = useState(null);
  const dragOffset = useRef({ x: 0, y: 0 });

  // RESIZE STATE
  const [size, setSize] = useState({ width: 260, height: 265 });
  const isResizing = useRef(false);

  // Reset drag position whenever a new feature/location is shown
  useEffect(() => {
    setDragPosition(null);
    hasBeenDragged.current = false;
  }, [popupContent?.location]);

  // DRAG HANDLER
  const onDragStart = (e) => {
    if (e.button !== 0) return;
    e.preventDefault();
    if (e.target.closest('button')) return;

    const popup = popupRef.current;
    if (!popup) return;

    hasBeenDragged.current = true;

    const rect = popup.getBoundingClientRect();
    dragOffset.current = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };

    const onMouseMove = (moveEvent) => {
      const mapRect = map.getTargetElement().getBoundingClientRect();
      let left = moveEvent.clientX - mapRect.left - dragOffset.current.x;
      let top = moveEvent.clientY - mapRect.top - dragOffset.current.y;
      left = Math.max(10, Math.min(left, mapRect.width - popup.offsetWidth - 10));
      top = Math.max(10, Math.min(top, mapRect.height - popup.offsetHeight - 10));
      setDragPosition({ left, top });
    };

    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  };

  // Auto-position popup when not dragged
  useEffect(() => {
    if (!map || !popupRef.current || !popupContent?.location || !isVisible) return;
    if (hasBeenDragged.current) return;

    const updatePopupPosition = () => {
      // Add null check for popupRef
      if (!popupRef.current || !popupContent.location) return;
      
      try {
        const pixel = map.getPixelFromCoordinate(popupContent.location);
        if (!pixel) return;

        const popup = popupRef.current;
        const w = popup.offsetWidth;
        const h = popup.offsetHeight;
        const mapSize = map.getSize();
        
        if (!mapSize) return;
        
        const viewportWidth = mapSize[0];
        const viewportHeight = mapSize[1];

        let left = pixel[0] + 150;
        let top = pixel[1] - h - 10;

        if (left + w > viewportWidth - 10) {
          left = viewportWidth - w - 10;
        }

        if (top < 10) {
          top = pixel[1] + 20;
        } else if (top + h > viewportHeight - 10) {
          const abovePosition = pixel[1] - h - 10;
          if (abovePosition >= 10) {
            top = abovePosition;
          } else {
            top = Math.max(10, (viewportHeight - h) / 2);
          }
        }

        left = Math.max(10, Math.min(left, viewportWidth - w - 10));
        top = Math.max(10, Math.min(top, viewportHeight - h - 40));

        setDragPosition({ left, top });
      } catch (error) {
        console.warn('Error updating popup position:', error);
      }
    };

    updatePopupPosition();

    // Update position on map move/zoom
    const moveEndKey = map.on('moveend', updatePopupPosition);

    return () => {
      if (moveEndKey && moveEndKey.listener) {
        map.un('moveend', moveEndKey.listener);
      }
    };
  }, [map, popupContent, isVisible]);

  // RESIZE HANDLER
  const onResizeStart = (e) => {
    e.preventDefault();
    e.stopPropagation();
    isResizing.current = true;
    const startX = e.clientX;
    const startY = e.clientY;
    const startWidth = size.width;
    const startHeight = size.height;

    function onMouseMove(moveEvent) {
      if (!isResizing.current) return;
      const newWidth = Math.max(MIN_WIDTH, startWidth + (moveEvent.clientX - startX));
      const newHeight = Math.max(MIN_HEIGHT, startHeight + (moveEvent.clientY - startY));
      setSize({ width: newWidth, height: newHeight });
    }

    function onMouseUp() {
      isResizing.current = false;
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    }

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  };

  // Helper to clear highlight
  const clearHighlight = () => {
    if (highlightLayerRef.current && highlightFeatureRef.current) {
      try {
        highlightLayerRef.current.getSource().removeFeature(highlightFeatureRef.current);
      } catch (error) {
        console.warn('Error clearing highlight:', error);
      }
      highlightFeatureRef.current = null;
    }
  };

  // Helper function to get file icons
  const getFileIcon = (contentType) => {
    if (!contentType) return '📄';
    if (contentType.includes('pdf')) return '📄';
    if (contentType.includes('word') || contentType.includes('document')) return '📝';
    if (contentType.includes('excel') || contentType.includes('spreadsheet')) return '📊';
    if (contentType.includes('powerpoint') || contentType.includes('presentation')) return '📊';
    if (contentType.includes('zip') || contentType.includes('compressed')) return '📦';
    if (contentType.includes('text')) return '📝';
    return '📄';
  };

  // Click listener for map
  useEffect(() => {
    if (!map) return;

    // Create highlight layer if not exists
    if (!highlightLayerRef.current) {
      const highlightLayer = new VectorLayer({
        source: new VectorSource(),
        style: new Style({
          stroke: new Stroke({
            color: 'rgba(255, 255, 0, 1)',
            width: 3,
          }),
          fill: new Fill({
            color: 'rgba(255, 255, 0, 0.2)',
          }),
        }),
        zIndex: 9999,
      });

      highlightLayerRef.current = highlightLayer;
      map.addLayer(highlightLayer);
    }

    // Clean up previous listener
    if (clickListenerRef.current) {
      map.un('singleclick', clickListenerRef.current);
      clickListenerRef.current = null;
    }
    clearHighlight();

    if (enabled) {
      const handleMapClick = async (event) => {
        const coordinate = event.coordinate;
        const pixel = event.pixel;

        // Check if we clicked on a feature
        const features = [];
        map.forEachFeatureAtPixel(pixel, (feature, layer) => {
          if (layer && layer !== highlightLayerRef.current) {
            features.push({ feature, layer });
          }
        });

        if (features.length === 0) {
          setIsVisible(false);
          clearHighlight();
          return;
        }

        // Get the first feature
        const { feature, layer } = features[0];
        const properties = feature.getProperties();

        // Remove geometry from properties
        const { geometry, ...attributes } = properties;

        // Get layer name
        const layerTitle = layer.get('name') || layer.get('title') || 'Unknown Layer';

        // Determine visible fields
        let attributeKeys = Object.keys(attributes);
        const excludedAttributes = ['id', 'objectid', 'fid', 'geometry'];
        attributeKeys = attributeKeys.filter(
          (key) => !excludedAttributes.includes(key.toLowerCase())
        );

        const hasMoreThan10 = attributeKeys.length > 10;
        const objectId = attributes.id || attributes.OBJECTID || attributes.objectid || Math.random();

        // Build attribute HTML
        const buildAttributeHTML = (keys, showAll = false) => {
          const keysToShow = showAll ? keys : keys.slice(0, 10);
          let attributesHTML = '';
          for (const key of keysToShow) {
            const value = attributes[key];
            if (value === null || value === undefined || value === '') continue;
            const displayName = key;
            let displayValue = value;
            if (typeof value === 'number') {
              displayValue = value.toLocaleString();
            } else if (typeof value === 'string' && value.length > 100) {
              displayValue = value.substring(0, 100) + '...';
            }
            attributesHTML += `
              <div class="popup-attribute" style="margin-bottom: 8px; display: flex; border-bottom: 1px solid #eee; padding-bottom: 4px; transition: background-color 0.2s ease;">
                <span class="popup-attribute-key" style="font-weight: 600; margin-right: 8px; min-width: 120px; color: #333; text-transform: capitalize;">${displayName.replace(/_/g, ' ')}:</span>
                <span class="popup-attribute-value" style="word-break: break-word; flex: 1; color: #555;">${displayValue}</span>
              </div>`;
          }
          return attributesHTML;
        };

        // Build HTML content
        const html = `
          <div class="popup-attributes" style="font-size: 12px; height: auto;">
            <div id="initial-attributes-${objectId}">
              ${buildAttributeHTML(attributeKeys, false)}
            </div>
            ${
              hasMoreThan10
                ? `
              <div id="additional-attributes-${objectId}" style="display: none;">
                ${buildAttributeHTML(attributeKeys.slice(10), true)}
              </div>
              <div id="read-more-btn-${objectId}" style="text-align: center; margin-top: 12px; padding-top: 8px; border-top: 1px solid #eee;">
                <button onclick="
                  document.getElementById('additional-attributes-${objectId}').style.display = 'block';
                  document.getElementById('read-more-btn-${objectId}').style.display = 'none';
                  document.getElementById('read-less-btn-${objectId}').style.display = 'block';
                " style="
                  background: linear-gradient(135deg, #1a73e8 0%, #1557b0 100%);
                  color: white;
                  border: none;
                  padding: 8px 16px;
                  border-radius: 4px;
                  cursor: pointer;
                  font-size: 11px;
                  font-weight: 500;
                  transition: transform 0.2s ease;
                " onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'">
                  Read More 
                </button>
              </div>
              <div id="read-less-btn-${objectId}" style="display: none; text-align: center; margin-top: 12px; padding-top: 8px; border-top: 1px solid #eee;">
                <button onclick="
                  document.getElementById('additional-attributes-${objectId}').style.display = 'none';
                  document.getElementById('read-more-btn-${objectId}').style.display = 'block';
                  document.getElementById('read-less-btn-${objectId}').style.display = 'none';
                " style="
                  background: #6c757d;
                  color: white;
                  border: none;
                  padding: 6px 12px;
                  border-radius: 4px;
                  cursor: pointer;
                  font-size: 11px;
                  font-weight: 500;
                  transition: transform 0.2s ease;
                " onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'">
                  Read Less
                </button>
              </div>
            `
                : ''
            }
          </div>`;

        // Determine title
        const titleField =
          attributes.NAME ||
          attributes.name ||
          attributes.Name ||
          attributes.TITLE ||
          attributes.title ||
          attributes.Title ||
          attributes.LABEL ||
          attributes.label ||
          attributes.Label ||
          layerTitle ||
          `Feature #${objectId}`;

        // Highlight the feature
        clearHighlight();
        try {
          const highlightFeature = new Feature({
            geometry: feature.getGeometry(),
          });
          highlightLayerRef.current.getSource().addFeature(highlightFeature);
          highlightFeatureRef.current = highlightFeature;
        } catch (error) {
          console.warn('Error highlighting feature:', error);
        }

        // Center map on feature
        try {
          const view = map.getView();
          const currentZoom = view.getZoom();
          let targetZoom;
          if (currentZoom < 10) targetZoom = 15;
          else if (currentZoom < 15) targetZoom = Math.min(currentZoom + 3, 18);
          else targetZoom = Math.min(currentZoom + 1, 20);

          view.animate({
            center: coordinate,
            zoom: targetZoom,
            duration: 800,
          });
        } catch (error) {
          console.warn('Error animating view:', error);
        }

        setPopupContent({
          title: titleField,
          content: <div dangerouslySetInnerHTML={{ __html: html }} />,
          location: coordinate,
          feature: feature,
        });
        setIsVisible(true);
      };

      clickListenerRef.current = handleMapClick;
      map.on('singleclick', handleMapClick);
    }

    return () => {
      if (clickListenerRef.current) {
        map.un('singleclick', clickListenerRef.current);
      }
      clearHighlight();
    };
  }, [map, enabled]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (highlightLayerRef.current && map) {
        try {
          map.removeLayer(highlightLayerRef.current);
        } catch (error) {
          console.warn('Error removing highlight layer:', error);
        }
        highlightLayerRef.current = null;
      }
    };
  }, [map]);

  // Positioning style
  const baseStyle = {
    position: 'absolute',
    zIndex: 1000,
    width: size.width,
    height: size.height,
    minWidth: MIN_WIDTH,
    minHeight: MIN_HEIGHT,
    backgroundColor: '#FFF',
    color: '#111',
    borderRadius: 8,
    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
    overflow: 'hidden',
    pointerEvents: 'auto',
    border: '1px solid #ddd',
    display: 'flex',
    flexDirection: 'column',
    fontFamily: 'Arial, sans-serif',
  };

  const positionStyle = dragPosition
    ? { ...baseStyle, left: dragPosition.left, top: dragPosition.top }
    : { ...baseStyle, top: 10, right: 10, left: 'auto' };

  // Close handler
  const handleClose = () => {
    setIsVisible(false);
    clearHighlight();
  };

  if (!enabled) return null;
  if (!isVisible || !popupContent) return null;

  return (
    <>
      <style>{`
        .identify-popup::-webkit-scrollbar {
          width: 8px;
        }

        .identify-popup::-webkit-scrollbar-track {
          background: #f1f1f1;
          border-radius: 4px;
        }

        .identify-popup::-webkit-scrollbar-thumb {
          background: #888;
          border-radius: 4px;
        }

        .identify-popup::-webkit-scrollbar-thumb:hover {
          background: #555;
        }

        .popup-attribute:hover {
          background-color: #f5f5f5;
        }
      `}</style>

      <div ref={popupRef} className="identify-popup" style={positionStyle}>
        {/* Header */}
        <div
          style={{
            display: 'flex',
            color: 'white',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '8px 12px',
            borderBottom: '1px solid rgba(255,255,255,0.2)',
            background: 'linear-gradient(135deg, #1a73e8 0%, #1557b0 100%)',
            cursor: 'move',
            userSelect: 'none',
          }}
          onMouseDown={onDragStart}
        >
          <h3 style={{ margin: 0, fontSize: 15, fontWeight: '600' }}>
            {popupContent.title}
          </h3>
          <button
            onClick={handleClose}
            style={{
              background: 'none',
              border: 'none',
              color: '#fff',
              cursor: 'pointer',
              padding: 4,
              display: 'flex',
              alignItems: 'center',
              borderRadius: 4,
              transition: 'background-color 0.2s ease',
            }}
            onMouseOver={(e) => (e.target.style.backgroundColor = 'rgba(255,255,255,0.1)')}
            onMouseOut={(e) => (e.target.style.backgroundColor = 'transparent')}
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div
          style={{
            padding: 12,
            flex: 1,
            overflowY: popupContent.content ? 'auto' : 'hidden',
          }}
        >
          {popupContent.content}
        </div>

        {/* Resize handle */}
        <div
          onMouseDown={onResizeStart}
          style={{
            position: 'absolute',
            right: 0,
            bottom: 0,
            width: 16,
            height: 16,
            cursor: 'nwse-resize',
            zIndex: 20,
            background: 'transparent',
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'flex-end',
            userSelect: 'none',
          }}
          title="Resize"
        >
          <svg width="16" height="16" style={{ opacity: 0.7 }}>
            <polyline points="0,16 16,0" style={{ stroke: '#1557b0', strokeWidth: 2 }} />
          </svg>
        </div>

        {/* Arrow */}
        <div
          style={{
            position: 'absolute',
            bottom: -8,
            left: '50%',
            marginLeft: -8,
            width: 0,
            height: 0,
            borderLeft: '8px solid transparent',
            borderRight: '8px solid transparent',
            borderTop: '8px solid #1557b0',
          }}
        />
      </div>
    </>
  );
};

export default IdentifyTool;

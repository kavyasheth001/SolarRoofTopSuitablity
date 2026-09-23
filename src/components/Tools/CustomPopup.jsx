'use client';

import { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import './CustomPopup.css';

const MIN_WIDTH = 220;
const MIN_HEIGHT = 150;

const CustomMapPopup = ({ view, isEnabled, onClose }) => {
  const [popupContent, setPopupContent] = useState(null);
  const [isVisible, setIsVisible] = useState(false);

  const popupRef = useRef(null);
  const clickHandler = useRef(null);
  const highlightRef = useRef(null);
  const scrollRef = useRef(null);

  const viewWatchRef = useRef(null);
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
      const mapRect = popup.parentElement.getBoundingClientRect();
      let left = moveEvent.clientX - mapRect.left - dragOffset.current.x;
      let top = moveEvent.clientY - mapRect.top - dragOffset.current.y;
      left = Math.max(
        10,
        Math.min(left, mapRect.width - popup.offsetWidth - 10),
      );
      top = Math.max(
        10,
        Math.min(top, mapRect.height - popup.offsetHeight - 10),
      );
      setDragPosition({ left, top });
    };

    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  };

  useEffect(() => {
    if (!view || !popupRef.current || !popupContent?.location || !isVisible)
      return;
    if (hasBeenDragged.current) return;

    const updatePopupPosition = () => {
      if (!popupContent.location) return;
      const screenPoint = view.toScreen(popupContent.location);
      const popup = popupRef.current;
      const w = popup.offsetWidth;
      const h = popup.offsetHeight;
      const viewportWidth = view.width;
      const viewportHeight = view.height;

      let left = screenPoint.x + 150;
      let top = screenPoint.y - h - 10;

      if (left + w > viewportWidth - 10) {
        left = viewportWidth - w - 10;
      }

      if (top < 10) {
        top = screenPoint.y + 20;
      } else if (top + h > viewportHeight - 10) {
        const abovePosition = screenPoint.y - h - 10;
        if (abovePosition >= 10) {
          top = abovePosition;
        } else {
          top = Math.max(10, (viewportHeight - h) / 2);
        }
      }

      left = Math.max(10, Math.min(left, viewportWidth - w - 10));
      top = Math.max(10, Math.min(top, viewportHeight - h - 40));

      setDragPosition({ left, top });
    };

    updatePopupPosition();

    if (viewWatchRef.current) {
      viewWatchRef.current.remove();
    }

    const watchHandles = [];
    watchHandles.push(view.watch('extent', updatePopupPosition));
    watchHandles.push(
      view.watch('stationary', (isStationary) => {
        if (isStationary) updatePopupPosition();
      }),
    );

    viewWatchRef.current = {
      remove: () => watchHandles.forEach((handle) => handle.remove()),
    };

    return () => {
      if (viewWatchRef.current) {
        viewWatchRef.current.remove();
        viewWatchRef.current = null;
      }
    };
  }, [view, popupContent, isVisible]);

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
      const newWidth = Math.max(
        MIN_WIDTH,
        startWidth + (moveEvent.clientX - startX),
      );
      const newHeight = Math.max(
        MIN_HEIGHT,
        startHeight + (moveEvent.clientY - startY),
      );
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

  // Helper – clear any highlight
  const clearHighlight = () => {
    try {
      highlightRef.current?.remove();
    } catch (_) {}
    highlightRef.current = null;
  };

  // Listen for clicks on the map, display popup
  useEffect(() => {
    if (!view) return;

    // Clean up previous listeners/highlights first
    if (clickHandler.current) {
      clickHandler.current.remove();
      clickHandler.current = null;
    }
    clearHighlight();

    if (isEnabled) {
      clickHandler.current = view.on('click', async (event) => {
        const { screenPoint } = event;
        const hit = (await view.hitTest(screenPoint)).results?.[0];

        if (!hit?.graphic) {
          setIsVisible(false);
          clearHighlight();
          return;
        }

        const layer = hit.graphic.layer;
        const oidField = layer.objectIdField;
        const objectId = hit.graphic.attributes[oidField];

        let visibleFields = [];
        const fieldAliases = {};

        try {
          if (
            layer.popupTemplate &&
            layer.popupTemplate.content?.[0]?.fieldInfos
          ) {
            // Use content[0].fieldInfos (13 fields) instead of popupTemplate.fieldInfos (34 fields)
            visibleFields = layer.popupTemplate.content[0].fieldInfos
              .filter((fieldInfo) => fieldInfo.visible !== false)
              .map((fieldInfo) => fieldInfo.fieldName);
            layer.popupTemplate.content[0].fieldInfos.forEach((fieldInfo) => {
              fieldAliases[fieldInfo.fieldName] =
                fieldInfo.label || fieldInfo.fieldName;
            });
          } else if (layer.fields) {
            visibleFields = layer.fields
              .filter(
                (field) =>
                  !field.name.startsWith('_') && field.type !== 'geometry',
              )
              .map((field) => field.name);
            layer.fields.forEach((field) => {
              fieldAliases[field.name] = field.alias || field.name;
            });
          }
        } catch (err) {
          visibleFields = [];
        }

        let attributes = { ...hit.graphic.attributes };

        try {
          const q = layer.createQuery();
          q.where = `${oidField} = ${objectId}`;
          q.outFields = ['*'];
          q.returnGeometry = false;
          const result = await layer.queryFeatures(q);
          if (result?.features?.length > 0) {
            attributes = result.features[0].attributes;
          }
        } catch (err) {}

        // **NEW CODE: Query for attachments**
        let attachmentsHTML = '';
        try {
          // Check if layer supports attachments
          if (
            layer.capabilities &&
            layer.capabilities.data &&
            layer.capabilities.data.supportsAttachment
          ) {
            const attachmentQuery = {
              objectIds: [objectId],
            };

            const attachmentResult =
              await layer.queryAttachments(attachmentQuery);
            const attachments = attachmentResult[objectId];

            if (attachments && attachments.length > 0) {
              attachmentsHTML = `
                <div class="popup-attachments" style="margin-top: 16px; padding-top: 16px; border-top: 1px solid #eee;">
                  <div class="attachments-header" style="font-weight: 600; margin-bottom: 12px; color: #333; font-size: 13px;">
                    Attachments (${attachments.length})
                  </div>
                  <div class="attachments-container" style="display: flex; flex-wrap: wrap; gap: 8px;">
              `;

              attachments.forEach((attachment) => {
                const isImage =
                  attachment.contentType &&
                  attachment.contentType.startsWith('image/');

                if (isImage) {
                  // Display image attachments as thumbnails
                  attachmentsHTML += `
                    <div class="attachment-item" style="position: relative; border: 1px solid #ddd; border-radius: 4px; overflow: hidden; background: #f9f9f9;">
                      <img 
                        src="${attachment.url}" 
                        alt="${attachment.name}"
                        style="width: 80px; height: 80px; object-fit: cover; cursor: pointer; display: block;"
                        onclick="window.open('${attachment.url}', '_blank')"
                        title="${attachment.name} (${(attachment.size / 1024).toFixed(1)} KB)"
                      />
                      <div style="position: absolute; bottom: 0; left: 0; right: 0; background: rgba(0,0,0,0.7); color: white; font-size: 10px; padding: 2px 4px; text-overflow: ellipsis; overflow: hidden; white-space: nowrap;">
                        ${attachment.name}
                      </div>
                    </div>
                  `;
                } else {
                  // Display non-image attachments as download links
                  const fileIcon = getFileIcon(attachment.contentType);
                  attachmentsHTML += `
                    <div class="attachment-item" style="display: flex; align-items: center; padding: 8px; border: 1px solid #ddd; border-radius: 4px; background: #f9f9f9; min-width: 150px;">
                      <span style="margin-right: 8px; font-size: 16px;">${fileIcon}</span>
                      <div style="flex: 1; min-width: 0;">
                        <a 
                          href="${attachment.url}" 
                          target="_blank" 
                          style="color: #1a73e8; text-decoration: none; font-size: 11px; display: block; text-overflow: ellipsis; overflow: hidden; white-space: nowrap;"
                          title="${attachment.name}"
                        >
                          ${attachment.name}
                        </a>
                        <div style="font-size: 10px; color: #666; margin-top: 2px;">
                          ${(attachment.size / 1024).toFixed(1)} KB
                        </div>
                      </div>
                    </div>
                  `;
                }
              });

              attachmentsHTML += `
                  </div>
                </div>
              `;
            }
          }
        } catch (err) {
          console.error('Error querying attachments:', err);
        }

        // Highlight the feature
        clearHighlight();
        try {
          view.whenLayerView(layer).then((lv) => {
            highlightRef.current = lv.highlight(hit.graphic);
          });
        } catch (err) {}

        let attributeKeys = Object.keys(attributes);
        if (visibleFields.length > 0) {
          attributeKeys = visibleFields.filter((field) => field in attributes);
        }
        const excludedAttributes = ['id', 'objectid', 'fid'];
        attributeKeys = attributeKeys.filter(
          (key) => !excludedAttributes.includes(key.toLowerCase()),
        );

        const hasMoreThan10 = attributeKeys.length > 10;

        const buildAttributeHTML = (keys, showAll = false) => {
          const keysToShow = showAll ? keys : keys.slice(0, 10);
          let attributesHTML = '';
          for (const key of keysToShow) {
            const value = attributes[key];
            if (value === null || value === undefined || value === '') continue;
            const displayName = fieldAliases[key] || key;
            // let displayValue = value;
            // if (typeof value === 'number') {
            //   displayValue = String(value);
            // } else if (typeof value === 'string' && value.length > 100) {
            //   displayValue = value.substring(0, 100) + '...';
            // }
            let displayValue = value;
            if (typeof value === 'number') {
              displayValue = String(value);
            } else if (typeof value === 'string' && (value.startsWith('http://') || value.startsWith('https://'))) {
              // Check if it's an image URL
              const isImageUrl = /\.(jpg|jpeg|png|gif|webp|bmp|svg)(\?.*)?$/i.test(value) ||
                value.includes('arcgis.com') || value.includes('/sharing/rest/content/items/');
              if (isImageUrl) {
                displayValue = `<a href="${value}" target="_blank" rel="noopener noreferrer" 
                  style="color: #1a73e8; text-decoration: underline; cursor: pointer; font-size: 11px;">
                  🖼️ View Photo
                </a>`;
              } else {
                displayValue = `<a href="${value}" target="_blank" rel="noopener noreferrer" 
                  style="color: #1a73e8; text-decoration: underline; cursor: pointer; font-size: 11px;">
                  🔗 Open Link
                </a>`;
              }
            } else if (typeof value === 'string' && value.length > 100) {
              displayValue = value.substring(0, 100) + '...';
            }

            attributesHTML += `
              <div class="popup-attribute" style="margin-bottom: 8px; display: flex; border-bottom: 1px solid #eee; padding-bottom: 4px;">
                <span class="popup-attribute-key" style="font-weight: 600; margin-right: 8px; min-width: 120px; color: #333; text-transform: capitalize;">${displayName.replace(/_/g, ' ')}:</span>
                <span class="popup-attribute-value" style="word-break: break-word; flex: 1; color: #555;">${displayValue}</span>
              </div>`;
          }
          return attributesHTML;
        };

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
                ">
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
                ">
                  Read Less
                </button>
              </div>
            `
                : ''
            }
            ${attachmentsHTML}
          </div>`;

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
          layer.title ||
          `Feature #${objectId}`;

        // Center the map on the clicked feature
        try {
          const currentZoom = view.zoom;
          let targetZoom;
          if (currentZoom < 10) targetZoom = 15;
          else if (currentZoom < 15) targetZoom = Math.min(currentZoom + 3, 18);
          else targetZoom = Math.min(currentZoom + 1, 20);
          await view.goTo(
            { target: hit.mapPoint, zoom: targetZoom },
            { duration: 800, easing: 'ease-out' },
          );
        } catch (err) {}

        setPopupContent({
          title: titleField,
          content: <div dangerouslySetInnerHTML={{ __html: html }} />,
          location: hit.mapPoint,
          graphic: hit.graphic,
        });
        setIsVisible(true);
      });
    }

    return () => {
      if (clickHandler.current) clickHandler.current.remove();
      clearHighlight();
      if (viewWatchRef.current) {
        viewWatchRef.current.remove();
        viewWatchRef.current = null;
      }
    };
  }, [view, isEnabled]);

  // Helper function to get file icons for different content types
  const getFileIcon = (contentType) => {
    if (!contentType) return '📄';
    if (contentType.includes('pdf')) return '📄';
    if (contentType.includes('word') || contentType.includes('document'))
      return '📝';
    if (contentType.includes('excel') || contentType.includes('spreadsheet'))
      return '📊';
    if (
      contentType.includes('powerpoint') ||
      contentType.includes('presentation')
    )
      return '📊';
    if (contentType.includes('zip') || contentType.includes('compressed'))
      return '📦';
    if (contentType.includes('text')) return '📝';
    return '📄';
  };

  // --- Positioning: Adjust to top-right position
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
  };

  const positionStyle = dragPosition
    ? { ...baseStyle, left: dragPosition.left, top: dragPosition.top }
    : {
        ...baseStyle,
        top: 10,
        right: 10,
        left: 'auto',
      };

  // CLOSE HANDLER
  const handleClose = () => {
    setIsVisible(false);
    clearHighlight();
    if (viewWatchRef.current) {
      viewWatchRef.current.remove();
      viewWatchRef.current = null;
    }
  };

  if (!isVisible || !popupContent) return null;

  return (
    <div ref={popupRef} className="custom-map-popup" style={positionStyle}>
      {/* Header and other contents */}
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
          }}
          onMouseOver={(e) =>
            (e.target.style.backgroundColor = 'rgba(255,255,255,0.1)')
          }
          onMouseOut={(e) => (e.target.style.backgroundColor = 'transparent')}
        >
          <X size={16} />
        </button>
      </div>
      {/* body */}
      <div
        ref={scrollRef}
        style={{
          padding: 12,
          flex: 1,
          overflowY: popupContent.content ? 'auto' : 'hidden',
        }}
      >
        {popupContent.content}
      </div>

      {/* resizer */}
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
          <polyline
            points="0,16 16,0"
            style={{ stroke: '#1557b0', strokeWidth: 2 }}
          />
        </svg>
      </div>
      {/* arrow */}
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
  );
};

export default CustomMapPopup;

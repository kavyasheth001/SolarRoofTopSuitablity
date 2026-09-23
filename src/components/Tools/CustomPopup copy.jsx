import { useEffect, useRef, useState } from "react"
import { X } from "lucide-react"
import "./CustomPopup.css"

const CustomMapPopup = ({ view, isEnabled, onClose }) => {
  const [popupContent, setPopupContent] = useState(null)
  const [isVisible, setIsVisible] = useState(false)

  const popupRef = useRef(null)
  const clickHandler = useRef(null)
  const highlightRef = useRef(null)
  const viewWatchRef = useRef(null)

  useEffect(() => {
    if (!view) return

    /* wipe any stale listeners / highlights first */
    if (clickHandler.current) {
      clickHandler.current.remove()
      clickHandler.current = null
    }
    clearHighlight()

    if (isEnabled) {
      clickHandler.current = view.on("click", async (event) => {
        const { screenPoint } = event
        const hit = (await view.hitTest(screenPoint)).results?.[0]

        if (!hit?.graphic) {
          setIsVisible(false)
          clearHighlight()
          return
        }

        const layer = hit.graphic.layer
        const oidField = layer.objectIdField
        const objectId = hit.graphic.attributes[oidField]

        console.log("Layer:", layer.title || layer.id)
        console.log("oidField:", oidField)
        console.log("objectId:", objectId)

        /* Get field information including visibility settings */
        let visibleFields = []
        const fieldAliases = {}

        try {
          // Check if layer has popupTemplate with fieldInfos
          if (layer.popupTemplate && layer.popupTemplate.fieldInfos) {
            // Get visible fields from popupTemplate
            visibleFields = layer.popupTemplate.fieldInfos
              .filter((fieldInfo) => fieldInfo.visible !== false)
              .map((fieldInfo) => fieldInfo.fieldName)

            // Get field aliases
            layer.popupTemplate.fieldInfos.forEach((fieldInfo) => {
              fieldAliases[fieldInfo.fieldName] = fieldInfo.label || fieldInfo.fieldName
            })

            console.log("Using popupTemplate fieldInfos for visibility")
          }
          // Fallback to layer fields
          else if (layer.fields) {
            visibleFields = layer.fields
              .filter((field) => !field.name.startsWith("_") && field.type !== "geometry")
              .map((field) => field.name)

            layer.fields.forEach((field) => {
              fieldAliases[field.name] = field.alias || field.name
            })

            console.log("Using layer fields for visibility")
          }

          console.log("Visible fields:", visibleFields)
        } catch (err) {
          console.error("Error getting field information:", err)
          // If we can't get field info, show all attributes
          visibleFields = []
        }

        /* Always fetch the full record with all attributes */
        let attributes = { ...hit.graphic.attributes }

        try {
          // Create a query to get the full feature
          const q = layer.createQuery()
          q.where = `${oidField} = ${objectId}`
          q.outFields = ["*"] // Get all fields
          q.returnGeometry = false

          const result = await layer.queryFeatures(q)

          if (result?.features?.length > 0) {
            attributes = result.features[0].attributes
            console.log("Full attributes:", attributes)
          } else {
            console.warn("No features returned from query, using hit attributes")
          }
        } catch (err) {
          console.error("Could not fetch full attributes:", err)
          // Fallback to hit attributes if query fails
        }

        /* highlight the feature */
        clearHighlight()
        try {
          view.whenLayerView(layer).then((lv) => {
            highlightRef.current = lv.highlight(hit.graphic)
          })
        } catch (err) {
          console.warn("Highlight failed:", err)
        }

        /* build HTML for every attribute dynamically */
        // Filter attributes based on visible fields if available
        let attributeKeys = Object.keys(attributes)
        if (visibleFields.length > 0) {
          attributeKeys = visibleFields.filter((field) => field in attributes)
        }

        const hasMoreThan10 = attributeKeys.length > 10

        // Function to build attribute HTML
        const buildAttributeHTML = (keys, showAll = false) => {
          const keysToShow = showAll ? keys : keys.slice(0, 10)
          let attributesHTML = ""

          for (const key of keysToShow) {
            const value = attributes[key]

            // Skip null, undefined, or empty string values
            if (value === null || value === undefined || value === "") continue

            // Get display name (alias) for the field
            const displayName = fieldAliases[key] || key

            // Format the display value
            let displayValue = value
            if (typeof value === "number") {
              // Format numbers appropriately
              displayValue = value.toLocaleString()
            } else if (typeof value === "string" && value.length > 100) {
              // Truncate very long strings
              displayValue = value.substring(0, 100) + "..."
            }

            attributesHTML += `
              <div class="popup-attribute" style="margin-bottom: 8px; display: flex; border-bottom: 1px solid #eee; padding-bottom: 4px;">
                <span class="popup-attribute-key" style="font-weight: 600; margin-right: 8px; min-width: 120px; color: #333; text-transform: capitalize;">${displayName.replace(/_/g, " ")}:</span>
                <span class="popup-attribute-value" style="word-break: break-word; flex: 1; color: #555;">${displayValue}</span>
              </div>`
          }
          return attributesHTML
        }

        const html = `
          <div class="popup-attributes" style="font-size: 12px; height: 200px; overflow-y: auto;">
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
                  padding: 6px 12px;
                  border-radius: 4px;
                  cursor: pointer;
                  font-size: 11px;
                  font-weight: 500;
                ">
                  Read More (${attributeKeys.length - 10} more attributes)
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
                : ""
            }
          </div>`

        /* Determine title from common name fields or layer name */
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
          `Feature #${objectId}`

        /* Center the map on the clicked feature with dynamic zoom */
        try {
          const currentZoom = view.zoom
          
          // Calculate target zoom level based on current zoom
          let targetZoom
          if (currentZoom < 10) {
            // If zoomed out, zoom to level 15 for good detail
            targetZoom = 15
          } else if (currentZoom < 15) {
            // If moderately zoomed, zoom in a bit more
            targetZoom = Math.min(currentZoom + 3, 18)
          } else {
            // If already zoomed in, keep current zoom or zoom in slightly
            targetZoom = Math.min(currentZoom + 1, 20)
          }

          await view.goTo(
            {
              target: hit.mapPoint,
              zoom: targetZoom,
            },
            {
              duration: 800, // Slightly longer animation for zoom changes
              easing: "ease-out",
            },
          )
        } catch (err) {
          console.warn("Could not center map on feature:", err)
        }

        /* push to state & show */
        setPopupContent({
          title: titleField,
          content: <div dangerouslySetInnerHTML={{ __html: html }} />,
          location: hit.mapPoint,
          graphic: hit.graphic,
        })
        setIsVisible(true)
      })
    }

    /* cleanup on unmount / disable */
    return () => {
      if (clickHandler.current) clickHandler.current.remove()
      clearHighlight()
      if (viewWatchRef.current) {
        viewWatchRef.current.remove()
        viewWatchRef.current = null
      }
    }
  }, [view, isEnabled])

  /* ---------------------------------
   *  helper – clear any highlight
   * -------------------------------- */
  const clearHighlight = () => {
    try {
      highlightRef.current?.remove()
    } catch (_) {
      /* noop */
    }
    highlightRef.current = null
  }

  /* -------------------------------
   *  position popup on each update and when map moves
   * ----------------------------- */
  useEffect(() => {
    if (!view || !popupRef.current || !popupContent || !isVisible) return

    const updatePopupPosition = () => {
      if (!popupContent.location) return

      // Convert the map point to current screen point
      const screenPoint = view.toScreen(popupContent.location)
      const popup = popupRef.current
      const w = popup.offsetWidth
      const h = popup.offsetHeight

      // Get viewport dimensions
      const viewportWidth = view.width
      const viewportHeight = view.height

      // Calculate initial position (centered above the point)
      let left = screenPoint.x + 150 // Increase the left position to move it further right
      let top = screenPoint.y - h - 10

      // Adjust horizontal position to keep popup within screen bounds
      if (left + w > viewportWidth - 10) {
        // If it's too far right, adjust left to stay within bounds
        left = viewportWidth - w - 10
      }

      // Adjust vertical position to keep popup within screen bounds
      if (top < 10) {
        // If popup would go above screen, position it below the point instead
        top = screenPoint.y + 20
      } else if (top + h > viewportHeight - 10) {
        // If popup would go below screen, try to position it above
        const abovePosition = screenPoint.y - h - 10
        if (abovePosition >= 10) {
          top = abovePosition
        } else {
          // If neither above nor below works, position it in the middle
          top = Math.max(10, (viewportHeight - h) / 2)
        }
      }

      // Ensure popup doesn't go outside bounds even after adjustments
      left = Math.max(10, Math.min(left, viewportWidth - w - 10))
      top = Math.max(10, Math.min(top, viewportHeight - h - 10))

      popup.style.left = `${left}px`
      popup.style.top = `${top}px`
    }

    // Initial position
    updatePopupPosition()

    // Watch for map movement and update popup position
    if (viewWatchRef.current) {
      viewWatchRef.current.remove()
    }

    // Set up watchers for map movement
    const watchHandles = []

    // Watch for extent changes (pan/zoom)
    watchHandles.push(view.watch("extent", updatePopupPosition))

    // Watch for stationary property to update after animation completes
    watchHandles.push(
      view.watch("stationary", (isStationary) => {
        if (isStationary) {
          updatePopupPosition()
        }
      }),
    )

    // Store the watch handles for cleanup
    viewWatchRef.current = {
      remove: () => {
        watchHandles.forEach((handle) => handle.remove())
      },
    }

    return () => {
      if (viewWatchRef.current) {
        viewWatchRef.current.remove()
        viewWatchRef.current = null
      }
    }
  }, [view, popupContent, isVisible])

  /* -----------------------------
   *  close handler
   * --------------------------- */
  const handleClose = () => {
    setIsVisible(false)
    clearHighlight()
    if (viewWatchRef.current) {
      viewWatchRef.current.remove()
      viewWatchRef.current = null
    }
    // if (onClose) onClose()
  }

  if (!isVisible || !popupContent) return null

  /* -----------------------------
   *  render
   * --------------------------- */
  return (
    <div
      ref={popupRef}
      className="custom-map-popup"
      style={{
        position: "absolute",
        zIndex: 1000,
        maxWidth: 260,
        backgroundColor: "#FFF",
        color: "#111",
        borderRadius: 8,
        boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
        overflow: "hidden",
        pointerEvents: "auto",
        border: "1px solid #ddd",
      }}
    >
      {/* header */}
      <div
        style={{
          display: "flex",
          color: "white",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "8px 12px",
          borderBottom: "1px solid rgba(255,255,255,0.2)",
          background: "linear-gradient(135deg, #1a73e8 0%, #1557b0 100%)",
        }}
      >
        <h3 style={{ margin: 0, fontSize: 15, fontWeight: "600" }}>{popupContent.title}</h3>
        <button
          onClick={handleClose}
          style={{
            background: "none",
            border: "none",
            color: "#fff",
            cursor: "pointer",
            padding: 4,
            display: "flex",
            alignItems: "center",
            borderRadius: 4,
          }}
          onMouseOver={(e) => (e.target.style.backgroundColor = "rgba(255,255,255,0.1)")}
          onMouseOut={(e) => (e.target.style.backgroundColor = "transparent")}
        >
          <X size={16} />
        </button>
      </div>

      {/* body */}
      <div style={{ padding: 12, maxHeight: 350, overflowY: "auto" }}>{popupContent.content}</div>

      {/* arrow */}
      <div
        style={{
          position: "absolute",
          bottom: -8,
          left: "50%",
          marginLeft: -8,
          width: 0,
          height: 0,
          borderLeft: "8px solid transparent",
          borderRight: "8px solid transparent",
          borderTop: "8px solid #1557b0",
        }}
      />
    </div>
  )
}

export default CustomMapPopup
import { useEffect, useRef, useState, useCallback } from 'react';
import Daylight from "@arcgis/core/widgets/Daylight.js";

const ShadowAnalysisWidget = ({ view, onClose }) => {
  const contentDivRef = useRef(null)
  const daylightWidgetRef = useRef(null);
  const widgetContainerRef = useRef(null)

  const [position, setPosition] = useState({
    top: 120,
    left: null,
    right: 60,
  })

  const containerStyle = {
    width: '280px',
  }

  const [isBodyVisible, setIsBodyVisible] = useState(true)
  const [isWidgetReady, setIsWidgetReady] = useState(false)

  // Function to create the widget
  const createWidget = useCallback(() => {
    if (!view || !widgetContainerRef.current) return;

    console.log('Creating ShadowCast widget...');

    try {
      const widget = new Daylight({
        view: view,
        playSpeedMultiplier: 1,
        visibleElements: {
          shadowsToggle: true,
        },
        container: widgetContainerRef.current,
      });

      console.log('ShadowCast widget created:', widget);
      daylightWidgetRef.current = widget;
      setIsWidgetReady(true);

      // Hide default ArcGIS widget headers and close buttons
      setTimeout(() => {
        if (widgetContainerRef.current) {
          const existingHeaders =
            widgetContainerRef.current.querySelectorAll(
              '.esri-widget__heading',
            );
          existingHeaders.forEach((header) => {
            header.style.display = 'none';
          });

          const existingCloseButtons =
            widgetContainerRef.current.querySelectorAll(
              'button[aria-label="Close"]',
            );
          existingCloseButtons.forEach((btn) => {
            btn.style.display = 'none';
          });
        }
      }, 100);
    } catch (error) {
      console.error('Error creating ShadowCast widget:', error);
    }
  }, [view]);

  // Function to destroy the widget
  const destroyWidget = useCallback(() => {
    if (daylightWidgetRef.current) {
      console.log('Destroying ShadowCast widget...');
      try {
        daylightWidgetRef.current.destroy();
        daylightWidgetRef.current = null;
        setIsWidgetReady(false);
        
        // Clear shadow-related graphics and reset time
        if (view) {
          view.graphics.removeAll();
          view.environment.lighting.date = new Date().setHours(12, 0, 0, 0);
          console.log('Shadow analysis stopped and time reset to 12:00 PM.');
        }
      } catch (error) {
        console.error('Error destroying widget:', error);
      }
    }
  }, [view]);

  // Effect to handle widget creation - only depends on view, not body visibility
  useEffect(() => {
    if (!view) return;

    let mounted = true;

    view.when(() => {
      if (!mounted) return;
      
      // Clean up any existing widget first
      if (daylightWidgetRef.current) {
        console.log('Destroying existing widget before creating new one');
        daylightWidgetRef.current.destroy();
        daylightWidgetRef.current = null;
      }
      
      // Create new widget
      createWidget();
    }).catch((error) => {
      console.error('View initialization error:', error);
    });

    return () => {
      mounted = false;
    };
  }, [view, createWidget]);

  // Cleanup effect on component unmount only
  useEffect(() => {
    return () => {
      destroyWidget();
    };
  }, [destroyWidget]);

  const onDragStart = useCallback((e) => {
    e.preventDefault()
    if (e.target.dataset.role === "close-button") return

    const container = contentDivRef.current
    if (!container) return

    const parent = container.offsetParent
    if (!parent) return

    const parentRect = parent.getBoundingClientRect()
    const rect = container.getBoundingClientRect()
    const offsetX = e.clientX - rect.left
    const offsetY = e.clientY - rect.top

    const onMouseMove = (moveEvent) => {
      let newLeft = moveEvent.clientX - parentRect.left - offsetX
      let newTop = moveEvent.clientY - parentRect.top - offsetY

      // clamp X so it doesn't go outside
      if (newLeft < 0) newLeft = 0
      if (newLeft + rect.width > parentRect.width) {
        newLeft = parentRect.width - rect.width
      }

      // clamp Y so it doesn't go outside
      if (newTop < 0) newTop = 0
      if (newTop + rect.height > parentRect.height) {
        newTop = parentRect.height - rect.height
      }

      setPosition({
        top: newTop,
        left: newLeft,
        right: null,
      })
    }

    const onMouseUp = () => {
      document.removeEventListener("mousemove", onMouseMove)
      document.removeEventListener("mouseup", onMouseUp)
    }

    document.addEventListener("mousemove", onMouseMove)
    document.addEventListener("mouseup", onMouseUp)
  }, [])

  const toggleBodyVisibility = useCallback(() => {
    setIsBodyVisible((prev) => !prev)
  }, [])

  const positionStyle = {
    top: `${position.top}px`,
    ...(position.left !== null ? { left: `${position.left}px` } : { right: `${position.right}px` }),
    ...containerStyle
  }

  const handleClose = () => {
    destroyWidget(); // Ensure widget is destroyed on close
    if (onClose) onClose()
  }

  return (
    <>
      <div
        ref={contentDivRef}
        className="absolute w-80 bg-white text-blue-600 font-sans rounded-xl overflow-hidden shadow-lg z-[99]"
        style={positionStyle}
      >
        <div className="flex items-center justify-between bg-[#1a73e8] px-3 py-2 cursor-move" onMouseDown={onDragStart}>
          <button
            className="bg-transparent border-none text-white cursor-pointer hover:opacity-80 transition-opacity"
            onClick={toggleBodyVisibility}
            aria-label={isBodyVisible ? "Collapse" : "Expand"}
          >
            {isBodyVisible ? "▲" : "▼"}
          </button>

          <div className="text-base text-white font-medium">Shadow Analysis</div>

          <button
            data-role="close-button"
            className="bg-transparent border-none text-white cursor-pointer hover:opacity-80 transition-opacity"
            onClick={handleClose}
            aria-label="Close"
          >
            ✖
          </button>
        </div>

        <div 
          className={`animate-in max-h-[400px] slide-in-from-top-2 duration-200 overflow-y-scroll ${!isBodyVisible ? 'hidden' : ''}`}
        >
          <div className="p-5">
            <div 
              ref={widgetContainerRef} 
              className="esri-widget daylight-container"
              style={{
                minHeight: "300px",
                width: "100%",
                position: "relative",
                padding: "0",
                background: "transparent"
              }}
            >
              {!isWidgetReady && (
                <div className="flex items-center justify-center h-full text-gray-500 text-sm">
                  Loading Shadow Analysis widget...
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

export default ShadowAnalysisWidget
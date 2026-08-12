"use client"

import React, { useEffect, useRef, useCallback, useState } from "react"
import { useToolbar } from "../../../context/ToolbarContext"

const WidgetWrapper = ({ children, widgetId, width = 300, height = 400, priority = 0, enabled = true }) => {
  const { registerWidget, unregisterWidget, updateWidgetPosition } = useToolbar()
  const widgetElementRef = useRef(null)
  const lastPositionRef = useRef({ top: 20, right: 20, left: "auto" })
  const observerRef = useRef(null)
  const updateTimeoutRef = useRef(null)
  const isRegisteredRef = useRef(false)
  const [widgetType, setWidgetType] = useState("unknown")
  const hasMountedRef = useRef(false)

  // Add extensive debugging
  // console.log(`🔧 [WidgetWrapper] Initializing for widgetId: ${widgetId}`)

  // Function to extract position from element
  const extractPositionFromElement = useCallback(
    (element) => {
      if (!element) return null

      const rect = element.getBoundingClientRect()
      const computedStyle = window.getComputedStyle(element)

      // Find parent container for relative positioning
      const container = element.offsetParent || document.body
      const containerRect = container.getBoundingClientRect()

      const top = Math.round(rect.top - containerRect.top)
      const left = Math.round(rect.left - containerRect.left)

      let position

      // Special handling for custom widgets that use inline styles
      const inlineStyle = element.style

      // Check for inline right positioning (common in custom widgets)
      if (inlineStyle.right && inlineStyle.right !== "auto") {
        const rightValue = Math.round(Number.parseFloat(inlineStyle.right))
        position = { top, right: rightValue, left: "auto" }
      }
      // Check for inline left positioning
      else if (inlineStyle.left && inlineStyle.left !== "auto") {
        const leftValue = Math.round(Number.parseFloat(inlineStyle.left))
        position = { top, left: leftValue, right: "auto" }
      }
      // Check computed style for right positioning
      else if (computedStyle.right && computedStyle.right !== "auto" && computedStyle.right.includes("px")) {
        const rightValue = Math.round(Number.parseFloat(computedStyle.right))
        position = { top, right: rightValue, left: "auto" }
      }
      // Default to left positioning
      else {
        position = { top, left, right: "auto" }
      }

      // console.log(`📐 [WidgetWrapper] Extracted position for ${widgetId}:`, position)
      return position
    },
    [widgetId],
  )

  // Debounced position update
  const debouncedPositionUpdate = useCallback(
    (newPosition) => {
      // console.log(`⏰ [WidgetWrapper] Debounced position update for ${widgetId}:`, newPosition)
      
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current)
      }

      updateTimeoutRef.current = setTimeout(() => {
        // console.log(`📤 [WidgetWrapper] Sending position update to toolbar context:`, newPosition)
        updateWidgetPosition(widgetId, newPosition)
      }, 50)
    },
    [widgetId, updateWidgetPosition],
  )

  // Simple widget type detection
  const detectWidgetType = useCallback(
    (element) => {
      if (!element) {
        // console.log(`🔍 [WidgetWrapper] detectWidgetType: No element provided`)
        return "simple"
      }

      const textContent = element.textContent || ""
      // console.log(`🔍 [WidgetWrapper] detectWidgetType for ${widgetId}: Checking text content:`, textContent.substring(0, 100))

      // Check for UnifiedBaseWidget - look for the blue header
      const hasBlueHeader =
        element.querySelector('[style*="background: #1a73e8"]') ||
        element.querySelector('[style*="background:#1a73e8"]') ||
        element.querySelector(".bg-blue-600")

      // console.log(`🔍 [WidgetWrapper] detectWidgetType: hasBlueHeader =`, hasBlueHeader)

      if (hasBlueHeader) {
        // console.log(`✅ [WidgetWrapper] Detected UNIFIED widget type for ${widgetId}`)
        return "unified"
      }

      // Check for Emergency Bridge specifically
      const isEmergencyBridge = textContent.includes("Emergency Bridge Analysis")
      // console.log(`🔍 [WidgetWrapper] detectWidgetType: isEmergencyBridge =`, isEmergencyBridge)

      if (isEmergencyBridge) {
        // console.log(`✅ [WidgetWrapper] Detected UNIFIED widget (Emergency Bridge) for ${widgetId}`)
        return "unified"
      }

      // Check for other widget types...
      const isHeightMeasurement =
        textContent.includes("Height measurement") ||
        element.querySelector('[data-role="dropdown"]') ||
        textContent.includes("Meters (m)") ||
        textContent.includes("Show Distance") ||
        element.classList.contains("w-64")

      if (isHeightMeasurement) {
        // console.log(`✅ [WidgetWrapper] Detected CUSTOM widget (Height) for ${widgetId}`)
        return "custom"
      }

      // console.log(`❓ [WidgetWrapper] Detected SIMPLE widget type for ${widgetId}`)
      return "simple"
    },
    [widgetId],
  )

  // Find widget element with multiple strategies
  const findWidgetElement = useCallback(() => {
    // console.log(`🔍 [WidgetWrapper] Finding widget element for ${widgetId}`)
    
    // Strategy 1: Look for element with data-widget-id
    const element = document.querySelector(`[data-widget-id="${widgetId}"]`)
    if (element) {
      // console.log(`✅ [WidgetWrapper] Found element via data-widget-id for ${widgetId}:`, element)
      return element
    }

    // console.log(`🔍 [WidgetWrapper] No element found via data-widget-id, trying other strategies...`)

    // Strategy 2: Look for absolutely positioned elements
    const absoluteElements = document.querySelectorAll('[style*="position: absolute"]')
    // console.log(`🔍 [WidgetWrapper] Found ${absoluteElements.length} absolutely positioned elements`)

    for (const el of absoluteElements) {
      // Skip if already has a widget ID
      if (el.getAttribute("data-widget-id")) {
        // console.log(`⏭️ [WidgetWrapper] Skipping element with existing widget ID:`, el.getAttribute("data-widget-id"))
        continue
      }

      const textContent = el.textContent || ""
      // console.log(`🔍 [WidgetWrapper] Checking element with text:`, textContent.substring(0, 50))

      const hasWidgetContent =
        textContent.includes("Emergency Bridge Analysis") ||
        textContent.includes("Building 2024") ||
        textContent.includes("Utility Mapping") ||
        textContent.includes("Get Location Tool") ||
        textContent.includes("Height measurement") ||
        textContent.includes("Area measurement") ||
        textContent.includes("Search Location") ||
        textContent.includes("Fire Incident Mapping") ||
        textContent.includes("Fire Emergency Analysis") ||
        textContent.includes("Building Information") ||
        textContent.includes("Renewable Energy") ||
        textContent.includes("Proximity Analysis") ||
        textContent.includes("Analysis Mode") ||
        textContent.includes("Advanced Options") ||
        textContent.includes("Dark Spot Analysis") ||
        textContent.includes("Square Meters") ||
        textContent.includes("Show Perimeter") ||
        el.querySelector('[style*="background: #1a73e8"]') ||
        el.querySelector(".bg-blue-600") ||
        el.querySelector('[data-role="dropdown"]') ||
        el.classList.contains("w-64")

      if (hasWidgetContent) {
        // console.log(`✅ [WidgetWrapper] Found widget element via content matching for ${widgetId}:`, el)
        el.setAttribute("data-widget-id", widgetId)
        return el
      }
    }

    // console.log(`❌ [WidgetWrapper] No widget element found for ${widgetId}`)
    return null
  }, [widgetId])

  // Setup position tracking
  const setupPositionTracking = useCallback(() => {
    // console.log(`🔧 [WidgetWrapper] Setting up position tracking for ${widgetId}`)
    
    const element = findWidgetElement()

    if (!element) {
      // console.log(`❌ [WidgetWrapper] No element found for position tracking: ${widgetId}`)
      return false
    }

    // console.log(`✅ [WidgetWrapper] Found element for position tracking:`, element)
    widgetElementRef.current = element

    const detectedType = detectWidgetType(element)
    setWidgetType(detectedType)
    // console.log(`🎯 [WidgetWrapper] Widget type detected: ${detectedType}`)

    // Get initial position
    const initialPosition = extractPositionFromElement(element)
    if (initialPosition) {
      lastPositionRef.current = initialPosition
      debouncedPositionUpdate(initialPosition)
      // console.log(`📍 [WidgetWrapper] Set initial position:`, initialPosition)
    }

    // IMPORTANT: Only setup MutationObserver for NON-UNIFIED widgets
    if (detectedType !== "unified") {
      // console.log(`🔍 [WidgetWrapper] Setting up MutationObserver for ${detectedType} widget`)
      
      if (observerRef.current) {
        observerRef.current.disconnect()
      }

      observerRef.current = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          if (mutation.type === "attributes" && mutation.attributeName === "style") {
            const newPosition = extractPositionFromElement(element)
            if (newPosition && JSON.stringify(newPosition) !== JSON.stringify(lastPositionRef.current)) {
              // console.log(`🔄 [WidgetWrapper] MutationObserver detected position change:`, newPosition)
              lastPositionRef.current = newPosition
              debouncedPositionUpdate(newPosition)
            }
          }
        })
      })

      observerRef.current.observe(element, {
        attributes: true,
        attributeFilter: ["style"],
        subtree: false,
      })
    } else {
      // console.log(`✅ [WidgetWrapper] Unified widget detected - will use onPositionChange callback instead of MutationObserver`)
    }

    return true
  }, [widgetId, findWidgetElement, detectWidgetType, extractPositionFromElement, debouncedPositionUpdate])

  // Position change handler for UnifiedBaseWidget
  const handleUnifiedPositionChange = useCallback(
    (newPos) => {
      // console.log(`🔄 [WidgetWrapper] Received position update from UnifiedBaseWidget for ${widgetId}:`, newPos)
      if (newPos && JSON.stringify(newPos) !== JSON.stringify(lastPositionRef.current)) {
        lastPositionRef.current = newPos
        debouncedPositionUpdate(newPos)
        // console.log(`✅ [WidgetWrapper] Updated position in toolbar context for ${widgetId}`)
      } else {
        // console.log(`⏭️ [WidgetWrapper] Position unchanged, skipping update for ${widgetId}`)
      }
    },
    [widgetId, debouncedPositionUpdate],
  )

  // Register widget effect
  useEffect(() => {
    // console.log(`🔧 [WidgetWrapper] Register widget effect triggered for ${widgetId}, enabled: ${enabled}`)
    
    if (!enabled) {
      if (isRegisteredRef.current) {
        // console.log(`🗑️ [WidgetWrapper] Unregistering widget ${widgetId}`)
        unregisterWidget(widgetId)
        isRegisteredRef.current = false
      }
      return
    }

    if (!isRegisteredRef.current) {
      // console.log(`📝 [WidgetWrapper] Registering widget ${widgetId} with dimensions ${width}x${height}`)
      
      registerWidget(widgetId, {
        width,
        height,
        position: lastPositionRef.current,
        priority,
      })

      isRegisteredRef.current = true

      // Try to setup position tracking immediately
      const setupSuccess = setupPositionTracking()
      // console.log(`🎯 [WidgetWrapper] Initial setup success: ${setupSuccess}`)

      if (!setupSuccess) {
        // console.log(`⏰ [WidgetWrapper] Initial setup failed, retrying with delays...`)
        // Retry with increasing delays
        const retryDelays = [100, 300, 500, 1000, 2000]
        retryDelays.forEach((delay, index) => {
          setTimeout(() => {
            if (widgetElementRef.current) {
              // console.log(`✅ [WidgetWrapper] Element already found, skipping retry ${index + 1}`)
              return
            }
            // console.log(`🔄 [WidgetWrapper] Retry ${index + 1} for ${widgetId}`)
            setupPositionTracking()
          }, delay)
        })
      }
    }
  }, [enabled, widgetId, width, height, priority, registerWidget, setupPositionTracking])

  // After first render, find and track widget elements that weren't captured by ref
  useEffect(() => {
    if (hasMountedRef.current) return;
    hasMountedRef.current = true;
    
    // console.log(`🔧 [WidgetWrapper] Post-mount effect for ${widgetId}`)
    
    // Try to find the widget if not already found via ref
    if (!widgetElementRef.current) {
      // console.log(`🔍 [WidgetWrapper] Element not found via ref, trying post-mount search...`)
      setTimeout(() => {
        setupPositionTracking();
      }, 100);
    } else {
      // console.log(`✅ [WidgetWrapper] Element already found via ref`)
    }
  }, [setupPositionTracking]);

  // Cleanup effect
  useEffect(() => {
    return () => {
      // console.log(`🧹 [WidgetWrapper] Cleanup for ${widgetId}`)
      
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current)
      }

      if (observerRef.current) {
        observerRef.current.disconnect()
      }

      if (isRegisteredRef.current) {
        unregisterWidget(widgetId)
        isRegisteredRef.current = false
      }
    }
  }, [widgetId, unregisterWidget])

  if (!enabled) {
    // console.log(`❌ [WidgetWrapper] Widget ${widgetId} is disabled, not rendering`)
    return null
  }

  // Get props for unified widgets - ALWAYS pass onPositionChange to potential unified widgets
  const unifiedProps = {
    onPositionChange: handleUnifiedPositionChange
  };

  // console.log(`🔧 [WidgetWrapper] Rendering child for ${widgetId} with props:`, unifiedProps)

  // Determine if we can safely pass a ref to this child
  const canTakeRef = typeof children.type === 'string' || 
                     (children.type.prototype && children.type.prototype.isReactComponent);

  // console.log(`🔧 [WidgetWrapper] Can take ref: ${canTakeRef}, child type:`, typeof children.type)

  // Choose approach based on component type
  if (canTakeRef) {
    // For DOM elements (div, span) and class components, we can pass refs directly
    const childProps = {
      "data-widget-id": widgetId,
      ref: (el) => {
        // console.log(`📎 [WidgetWrapper] Ref callback called for ${widgetId}:`, el)
        if (el && !widgetElementRef.current) {
          widgetElementRef.current = el;
          setTimeout(() => setupPositionTracking(), 100);
        }
      },
      ...unifiedProps
    };
    
    // console.log(`🔧 [WidgetWrapper] Cloning element with ref approach for ${widgetId}`)
    return React.cloneElement(children, childProps);
  } else {
    // For function components, just pass the required props without a ref
    // console.log(`🔧 [WidgetWrapper] Cloning element without ref for ${widgetId}`)
    return React.cloneElement(children, {
      "data-widget-id": widgetId,
      ...unifiedProps
    });
  }
}

export default WidgetWrapper
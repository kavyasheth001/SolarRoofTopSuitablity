"use client"

import { createContext, useContext, useState, useRef, useCallback, useEffect } from "react"

const ToolbarContext = createContext()

export const useToolbar = () => {
  const context = useContext(ToolbarContext)
  if (!context) {
    throw new Error("useToolbar must be used within ToolbarProvider")
  }
  return context
}

export const ToolbarProvider = ({ children }) => {
  // Toolbar positioning states
  const [toolbarPosition, setToolbarPosition] = useState({ right: 0 })
  const [displacedToolbarPosition, setDisplacedToolbarPosition] = useState(null)
  const [isToolbarAtOriginal, setIsToolbarAtOriginal] = useState(true)

  // Active widgets tracking - Use a ref to avoid unnecessary rerenders
  const [activeWidgets, setActiveWidgets] = useState(new Map())
  const activeWidgetsRef = useRef(new Map())

  // Refs for measurements
  const toolbarRef = useRef(null)
  const containerRef = useRef(null)

  // Constants
  const TOOLBAR_WIDTH = 0
  const TOOLBAR_HEIGHT = 200
  const TOOLBAR_BUFFER = 0
  const DEFAULT_TOOLBAR_RIGHT = 0

  // Keep activeWidgetsRef in sync with activeWidgets
  useEffect(() => {
    activeWidgetsRef.current = activeWidgets;
  }, [activeWidgets]);

  // Check if any widget overlaps with toolbar at current position
  const checkWidgetOverlapWithToolbar = useCallback(() => {
    if (!containerRef.current) {
      // console.log("🔍 [ToolbarContext] No container ref available")
      return false
    }

    const widgets = activeWidgetsRef.current;
    if (widgets.size === 0) {
      // console.log("🔍 [ToolbarContext] No active widgets to check")
      return false
    }

    // console.log(`🔍 [ToolbarContext] Checking overlap for ${widgets.size} widgets`)

    // Get container dimensions
    let containerWidth, containerHeight

    const containerRect = containerRef.current.getBoundingClientRect()

    containerWidth =
      containerRect.width || containerRef.current.offsetWidth || containerRef.current.clientWidth || window.innerWidth

    containerHeight =
      containerRect.height ||
      containerRef.current.offsetHeight ||
      containerRef.current.clientHeight ||
      window.innerHeight

    if (containerWidth === 0) {
      // console.log("🔍 [ToolbarContext] Container width is 0, skipping overlap check")
      return false
    }

    // console.log(`🔍 [ToolbarContext] Container dimensions: ${containerWidth}x${containerHeight}`)

    // Calculate GREEN ZONE bounds (the detection area)
    const greenZoneLeft = containerWidth - 52 // 60px wide green zone
    const greenZoneRight = containerWidth // Goes to edge
    const greenZoneTop = 0 // From top
    const greenZoneBottom = containerHeight // To bottom

    // console.log(`🔍 [ToolbarContext] Green zone: left=${greenZoneLeft}, right=${greenZoneRight}, top=${greenZoneTop}, bottom=${greenZoneBottom}`)

    // Check each active widget for overlap with GREEN ZONE
    for (const [widgetId, widget] of widgets) {
      const widgetPos = widget.position

      // console.log(`🔍 [ToolbarContext] Checking widget ${widgetId} at position:`, widgetPos)

      // Calculate widget bounds relative to container
      let widgetLeft, widgetRight

      if (widgetPos.right !== "auto" && widgetPos.right !== undefined) {
        // Widget positioned from right
        widgetLeft = containerWidth - widgetPos.right - widget.width
        widgetRight = containerWidth - widgetPos.right
        // console.log(`🔍 [ToolbarContext] Widget ${widgetId} positioned from right: left=${widgetLeft}, right=${widgetRight}`)
      } else if (widgetPos.left !== "auto" && widgetPos.left !== undefined) {
        // Widget positioned from left
        widgetLeft = widgetPos.left
        widgetRight = widgetPos.left + widget.width
        // console.log(`🔍 [ToolbarContext] Widget ${widgetId} positioned from left: left=${widgetLeft}, right=${widgetRight}`)
      } else {
        // console.log(`🔍 [ToolbarContext] Widget ${widgetId} has invalid positioning, skipping`)
        continue
      }

      const widgetTop = widgetPos.top
      const widgetBottom = widgetTop + widget.height

      // console.log(`🔍 [ToolbarContext] Widget ${widgetId} bounds: left=${widgetLeft}, right=${widgetRight}, top=${widgetTop}, bottom=${widgetBottom}`)

      // Check overlap with GREEN ZONE
      const isOverlapping = !(
        widgetRight < greenZoneLeft ||
        widgetLeft > greenZoneRight ||
        widgetBottom < greenZoneTop ||
        widgetTop > greenZoneBottom
      )

      // console.log(`🔍 [ToolbarContext] Widget ${widgetId} overlap check:`, {
      //   widgetRight_vs_greenZoneLeft: `${widgetRight} < ${greenZoneLeft} = ${widgetRight < greenZoneLeft}`,
      //   widgetLeft_vs_greenZoneRight: `${widgetLeft} > ${greenZoneRight} = ${widgetLeft > greenZoneRight}`,
      //   widgetBottom_vs_greenZoneTop: `${widgetBottom} < ${greenZoneTop} = ${widgetBottom < greenZoneTop}`,
      //   widgetTop_vs_greenZoneBottom: `${widgetTop} > ${greenZoneBottom} = ${widgetTop > greenZoneBottom}`,
      //   isOverlapping
      // })

      if (isOverlapping) {
        // console.log(`✅ [ToolbarContext] Widget ${widgetId} IS OVERLAPPING with green zone!`)
        return true
      }
    }

    // console.log(`❌ [ToolbarContext] No widgets overlapping with green zone`)
    return false
  }, [])

  // Calculate displaced position based on widget WIDTH PROP
  const calculateDisplacedPosition = useCallback(() => {
    const widgets = activeWidgetsRef.current;
    if (widgets.size === 0) return DEFAULT_TOOLBAR_RIGHT

    // Find the largest widget width
    let maxWidgetWidth = 0
    widgets.forEach((widget) => {
      maxWidgetWidth = Math.max(maxWidgetWidth, widget.width)
    })

    // console.log(`📏 [ToolbarContext] Max widget width: ${maxWidgetWidth}`)

    // Simple calculation: Widget width + buffer + toolbar width
    const simpleDisplacement = maxWidgetWidth + TOOLBAR_BUFFER + TOOLBAR_WIDTH

    // console.log(`📏 [ToolbarContext] Calculated displacement: ${simpleDisplacement}`)

    return simpleDisplacement
  }, [TOOLBAR_BUFFER, TOOLBAR_WIDTH])

  // Update toolbar position based on widget positions
  const updateToolbarPosition = useCallback(() => {
    // console.log(`🔄 [ToolbarContext] updateToolbarPosition called`)
    
    const widgets = activeWidgetsRef.current;
    if (widgets.size === 0) {
      // console.log(`🔄 [ToolbarContext] No widgets, moving toolbar to original position`)
      setToolbarPosition({ right: DEFAULT_TOOLBAR_RIGHT })
      setIsToolbarAtOriginal(true)
      setDisplacedToolbarPosition(null)
      return
    }

    // console.log(`🔄 [ToolbarContext] Checking ${widgets.size} active widgets`)

    // Calculate the displaced position based on widget WIDTH PROPS
    const calculatedDisplacement = calculateDisplacedPosition()

    // Set displaced position if not already set or if it needs updating
    if (!displacedToolbarPosition || displacedToolbarPosition !== calculatedDisplacement) {
      // console.log(`🔄 [ToolbarContext] Setting displaced position to: ${calculatedDisplacement}`)
      setDisplacedToolbarPosition(calculatedDisplacement)
    }

    // Check if any widget overlaps with GREEN ZONE
    const overlapWithGreenZone = checkWidgetOverlapWithToolbar()

    if (overlapWithGreenZone && isToolbarAtOriginal) {
      // console.log(`✅ [ToolbarContext] Moving toolbar RIGHT due to overlap`)
      setToolbarPosition({ right: calculatedDisplacement })
      setIsToolbarAtOriginal(false)
    } else if (!overlapWithGreenZone && !isToolbarAtOriginal) {
      // console.log(`✅ [ToolbarContext] Moving toolbar back to ORIGINAL position`)
      setToolbarPosition({ right: DEFAULT_TOOLBAR_RIGHT })
      setIsToolbarAtOriginal(true)
    } else {
      // console.log(`⏭️ [ToolbarContext] Toolbar position unchanged - overlap: ${overlapWithGreenZone}, isAtOriginal: ${isToolbarAtOriginal}`)
    }
  }, [
    displacedToolbarPosition,
    isToolbarAtOriginal,
    checkWidgetOverlapWithToolbar,
    calculateDisplacedPosition,
    DEFAULT_TOOLBAR_RIGHT
  ])

  // Register a widget when it opens
  const registerWidget = useCallback((widgetId, widgetData) => {
    // console.log(`📝 [ToolbarContext] Registering widget: ${widgetId}`, widgetData)
    
    setActiveWidgets((prev) => {
      // Prevent duplicate registration
      if (prev.has(widgetId)) {
        // console.log(`⚠️ [ToolbarContext] Widget ${widgetId} already registered`)
        return prev
      }

      const newMap = new Map(prev)
      const widgetInfo = {
        ...widgetData,
        position: widgetData.position || { top: 20, right: 20, left: "auto" },
        width: widgetData.width || 300,
        height: widgetData.height || 400,
        priority: widgetData.priority || 0,
      }

      newMap.set(widgetId, widgetInfo)
      // console.log(`✅ [ToolbarContext] Widget ${widgetId} registered successfully. Total widgets: ${newMap.size}`)
      
      // IMMEDIATE CHECK: Schedule immediate toolbar position update
      setTimeout(() => {
        // console.log(`⚡ [ToolbarContext] Running immediate toolbar position check for new widget: ${widgetId}`)
        updateToolbarPosition()
      }, 100) // Small delay to ensure DOM is ready
      
      return newMap
    })
  }, [updateToolbarPosition])

  // Unregister a widget when it closes
  const unregisterWidget = useCallback((widgetId) => {
    // console.log(`🗑️ [ToolbarContext] Unregistering widget: ${widgetId}`)
    
    setActiveWidgets((prev) => {
      if (!prev.has(widgetId)) {
        // console.log(`⚠️ [ToolbarContext] Widget ${widgetId} not found for unregistration`)
        return prev
      }

      const newMap = new Map(prev)
      newMap.delete(widgetId)
      // console.log(`✅ [ToolbarContext] Widget ${widgetId} unregistered. Remaining widgets: ${newMap.size}`)
      return newMap
    })
  }, [])

  // Update widget position
  const updateWidgetPosition = useCallback((widgetId, newPosition) => {
    // console.log(`📍 [ToolbarContext] Updating position for widget ${widgetId}:`, newPosition)
    
    setActiveWidgets((prev) => {
      const newMap = new Map(prev)
      const widget = newMap.get(widgetId)

      if (widget) {
        const updatedWidget = { ...widget, position: newPosition }
        newMap.set(widgetId, updatedWidget)
        // console.log(`✅ [ToolbarContext] Widget ${widgetId} position updated`)
      } else {
        // console.log(`⚠️ [ToolbarContext] Widget ${widgetId} not found for position update`)
      }

      return newMap
    })
  }, [])

  // Effect to handle toolbar positioning when widgets change
  useEffect(() => {
    // console.log(`🔄 [ToolbarContext] activeWidgets changed, scheduling toolbar position update`)
    
    const timeoutId = setTimeout(() => {
      updateToolbarPosition()
    }, 100)

    return () => clearTimeout(timeoutId)
  }, [activeWidgets, updateToolbarPosition])

  // Track position changes separately with a more stable dependency
  const [widgetPositionsChanged, setWidgetPositionsChanged] = useState(0)
  
  // Update widget positions tracker when a position changes
  useEffect(() => {
    if (activeWidgets.size > 0) {
      const trackPositionChanges = () => {
        setWidgetPositionsChanged(prev => prev + 1)
      }
      
      // Set up a timeout to batch position updates
      const timeoutId = setTimeout(trackPositionChanges, 50)
      return () => clearTimeout(timeoutId)
    }
  }, [activeWidgets])
  
  // Update toolbar when widget positions change
  useEffect(() => {
    if (widgetPositionsChanged > 0) {
      // console.log(`🔄 [ToolbarContext] Widget positions changed (${widgetPositionsChanged}), updating toolbar`)
      updateToolbarPosition()
    }
  }, [widgetPositionsChanged, updateToolbarPosition])

  const value = {
    // States
    toolbarPosition,
    isToolbarAtOriginal,
    activeWidgets,
    displacedToolbarPosition,

    // Refs
    toolbarRef,
    containerRef,

    // Methods
    registerWidget,
    unregisterWidget,
    updateWidgetPosition,
    updateToolbarPosition,

    // Constants
    TOOLBAR_WIDTH,
    TOOLBAR_HEIGHT,
    TOOLBAR_BUFFER,
    DEFAULT_TOOLBAR_RIGHT,
  }

  return <ToolbarContext.Provider value={value}>{children}</ToolbarContext.Provider>
}
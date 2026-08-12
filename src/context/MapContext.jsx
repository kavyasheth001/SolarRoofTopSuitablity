"use client"

// MapContext.jsx
import { createContext, useContext, useState, useRef, useCallback, useMemo } from "react"
import * as mapManager from '../utils/mapManager'

const MapContext = createContext()

export const MapProvider = ({ children }) => {
  const [webscene, setWebscene] = useState(null)
  const [sceneView, setSceneView] = useState(null)
  const [showBasemapGallery, setShowBasemapGallery] = useState(false)
  const [showQuickAccess, setShowQuickAccess] = useState(false)
  const [showTools, setShowTools] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)
  const [isPanoLayerTemporarilyEnabled, setIsPanoLayerTemporarilyEnabled] = useState(false)

  // Toilet density analysis
  const [isToiletEnabled, setIsToiletEnabled] = useState(false)
  const [showImpactOptionsTD, setShowImpactOptionsTD] = useState(false)

  const [draggedCoordinates, setDraggedCoordinates] = useState(null)
  const [isPanoramaEnabled, setIsPanoramaEnabled] = useState(false)
  const [panoramaType, setPanoramaType] = useState("closest")

  const toiletClearFunctionRef = useRef(null)
  const impactClearFunctionRef = useRef(null)

  // Quick access fn registry (ref) + states (state so header re-renders)
  const quickAccessButtonFunctionsRef = useRef({})
  const [quickAccessButtonStates, setQuickAccessButtonStates] = useState({})
  const panoLayerToggleFunctionRef = useRef(null)

  // ---------- Stable callbacks ----------
  const toggleBasemapGallery = useCallback(() => {
    setShowBasemapGallery((prev) => !prev)
    setShowTools(false)
  }, [])

  const toggleQuickAccess = useCallback(() => {
    setShowQuickAccess((prev) => !prev)
    setShowBasemapGallery(false)
    setShowTools(false)
  }, [])

  const toggleTools = useCallback(() => {
    setShowBasemapGallery(false)
    setIsExpanded((prev) => !prev)
  }, [])

  const closeAllPanels = useCallback(() => {
    setShowBasemapGallery(false)
    setShowQuickAccess(false)
    setShowTools(false)
    setIsExpanded(false)
  }, [])

  const registerToiletClearFunction = useCallback((clearFunction) => {
    toiletClearFunctionRef.current = clearFunction
  }, [])

  const registerImpactClearFunction = useCallback((clearFunction) => {
    impactClearFunctionRef.current = clearFunction
  }, [])

  const setToiletEnabled = useCallback((enabled) => {
    if (!enabled && toiletClearFunctionRef.current) toiletClearFunctionRef.current()
    setIsToiletEnabled(enabled)
  }, [])

  const setImpactEnabled = useCallback((enabled) => {
    if (!enabled && impactClearFunctionRef.current) impactClearFunctionRef.current()
    setShowImpactOptionsTD(enabled)
  }, [])


 const handlePanoramaDrop = useCallback((coordinates) => {
  setDraggedCoordinates(coordinates)
}, [])

  const setPanoramaEnabledState = useCallback((enabled) => {
    setIsPanoramaEnabled(enabled)
    if (!enabled) {
      setPanoramaType(null)
      setDraggedCoordinates(null)
    }
  }, [])

  // ---- Quick Access registration (STABLE) ----
  const registerQuickAccessButtonFunction = useCallback((buttonId, func) => {
    quickAccessButtonFunctionsRef.current[buttonId] = func
  }, [])

  // Guard identical updates to prevent render storms
  const registerQuickAccessButtonState = useCallback((buttonId, state) => {
    setQuickAccessButtonStates((prev) => {
      const prevVal = prev[buttonId] ?? false
      if (prevVal === state) return prev // no change -> no render
      return { ...prev, [buttonId]: state }
    })
  }, [])

  const callQuickAccessButtonFunction = useCallback((buttonId, ...args) => {
    const func = quickAccessButtonFunctionsRef.current[buttonId]
    if (func) return func(...args)
    console.warn(`No function registered for button: ${buttonId}`)
  }, [])

  const getQuickAccessButtonState = useCallback(
    (buttonId) => {
      // Never “active” for one-clickers
      const oneClickButtons = ["zoomExtent", "clearAll", "topView"]
      if (oneClickButtons.includes(buttonId)) return false
      return !!quickAccessButtonStates[buttonId]
    },
    [quickAccessButtonStates],
  )

  const registerPanoLayerToggleFunction = useCallback((toggleFunction) => {
  panoLayerToggleFunctionRef.current = toggleFunction
}, [])

const enablePanoLayerTemporarily = useCallback(() => {
  setIsPanoLayerTemporarilyEnabled(true)
  if (panoLayerToggleFunctionRef.current) {
    panoLayerToggleFunctionRef.current(true)
  }
}, [])

const disablePanoLayerTemporarily = useCallback(() => {
  setIsPanoLayerTemporarilyEnabled(false)
  if (panoLayerToggleFunctionRef.current) {
    panoLayerToggleFunctionRef.current(false)
  }
}, [])
  // ---- mapManager delegates (stable — no state deps) ----
  const initializeMap = useCallback((containerDiv, onViewReady, onMapReady) => {
    return mapManager.initialize(containerDiv, onViewReady, onMapReady)
  }, [])

  const attachMap = useCallback((containerDiv) => {
    return mapManager.attachTo(containerDiv)
  }, [])

  const detachMap = useCallback(() => {
    mapManager.detach()
  }, [])

  // Memoize context value to freeze object identity unless deps change
  const value = useMemo(
    () => ({
      showBasemapGallery,
      showQuickAccess,
      showTools,
      isExpanded,
      isToiletEnabled,
      showImpactOptionsTD,
      toggleBasemapGallery,
      toggleQuickAccess,
      toggleTools,
      closeAllPanels,
      setShowBasemapGallery,
      setIsExpanded,
      setToiletEnabled,
      setImpactEnabled,
      setIsToiletEnabled,
      setShowImpactOptionsTD,
      registerToiletClearFunction,
      registerImpactClearFunction,
      sceneView,
      setSceneView,
      webscene,
      setWebscene,
      registerQuickAccessButtonFunction,
      registerQuickAccessButtonState,
      callQuickAccessButtonFunction,
      getQuickAccessButtonState,
      quickAccessButtonStates, // optional: for debugging
      draggedCoordinates,
      isPanoramaEnabled,
      panoramaType,
      handlePanoramaDrop,
      setPanoramaEnabledState,
      setPanoramaType,
      isPanoLayerTemporarilyEnabled,
      registerPanoLayerToggleFunction,
      initializeMap,
      attachMap,
      detachMap,
      enablePanoLayerTemporarily,
      disablePanoLayerTemporarily,
    }),
    [
      showBasemapGallery,
      showQuickAccess,
      showTools,
      isExpanded,
      isToiletEnabled,
      showImpactOptionsTD,
      toggleBasemapGallery,
      toggleQuickAccess,
      toggleTools,
      closeAllPanels,
      setToiletEnabled,
      setImpactEnabled,
      sceneView,
      webscene,
      registerQuickAccessButtonFunction,
      registerQuickAccessButtonState,
      callQuickAccessButtonFunction,
      getQuickAccessButtonState,
      quickAccessButtonStates,
      draggedCoordinates,
      isPanoramaEnabled,
      panoramaType,
      handlePanoramaDrop,
      setPanoramaEnabledState,
    ],
  )

  return <MapContext.Provider value={value}>{children}</MapContext.Provider>
}

export const useMap = () => {
  const ctx = useContext(MapContext)
  if (!ctx) throw new Error("useMap must be used within a MapProvider")
  return ctx
}

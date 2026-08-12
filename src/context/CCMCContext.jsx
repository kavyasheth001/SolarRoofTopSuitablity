import React, { createContext, useContext, useMemo, useState } from "react"

const MapCtx = createContext(null)

export function CCMCMapProvider({ children }) {
  const [map, setMap] = useState(null)
  const [mapView, setMapView] = useState(null)

  const value = useMemo(
    () => ({
      map,
      mapView,
      setMap,
      setMapView,
      reset: () => {
        setMap(null)
        setMapView(null)
      },
    }),
    [map, mapView]
  )

  return <MapCtx.Provider value={value}>{children}</MapCtx.Provider>
}

export function useMapStore() {
  const ctx = useContext(MapCtx)
  if (!ctx) throw new Error("useMapStore must be used inside CCMCMapProvider")
  return ctx
}

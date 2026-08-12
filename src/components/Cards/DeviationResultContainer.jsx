"use client"

import React, { useRef, useState, useEffect, useCallback, useMemo, memo } from "react"
import { List, ArrowBigLeft, ArrowBigRight } from "lucide-react"
import Graphic from "@arcgis/core/Graphic"

// ============================================
// CONSTANTS
// ============================================
const ITEM_HEIGHT = 320
const CONTAINER_HEIGHT = 340
const BLINK_INTERVAL_MS = 500

// ============================================
// UTILITY FUNCTIONS
// ============================================
const formatValue = (value) => {
  if (typeof value === "number") {
    return Number.isInteger(value) ? value : value.toFixed(2)
  }
  return value || "N/A"
}

/**
 * Creates a blinking graphic for feature highlight
 */
const createBlinkingGraphic = (geometry, isRed = true) => {
  return new Graphic({
    geometry,
    symbol: {
      type: "simple-fill",
      color: isRed ? [255, 0, 0, 0.8] : [0, 191, 255, 0.8],
      outline: {
        color: isRed ? [255, 0, 0, 1] : [0, 191, 255, 1],
        width: 3,
      },
    },
  })
}

// ============================================
// VIRTUALIZATION HOOK
// ============================================
const useVirtualization = ({ itemCount, itemHeight, containerHeight, overscan = 3 }) => {
  const [scrollTop, setScrollTop] = useState(0)

  const visibleRange = useMemo(() => {
    const start = Math.floor(scrollTop / itemHeight)
    const end = Math.min(itemCount - 1, Math.ceil((scrollTop + containerHeight) / itemHeight))
    return {
      start: Math.max(0, start - overscan),
      end: Math.min(itemCount - 1, end + overscan),
    }
  }, [scrollTop, itemHeight, containerHeight, itemCount, overscan])

  return {
    visibleRange,
    totalHeight: itemCount * itemHeight,
    setScrollTop,
  }
}

// ============================================
// BLINK EFFECT HOOK
// ============================================
const useBlinkEffect = (view) => {
  const blinkIntervalRef = useRef(null)

  const stopBlinkEffect = useCallback(() => {
    if (blinkIntervalRef.current) {
      clearInterval(blinkIntervalRef.current)
      blinkIntervalRef.current = null
    }
    // Remove any existing blink graphics
    if (view?.graphics) {
      const blinkGraphics = view.graphics.items.filter(
        (g) => g?.symbol?.type === "simple-fill"
      )
      blinkGraphics.forEach((g) => view.graphics.remove(g))
    }
  }, [view])

  const startBlinkEffect = useCallback((feature) => {
    if (!view || !feature?.geometry) return

    stopBlinkEffect()

    let isRed = true
    blinkIntervalRef.current = setInterval(() => {
      // Remove existing blink graphic
      const existingGraphic = view.graphics.items.find(
        (g) => g?.symbol?.type === "simple-fill"
      )
      if (existingGraphic) {
        view.graphics.remove(existingGraphic)
      }

      // Add new blinking graphic
      const blinkingGraphic = createBlinkingGraphic(feature.geometry, isRed)
      view.graphics.add(blinkingGraphic)

      isRed = !isRed
    }, BLINK_INTERVAL_MS)
  }, [view, stopBlinkEffect])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopBlinkEffect()
    }
  }, [stopBlinkEffect])

  return { startBlinkEffect, stopBlinkEffect }
}

// ============================================
// DEVIATION CARD COMPONENT
// ============================================
const DeviationCard = memo(({
  feature,
  index,
  totalCount,
  isActive,
  isSelected,
  config = {},
}) => {
  const { attributes } = feature
  const [showAddress, setShowAddress] = useState(false)
  const {
    leftColumnLabel = "Left Column",
    rightColumnLabel = "Right Column",
    leftColumnField = "left_field",
    rightColumnField = "right_field",
    criteriaLabel = "Criteria",
    additionalColumns = [],
  } = config

  const cardClasses = `
    rounded-lg bg-gray-50 overflow-hidden transition-all duration-300 ease-out
    h-[300px] flex flex-col cursor-pointer
    ${isSelected
      ? "shadow-[0_4px_20px_rgba(0,191,255,0.5)] border-2 border-cyan-400 scale-[1.02]"
      : isActive
        ? "shadow-[0_4px_20px_rgba(22,119,255,0.3)] border-2 border-blue-500 -translate-y-0.5"
        : "shadow-md border border-gray-200"
    }
  `

  useEffect(() => {
    console.log("Attributes", attributes);
  }, [])
  

  return (
    <div className={cardClasses}>
      {/* Card Header */}
      <div className="bg-blue-500 text-white px-3 py-2.5 text-sm font-semibold rounded-t-md">
        Result {index + 1} of {totalCount.toLocaleString()}
      </div>

      {/* Card Content */}
      <div className="p-3 flex-1 overflow-auto">

         {/* SAC Number */}
        <div className="mb-2 text-xs leading-relaxed">
          <span className="font-semibold text-gray-700">SAC Number: </span>
          <span className="text-gray-500">
            {attributes.SAC_number || attributes.sac_number || attributes.SACNO || "N/A"}
          </span>
        </div>

          <div className="mb-2 text-xs leading-relaxed">
  <span className="font-semibold text-gray-700">CTS Number: </span>
  <span className="text-gray-500">
    {attributes.cts_no ?? attributes.CTS_No ?? attributes.CTSNO ?? attributes.CTS_NO ?? attributes.ctsno ?? "N/A"}
  </span>
</div>

        {/* Name and Ward */}
        <div className="mb-2 text-xs leading-relaxed">
          <span className="font-semibold text-gray-700">Name: </span>
          <span className="text-gray-500">{attributes.name || "N/A"}</span>
          <span className="float-right">
            <span className="font-semibold text-gray-700">Ward: </span>
            <span className="text-gray-500">{attributes.ward_no || attributes.ward_name || "N/A"}</span>
          </span>
        </div>

       

        {/* Conditional fields */}
        {attributes.residential >= 0 && (
          <div className="mb-2 text-xs leading-relaxed">
            <span className="font-semibold text-gray-700">Residential: </span>
            <span className="text-gray-500">{attributes.residential}</span>
          </div>
        )}

        {attributes.totalunit >= 0 && (
          <div className="mb-2 text-xs leading-relaxed">
            <span className="font-semibold text-gray-700">Total Unit: </span>
            <span className="text-gray-500">{attributes.total_unit}</span>
          </div>
        )}

        {/* Address Toggle */}
        <div
          className={`mb-2 text-xs leading-relaxed cursor-pointer overflow-hidden ${showAddress ? "" : "max-h-5"}`}
          onClick={(e) => {
            e.stopPropagation()
            setShowAddress(!showAddress)
          }}
          title={showAddress ? "Click to hide address" : "Click to show address"}
        >
          <span className="font-semibold text-gray-700">Address: </span>
          <span className="text-gray-500">
            {showAddress ? attributes.address || "N/A" : "View more..."}
          </span>
        </div>

        {/* Area */}
        {attributes.Area_sq_m && (
          <div className="mb-2 text-xs leading-relaxed">
            <span className="font-semibold text-gray-700">Area: </span>
            <span className="text-gray-500">{formatValue(attributes.Area_sq_m)} sq.m</span>
          </div>
        )}

        {/* Dynamic Additional Fields */}
        {additionalColumns.map((col, idx) =>
          attributes[col.field] && (
            <div key={idx} className="mb-2 text-xs leading-relaxed">
              <span className="font-semibold text-gray-700">{col.label}: </span>
              <span className="text-gray-500">{formatValue(attributes[col.field])}</span>
            </div>
          )
        )}

        {/* Criteria Table */}
        <table className="w-full border-collapse mt-3">
          <thead>
            <tr>
              <th className="p-1.5 text-center text-[11px] font-semibold bg-teal-500 text-white border border-teal-500">
                {criteriaLabel}
              </th>
              <th className="p-1.5 text-center text-[11px] font-semibold bg-teal-500 text-white border border-teal-500">
                {leftColumnLabel === "Area 2018" ? `${leftColumnLabel} (Sq. m):` : leftColumnLabel}
              </th>
              <th className="p-1.5 text-center text-[11px] font-semibold bg-teal-500 text-white border border-teal-500">
                {rightColumnLabel === "Area 2024" ? `${rightColumnLabel} (Sq. m):` : rightColumnLabel}
              </th>
              {additionalColumns.map((col, idx) => (
                <th key={idx} className="p-1.5 text-center text-[11px] font-semibold bg-teal-500 text-white border border-teal-500">
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="p-1.5 text-center text-[11px] font-semibold bg-blue-50 border border-gray-200">
                {attributes.commercial >= 0 ? attributes.commercial : criteriaLabel}
              </td>
              <td className="p-1.5 text-center text-[11px] font-semibold bg-blue-50 border border-gray-200">
                {formatValue(attributes[leftColumnField])}
              </td>
              <td className="p-1.5 text-center text-[11px] font-semibold bg-blue-50 border border-gray-200">
                {formatValue(attributes[rightColumnField])}
              </td>
              {additionalColumns.map((col, idx) => (
                <td key={idx} className="p-1.5 text-center text-[11px] font-semibold bg-blue-50 border border-gray-200">
                  {formatValue(attributes[col.field])}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
})

DeviationCard.displayName = "DeviationCard"

// ============================================
// MAIN COMPONENT
// ============================================
const DeviationResultContainer = ({
  data,
  view,
  onClose,
  handleResultContainerMode,
  cardConfig = {},
  title = "Deviation Reports",
  initialPosition,
}) => {
  // Refs
  const containerRef = useRef(null)
  const scrollContainerRef = useRef(null)
  const isScrollingProgrammatically = useRef(false)
  const scrollSyncTimeoutRef = useRef(null)

  // State
  const [isMinimized, setIsMinimized] = useState(false)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [selectedFeatureId, setSelectedFeatureId] = useState(null)
  const [position, setPosition] = useState({
    top: initialPosition?.top ?? 50,
    left: initialPosition?.left ?? 50,
    right: initialPosition?.right ?? null,
  })

  // Derived values
  const features = data?.features || []
  const itemCount = features.length

  // Custom hooks
  const { visibleRange, totalHeight, setScrollTop } = useVirtualization({
    itemCount,
    itemHeight: ITEM_HEIGHT,
    containerHeight: CONTAINER_HEIGHT,
  })

  const { startBlinkEffect, stopBlinkEffect } = useBlinkEffect(view)

  // Reset selection when data changes
  useEffect(() => {
    setSelectedFeatureId(null)
    setCurrentIndex(0)
    stopBlinkEffect()
  }, [data, stopBlinkEffect])

  // Cleanup scroll sync timeout on unmount
  useEffect(() => {
    return () => {
      if (scrollSyncTimeoutRef.current) {
        clearTimeout(scrollSyncTimeoutRef.current)
      }
    }
  }, [])

  // Smooth scroll to current index when it changes
  useEffect(() => {
    const container = scrollContainerRef.current
    if (!container) return

    const targetScrollTop = currentIndex * ITEM_HEIGHT

    // Always update virtualization scroll position to keep visible range in sync
    setScrollTop(targetScrollTop)

    const currentScrollTop = container.scrollTop
    const itemTop = currentIndex * ITEM_HEIGHT
    const itemBottom = itemTop + ITEM_HEIGHT
    const visibleBottom = currentScrollTop + CONTAINER_HEIGHT

    // Only animate scroll if item is not fully visible
    if (itemTop < currentScrollTop || itemBottom > visibleBottom) {
      isScrollingProgrammatically.current = true
      container.scrollTo({ top: targetScrollTop, behavior: "smooth" })
      const timeout = setTimeout(() => {
        isScrollingProgrammatically.current = false
      }, 500)
      return () => clearTimeout(timeout)
    }
  }, [currentIndex, setScrollTop])

  // Drag handler
  const onDragStart = useCallback((e) => {
    e.preventDefault()
    if (e.target.dataset.role === "close-button" || e.target.tagName === "BUTTON") return

    const container = containerRef.current
    if (!container) return

    const parent = container.offsetParent
    if (!parent) return

    const parentRect = parent.getBoundingClientRect()
    const rect = container.getBoundingClientRect()
    const offsetX = e.clientX - rect.left
    const offsetY = e.clientY - rect.top

    const onMouseMove = (moveEvent) => {
      const newLeft = Math.max(0, Math.min(moveEvent.clientX - parentRect.left - offsetX, parentRect.width - rect.width))
      const newTop = Math.max(0, Math.min(moveEvent.clientY - parentRect.top - offsetY, parentRect.height - rect.height))
      setPosition({ top: newTop, left: newLeft, right: null })
    }

    const onMouseUp = () => {
      document.removeEventListener("mousemove", onMouseMove)
      document.removeEventListener("mouseup", onMouseUp)
    }

    document.addEventListener("mousemove", onMouseMove)
    document.addEventListener("mouseup", onMouseUp)
  }, [])

  // Scroll handler with sync
  const onScroll = useCallback((e) => {
    if (isScrollingProgrammatically.current) return

    const scrollTop = e.target.scrollTop
    setScrollTop(scrollTop)

    if (scrollSyncTimeoutRef.current) clearTimeout(scrollSyncTimeoutRef.current)
    scrollSyncTimeoutRef.current = setTimeout(() => {
      const newIndex = Math.max(0, Math.min(itemCount - 1, Math.round(scrollTop / ITEM_HEIGHT)))
      if (newIndex !== currentIndex) setCurrentIndex(newIndex)
    }, 100)
  }, [currentIndex, itemCount, setScrollTop])

  // Card click handler with blink effect and zoom
  const handleCardClick = useCallback((feature, index) => {
    if (!feature || !view) return

    const featureId = feature.attributes?.OBJECTID || feature.attributes?.objectId || index
    const isAlreadySelected = selectedFeatureId === featureId

    if (isAlreadySelected) {
      // Deselect - stop blink and clear highlight
      setSelectedFeatureId(null)
      stopBlinkEffect()
    } else {
      // Select - start blink and zoom to feature
      setSelectedFeatureId(featureId)
      setCurrentIndex(index)

      // Start blink effect
      startBlinkEffect(feature)

      // Zoom to feature
      if (feature.geometry) {
        view.goTo(
          {
            target: feature.geometry,
            zoom: 19,
            tilt: 0,
            padding: 40,
          },
          { duration: 1000 }
        )
      }
    }
  }, [view, selectedFeatureId, startBlinkEffect, stopBlinkEffect])

  // Navigation handlers
  const handlePrev = useCallback(() => {
    if (currentIndex > 0) setCurrentIndex(currentIndex - 1)
  }, [currentIndex])

  const handleNext = useCallback(() => {
    if (currentIndex < itemCount - 1) setCurrentIndex(currentIndex + 1)
  }, [currentIndex, itemCount])

  // Handle close with cleanup
  const handleClose = useCallback(() => {
    stopBlinkEffect()
    onClose?.()
  }, [stopBlinkEffect, onClose])

  // Early return if no data
  if (!data || !features.length) return null

  // Build visible items for virtualization
  const visibleItems = []
  for (let i = visibleRange.start; i <= visibleRange.end && i < itemCount; i++) {
    const feature = features[i]
    const featureId = feature.attributes?.OBJECTID || feature.attributes?.objectId || i
    const isSelected = selectedFeatureId === featureId
    const isActive = i === currentIndex

    visibleItems.push(
      <div
        key={i}
        data-card
        data-index={i}
        className="absolute left-0 right-0 p-2.5 cursor-pointer transition-all duration-300 ease-out"
        style={{
          top: `${i * ITEM_HEIGHT}px`,
          height: `${ITEM_HEIGHT}px`,
        }}
        onClick={() => handleCardClick(feature, i)}
      >
        <DeviationCard
          feature={feature}
          index={i}
          totalCount={itemCount}
          isActive={isActive}
          isSelected={isSelected}
          config={cardConfig}
        />
      </div>
    )
  }

  const positionStyle = {
    top: `${position.top}px`,
    ...(position.left !== null ? { left: `${position.left}px` } : { right: `${position.right}px` }),
  }

  return (
    <div
      ref={containerRef}
      className={`
        absolute w-[380px] bg-white rounded-xl
        shadow-[0_8px_32px_rgba(0,0,0,0.24),0_4px_16px_rgba(0,0,0,0.12)]
        z-[1001] flex flex-col overflow-hidden border border-gray-200
        font-sans backdrop-blur-[10px] transition-[height] duration-400 ease-out
        ${isMinimized ? "h-12" : "h-[470px]"}
      `}
      style={positionStyle}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between bg-gradient-to-br from-blue-600 to-blue-700 px-4 py-3 cursor-move select-none min-h-[48px] shrink-0 rounded-t-xl"
        onMouseDown={onDragStart}
      >
        <button
          className="bg-transparent border-none text-white cursor-pointer text-base font-bold p-1 min-w-6 h-6 flex items-center justify-center rounded transition-colors hover:bg-white/20"
          onClick={(e) => { e.stopPropagation(); setIsMinimized(!isMinimized) }}
          title={isMinimized ? "Expand" : "Minimize"}
        >
          {isMinimized ? "▼" : "▲"}
        </button>

        <div className="flex-1 text-center">
          <div className="text-base text-white font-semibold drop-shadow-sm">
            {title}
          </div>
          <div className="text-xs text-white/80 my-2">
            {itemCount.toLocaleString()} records
          </div>
        </div>

        <div className="flex justify-center items-center gap-x-4">
          <button
            className="bg-transparent border-none text-white cursor-pointer text-base font-bold p-1 min-w-6 h-6 flex items-center justify-center rounded transition-colors hover:bg-white/20"
            onClick={() => handleResultContainerMode?.()}
            title="List View"
          >
            <List />
          </button>
          <button
            className="bg-transparent border-none text-white cursor-pointer text-base font-bold p-1 min-w-6 h-6 flex items-center justify-center rounded transition-colors hover:bg-white/20"
            onClick={(e) => { e.stopPropagation(); handleClose() }}
            title="Close"
          >
            ✖
          </button>
        </div>
      </div>

      {/* Content - Virtualized Scroll Container */}
      {!isMinimized && (
        <>
          <div
            ref={scrollContainerRef}
            onScroll={onScroll}
            className="flex-1 relative overflow-y-auto overflow-x-hidden scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-transparent"
            style={{ height: `${CONTAINER_HEIGHT}px` }}
          >
            {/* Virtual spacer */}
            <div className="relative" style={{ height: `${totalHeight}px` }}>
              {visibleItems}
            </div>
          </div>

          {/* Navigation Footer */}
          <div className="bg-gradient-to-br from-gray-50 to-gray-100 px-4 py-3 flex justify-between items-center border-t border-gray-200 rounded-b-xl shrink-0 min-h-[60px]">
            <button
              onClick={handlePrev}
              disabled={currentIndex === 0}
              className={`
                w-9 h-9 rounded-full border-none flex items-center justify-center text-lg transition-all duration-200
                ${currentIndex === 0
                  ? "bg-transparent text-gray-300 cursor-not-allowed"
                  : "bg-gray-100 text-gray-600 cursor-pointer hover:bg-gray-200 hover:text-gray-800"
                }
              `}
            >
              <ArrowBigLeft size={20} />
            </button>

            <div className="text-center">
              <span className="font-semibold text-gray-600 text-sm bg-white px-3 py-1 rounded-xl border border-gray-200">
                {currentIndex + 1} / {itemCount.toLocaleString()}
              </span>
            </div>

            <button
              onClick={handleNext}
              disabled={currentIndex === itemCount - 1}
              className={`
                w-9 h-9 rounded-full border-none flex items-center justify-center text-lg transition-all duration-200
                ${currentIndex === itemCount - 1
                  ? "bg-transparent text-gray-300 cursor-not-allowed"
                  : "bg-gray-100 text-gray-600 cursor-pointer hover:bg-gray-200 hover:text-gray-800"
                }
              `}
            >
              <ArrowBigRight size={20} />
            </button>
          </div>
        </>
      )}
    </div>
  )
}

export default DeviationResultContainer

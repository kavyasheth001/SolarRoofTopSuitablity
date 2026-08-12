"use client"

import { useState, useCallback } from "react"

const useScrollNavigation = () => {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [dataLength, setDataLength] = useState(0)

  const registerDataLength = useCallback(
    (length) => {
      setDataLength(length)
      // Reset to first card if current index is out of bounds
      if (length > 0 && currentIndex >= length) {
        setCurrentIndex(0)
      }
    },
    [currentIndex],
  )

  const handlePrev = useCallback(() => {
    setCurrentIndex((prev) => Math.max(prev - 1, 0))
  }, [])

  const handleNext = useCallback(() => {
    setCurrentIndex((prev) => Math.min(prev + 1, dataLength - 1))
  }, [dataLength])

  const goToCard = useCallback(
    (index) => {
      if (index >= 0 && index < dataLength) {
        setCurrentIndex(index)
      }
    },
    [dataLength],
  )

  // Add a method to sync index from scroll
  const syncIndexFromScroll = useCallback(
    (index) => {
      if (index >= 0 && index < dataLength && index !== currentIndex) {
        setCurrentIndex(index)
      }
    },
    [dataLength, currentIndex],
  )

  return {
    currentIndex,
    setCurrentIndex,
    handlePrev,
    handleNext,
    goToCard,
    registerDataLength,
    syncIndexFromScroll, // Export the new sync method
    dataLength,
  }
}

export default useScrollNavigation

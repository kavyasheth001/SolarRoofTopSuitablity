import { useRef, useState, useCallback, memo } from "react"

const ToolLayout = memo(function ToolLayout({ handleClose, toolName, children, containerStyle, initialPosition ,maxHeight}) {
  const contentDivRef = useRef(null)

  const [position, setPosition] = useState({
    top: initialPosition? initialPosition.top : 68,
    left: null,
    right: initialPosition? initialPosition.right : 60,
  })

  const [isBodyVisible, setIsBodyVisible] = useState(true)

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

    // clamp X so it doesn’t go outside
    if (newLeft < 0) newLeft = 0
    if (newLeft + rect.width > parentRect.width) {
      newLeft = parentRect.width - rect.width
    }

    // clamp Y so it doesn’t go outside
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

  return (
    <>
      <div
        ref={contentDivRef}
        className="absolute w-[340px]  bg-white text-blue-600 font-sans rounded-xl overflow-hidden shadow-lg z-[99]"
        style={positionStyle}
      >
        <div className="flex items-center justify-between bg-primary-blue px-3 py-2 cursor-move" onMouseDown={onDragStart}>
          <button
            className="bg-transparent border-none text-white cursor-pointer hover:opacity-80 transition-opacity"
            onClick={toggleBodyVisibility}
            aria-label={isBodyVisible ? "Collapse" : "Expand"}
          >
            {isBodyVisible ? "▲" : "▼"}
          </button>

          <div className="text-base text-white font-medium">{toolName}</div>

          <button
            data-role="close-button"
            className="bg-transparent border-none text-white cursor-pointer hover:opacity-80 transition-opacity"
            onClick={handleClose}
            aria-label="Close"
          >
            ✖
          </button>
        </div>

        {isBodyVisible && <div className="animate-in slide-in-from-top-2 duration-200 overflow-y-scroll" style={{ maxHeight: maxHeight || '400px' }}>{children}</div>}
      </div>
    </>
  )
})

export default ToolLayout

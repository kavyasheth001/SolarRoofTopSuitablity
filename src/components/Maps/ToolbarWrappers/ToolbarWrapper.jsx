import { useToolbar } from "../../../context/ToolbarContext"

const ToolbarWrapper = ({ children, style = {}, ...props }) => {
  const { toolbarPosition, toolbarRef, containerRef } = useToolbar()

  return (
    <>
      {/* Container ref for measurements - covers the entire map area */}
      <div
        ref={containerRef}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          pointerEvents: "none",
          zIndex: -1,
        }}
      />

      {/* The actual toolbar */}
      <div
        ref={toolbarRef}
        style={{
          position: "absolute",
          top: "0px",
          right: `${toolbarPosition.right}px`,
          display: "flex",
          flexDirection: "column",
          gap: "8px",
          transition: "right 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
          zIndex: 1000,
          ...style,
        }}
        {...props}
      >
        {children}
      </div>
    </>
  )
}

export default ToolbarWrapper

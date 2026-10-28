import React from "react";
import { useVideoConfig } from "remotion";

/**
 * Lightweight drawing primitives used by SolarSightVideo.jsx.
 *
 * The video scenes were authored against a canvas-style API (Group / Text /
 * Circle / Line / Polygon with absolute x/y coordinates). Remotion renders
 * plain React (HTML + SVG), so these components map that API onto HTML divs
 * and absolutely-positioned, full-canvas SVG overlays. Each shape carries its
 * own SVG coordinate space that matches the composition's pixel grid, which
 * lets shapes and raw <div> elements be freely mixed inside a <Group>.
 */

// Full-canvas transparent SVG layer that a single shape is drawn into.
const Overlay = ({ children }) => {
  const { width, height } = useVideoConfig();
  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        overflow: "visible",
        pointerEvents: "none",
      }}
    >
      {children}
    </svg>
  );
};

export const Group = ({ children, style }) => (
  <div
    style={{
      position: "absolute",
      top: 0,
      left: 0,
      width: "100%",
      height: "100%",
      ...style,
    }}
  >
    {children}
  </div>
);

export const Text = ({
  str,
  x,
  y,
  size = 24,
  fontFamily = "Arial",
  color = "#000000",
  textAlign = "left",
  textBaseline,
  opacity = 1,
  maxWidth,
  lineHeight,
  style = {},
}) => {
  const fontWeight = /bold/i.test(fontFamily) ? 700 : 400;
  const family = fontFamily.replace(/\s*bold/i, "").trim() || "Arial";
  const common = {
    fontSize: size,
    fontFamily: family,
    fontWeight,
    color,
    opacity,
    textAlign,
    lineHeight: lineHeight ? `${lineHeight}px` : undefined,
    maxWidth,
  };

  // Flow mode: no coordinates provided -> render inline within parent element.
  if (x === undefined || x === null) {
    return <div style={{ ...common, ...style }}>{str}</div>;
  }

  const tx = textAlign === "center" ? "-50%" : textAlign === "right" ? "-100%" : "0";
  const ty = textBaseline === "middle" ? "-50%" : "0";
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        transform: `translate(${tx}, ${ty})`,
        whiteSpace: maxWidth ? "normal" : "nowrap",
        ...common,
        ...style,
      }}
    >
      {str}
    </div>
  );
};

export const Circle = ({ x, y, radius, color = "#000000", opacity = 1, style }) => (
  <Overlay>
    <circle cx={x} cy={y} r={radius} fill={color} opacity={opacity} style={style} />
  </Overlay>
);

export const Line = ({
  x1,
  y1,
  x2,
  y2,
  strokeWidth = 1,
  color = "#000000",
  cap = "butt",
  opacity = 1,
  style,
}) => (
  <Overlay>
    <line
      x1={x1}
      y1={y1}
      x2={x2}
      y2={y2}
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap={cap}
      opacity={opacity}
      style={style}
    />
  </Overlay>
);

export const Polygon = ({ points = [], color = "#000000", opacity = 1, style }) => (
  <Overlay>
    <polygon
      points={points.map((p) => p.join(",")).join(" ")}
      fill={color}
      opacity={opacity}
      style={style}
    />
  </Overlay>
);

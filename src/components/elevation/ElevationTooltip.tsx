"use client";

import { ScaleLinear } from "@/lib/elevation/scales";

interface ElevationTooltipProps {
  hoveredDistance: number | null;
  hoveredPoint: { lat: number; lng: number; elevation: number; grade: number } | null;
  width: number;
  height: number;
  xScale: ScaleLinear;
  yScale: ScaleLinear;
}

/**
 * SVG Overlay Layer: Interactive hover crosshairs and single-line minimalist tooltip pill.
 * Formatted as 1 line: "5.26 km | Alt: 782 m" pinned to top of chart to prevent blocking participant labels.
 */
export function ElevationTooltip({
  hoveredDistance,
  hoveredPoint,
  width,
  height,
  xScale,
  yScale,
}: ElevationTooltipProps) {
  if (hoveredDistance === null || !hoveredPoint || width <= 0 || height <= 0) {
    return null;
  }

  const px = xScale(hoveredDistance);
  const py = yScale(hoveredPoint.elevation);

  const km = (hoveredDistance / 1000).toFixed(2);
  const ele = Math.round(hoveredPoint.elevation);

  // Single-line minimalist text
  const labelText = `${km} km  |  Alt: ${ele} m`;
  const pillWidth = 140;
  const pillHeight = 22;

  // Pin pill to top edge of chart (y = 6) so it never covers participant name tooltips (which hover at py - 20)
  const pillX = Math.max(8, Math.min(width - pillWidth - 8, px - pillWidth / 2));
  const pillY = 6;

  return (
    <svg
      width={width}
      height={height}
      style={{
        position: "absolute",
        left: 0,
        top: 0,
        pointerEvents: "none",
        zIndex: 4,
      }}
    >
      {/* Vertical Crosshair Line (Dashed Slate) */}
      <line
        x1={px}
        y1={0}
        x2={px}
        y2={height}
        stroke="rgba(71, 85, 105, 0.4)"
        strokeDasharray="3,3"
        strokeWidth={1.5}
      />

      {/* Horizontal Crosshair Line */}
      <line
        x1={0}
        y1={py}
        x2={width}
        y2={py}
        stroke="rgba(71, 85, 105, 0.25)"
        strokeDasharray="3,3"
        strokeWidth={1}
      />

      {/* Hover Intersection Dot */}
      <circle cx={px} cy={py} r={5} fill="#4f46e5" stroke="#ffffff" strokeWidth={2} />

      {/* Minimalist 1-Line Tooltip Pill at Top of Canvas */}
      <g transform={`translate(${pillX}, ${pillY})`}>
        {/* Pill Background */}
        <rect
          x={0}
          y={0}
          width={pillWidth}
          height={pillHeight}
          rx={6}
          fill="rgba(255, 255, 255, 0.95)"
          stroke="rgba(203, 213, 225, 0.9)"
          strokeWidth={1}
          filter="drop-shadow(0 2px 4px rgba(0, 0, 0, 0.08))"
        />

        {/* 1-Line Label Text: Distance | Elevation */}
        <text
          x={pillWidth / 2}
          y={15}
          textAnchor="middle"
          fill="#0f172a"
          fontSize={11}
          fontWeight="bold"
          fontFamily="Inter, sans-serif"
        >
          {labelText}
        </text>
      </g>
    </svg>
  );
}

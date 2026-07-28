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
 * SVG Tooltip & Hover Crosshair overlay.
 */
export function ElevationTooltip({
  hoveredDistance,
  hoveredPoint,
  width,
  height,
  xScale,
  yScale,
}: ElevationTooltipProps) {
  if (hoveredDistance == null || !hoveredPoint) return null;

  const x = xScale(hoveredDistance);
  const y = yScale(hoveredPoint.elevation);

  const km = (hoveredDistance / 1000).toFixed(2);
  const ele = Math.round(hoveredPoint.elevation);
  const grade = hoveredPoint.grade.toFixed(1);

  // Position tooltip box to avoid overflow
  const tooltipWidth = 140;
  const tooltipHeight = 58;
  const boxX = Math.max(10, Math.min(width - tooltipWidth - 10, x > width / 2 ? x - tooltipWidth - 12 : x + 12));
  const boxY = Math.max(10, Math.min(height - tooltipHeight - 10, y - tooltipHeight / 2));

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
      {/* Vertical Crosshair Line */}
      <line
        x1={x}
        y1={0}
        x2={x}
        y2={height}
        stroke="rgba(255, 255, 255, 0.4)"
        strokeDasharray="3,3"
        strokeWidth={1}
      />

      {/* Point Marker */}
      <circle cx={x} cy={y} r={5} fill="#38bdf8" stroke="#ffffff" strokeWidth={2} />

      {/* Tooltip Card */}
      <g transform={`translate(${boxX}, ${boxY})`}>
        <rect
          width={tooltipWidth}
          height={tooltipHeight}
          rx={8}
          fill="rgba(15, 23, 42, 0.92)"
          stroke="rgba(255, 255, 255, 0.15)"
          strokeWidth={1}
          filter="drop-shadow(0 4px 12px rgba(0,0,0,0.5))"
        />

        {/* Distance & Elevation */}
        <text x={10} y={18} fill="#38bdf8" fontSize={11} fontWeight="bold" fontFamily="Inter, sans-serif">
          {km} km
        </text>
        <text x={tooltipWidth - 10} y={18} textAnchor="end" fill="#f8fafc" fontSize={11} fontWeight="600" fontFamily="Inter, sans-serif">
          {ele} m ASL
        </text>

        {/* Slope grade */}
        <text x={10} y={36} fill="#94a3b8" fontSize={10} fontFamily="Inter, sans-serif">
          Gradient:
        </text>
        <text
          x={tooltipWidth - 10}
          y={36}
          textAnchor="end"
          fill={parseFloat(grade) > 5 ? "#f43f5e" : parseFloat(grade) < 0 ? "#10b981" : "#cbd5e1"}
          fontSize={10}
          fontWeight="bold"
          fontFamily="Inter, sans-serif"
        >
          {grade}%
        </text>

        {/* Coordinates */}
        <text x={10} y={50} fill="#64748b" fontSize={9} fontFamily="Inter, sans-serif">
          {hoveredPoint.lat.toFixed(4)}°, {hoveredPoint.lng.toFixed(4)}°
        </text>
      </g>
    </svg>
  );
}

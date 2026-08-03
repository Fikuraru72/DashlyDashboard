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
 * SVG Overlay Layer: Interactive hover crosshairs and detail tooltip card (Light Mode).
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
  const grade = hoveredPoint.grade.toFixed(1);

  // Position tooltip card cleanly
  const cardWidth = 145;
  const cardHeight = 65;
  let cardX = px + 12;
  if (cardX + cardWidth > width - 10) {
    cardX = px - cardWidth - 12;
  }

  let cardY = py - cardHeight / 2;
  if (cardY < 10) cardY = 10;
  if (cardY + cardHeight > height - 10) cardY = height - cardHeight - 10;

  const isSteep = hoveredPoint.grade > 6;

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
      {/* Vertical Crosshair Line (Light Mode) */}
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
      <circle cx={px} cy={py} r={6} fill="#4f46e5" stroke="#ffffff" strokeWidth={2.5} />

      {/* Tooltip Floating Card (Light Mode) */}
      <g transform={`translate(${cardX}, ${cardY})`}>
        {/* Card Shadow + Background */}
        <rect
          x={0}
          y={0}
          width={cardWidth}
          height={cardHeight}
          rx={8}
          fill="rgba(255, 255, 255, 0.96)"
          stroke="rgba(203, 213, 225, 0.8)"
          strokeWidth={1}
          filter="drop-shadow(0 4px 6px rgba(0, 0, 0, 0.08))"
        />

        {/* Distance (km) */}
        <text x={10} y={18} fill="#0f172a" fontSize={12} fontWeight="bold" fontFamily="Inter, sans-serif">
          {km} km
        </text>

        {/* Elevation (m) */}
        <text x={10} y={35} fill="#475569" fontSize={11} fontWeight="500" fontFamily="Inter, sans-serif">
          Alt: <tspan fill="#0f172a" fontWeight="bold">{ele} m</tspan>
        </text>

        {/* Grade (%) */}
        <text
          x={10}
          y={52}
          fill={isSteep ? "#e11d48" : "#475569"}
          fontSize={10.5}
          fontWeight={isSteep ? "bold" : "500"}
          fontFamily="Inter, sans-serif"
        >
          Grade: {grade}% {isSteep && "⛰️"}
        </text>

        {/* Lat/Lng Subtext */}
        <text
          x={cardWidth - 8}
          y={18}
          textAnchor="end"
          fill="#94a3b8"
          fontSize={9}
          fontFamily="Inter, sans-serif"
        >
          {hoveredPoint.lat.toFixed(4)}, {hoveredPoint.lng.toFixed(4)}
        </text>
      </g>
    </svg>
  );
}

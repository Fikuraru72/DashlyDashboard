"use client";

import { useMemo } from "react";
import { ScaleLinear } from "@/lib/elevation/scales";

interface ElevationAxesProps {
  width: number;
  height: number;
  totalDistance: number; // visible distance range (meters)
  minElevation: number;  // meters
  maxElevation: number;  // meters
  xScale: ScaleLinear;
  yScale: ScaleLinear;
  domainStart?: number; // start of visible domain (meters), default 0
  isZoomed?: boolean;
}

/**
 * SVG Overlay Layer: X/Y axes, distance/elevation labels, horizontal gridlines (Light Mode).
 */
export function ElevationAxes({
  width,
  height,
  totalDistance,
  minElevation,
  maxElevation,
  xScale,
  yScale,
  domainStart = 0,
  isZoomed = false,
}: ElevationAxesProps) {
  // Generate X-axis distance ticks (5-8 ticks)
  const xTicks = useMemo(() => {
    if (totalDistance <= 0 || width <= 0) return [];
    const count = width > 600 ? 7 : width > 400 ? 5 : 3;
    const step = totalDistance / count;
    const ticks: { distanceMeters: number; label: string; x: number }[] = [];

    for (let i = 0; i <= count; i++) {
      const relativeDist = i * step;
      const absoluteDist = domainStart + relativeDist;
      const km = (absoluteDist / 1000).toFixed(1);
      ticks.push({
        distanceMeters: absoluteDist,
        label: `${km} km`,
        x: xScale(absoluteDist),
      });
    }
    return ticks;
  }, [totalDistance, width, xScale, domainStart]);

  // Generate Y-axis elevation ticks (4-5 ticks)
  const yTicks = useMemo(() => {
    if (height <= 0) return [];
    const min = Math.floor(minElevation / 50) * 50;
    const max = Math.ceil(maxElevation / 50) * 50;
    const range = max - min || 100;
    const count = 4;
    const step = range / count;

    const ticks: { elevation: number; label: string; y: number }[] = [];
    for (let i = 0; i <= count; i++) {
      const ele = Math.round(min + i * step);
      ticks.push({
        elevation: ele,
        label: `${ele} m`,
        y: yScale(ele),
      });
    }
    return ticks;
  }, [minElevation, maxElevation, height, yScale]);

  const startX = xScale(0);

  return (
    <svg
      width={width}
      height={height}
      style={{
        position: "absolute",
        left: 0,
        top: 0,
        pointerEvents: "none",
        zIndex: 3,
      }}
    >
      {/* Horizontal Gridlines (Light Mode) */}
      {yTicks.map((tick, i) => (
        <g key={`y-grid-${i}`}>
          <line
            x1={0}
            y1={tick.y}
            x2={width}
            y2={tick.y}
            stroke="rgba(148, 163, 184, 0.25)"
            strokeDasharray="4,4"
          />
          <text
            x={8}
            y={tick.y - 4}
            fill="#64748b"
            fontSize={10}
            fontWeight="500"
            fontFamily="Inter, sans-serif"
          >
            {tick.label}
          </text>
        </g>
      ))}

      {/* X Ticks & Vertical Lines (Light Mode) */}
      {xTicks.map((tick, i) => (
        <g key={`x-grid-${i}`}>
          <line
            x1={tick.x}
            y1={0}
            x2={tick.x}
            y2={height - 20}
            stroke="rgba(148, 163, 184, 0.2)"
            strokeDasharray="2,2"
          />
          <text
            x={tick.x}
            y={height - 6}
            textAnchor="middle"
            fill="#475569"
            fontSize={10}
            fontWeight="600"
            fontFamily="Inter, sans-serif"
          >
            {tick.label}
          </text>
        </g>
      ))}

      {/* Start Line Badge (Light Mode) */}
      {domainStart <= 0 && (
        <g transform={`translate(${startX}, 16)`}>
          <rect
            x={4}
            y={0}
            width={42}
            height={16}
            rx={4}
            fill="#ecfdf5"
            stroke="#6ee7b7"
          />
          <text x={25} y={11} textAnchor="middle" fill="#047857" fontSize={9} fontWeight="bold">
            START
          </text>
        </g>
      )}

      {/* Finish Line Badge (Light Mode) */}
      {!isZoomed && totalDistance > 0 && (
        <g transform={`translate(${xScale(domainStart + totalDistance) - 48}, 16)`}>
          <rect
            x={0}
            y={0}
            width={44}
            height={16}
            rx={4}
            fill="#e0e7ff"
            stroke="#a5b4fc"
          />
          <text x={22} y={11} textAnchor="middle" fill="#4338ca" fontSize={9} fontWeight="bold">
            FINISH
          </text>
        </g>
      )}

      {/* Zoom indicator overlay */}
      {isZoomed && (
        <text
          x={width - 8}
          y={14}
          textAnchor="end"
          fill="#4f46e5"
          fontSize={10}
          fontWeight="600"
          fontFamily="Inter, sans-serif"
        >
          🔍 {((domainStart + totalDistance) / 1000).toFixed(1)} km — Zoomed
        </text>
      )}
    </svg>
  );
}

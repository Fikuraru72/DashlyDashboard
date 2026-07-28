"use client";

import { useMemo } from "react";
import { ScaleLinear } from "@/lib/elevation/scales";

interface ElevationAxesProps {
  width: number;
  height: number;
  totalDistance: number; // meters
  minElevation: number;  // meters
  maxElevation: number;  // meters
  xScale: ScaleLinear;
  yScale: ScaleLinear;
}

/**
 * SVG Overlay Layer: X/Y axes, distance/elevation labels, horizontal gridlines.
 */
export function ElevationAxes({
  width,
  height,
  totalDistance,
  minElevation,
  maxElevation,
  xScale,
  yScale,
}: ElevationAxesProps) {
  // Generate X-axis distance ticks (5-8 ticks)
  const xTicks = useMemo(() => {
    if (totalDistance <= 0 || width <= 0) return [];
    const count = width > 600 ? 7 : width > 400 ? 5 : 3;
    const step = totalDistance / count;
    const ticks: { distanceMeters: number; label: string; x: number }[] = [];

    for (let i = 0; i <= count; i++) {
      const dist = i * step;
      const km = (dist / 1000).toFixed(1);
      ticks.push({
        distanceMeters: dist,
        label: `${km} km`,
        x: xScale(dist),
      });
    }
    return ticks;
  }, [totalDistance, width, xScale]);

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
      {/* Horizontal Gridlines */}
      {yTicks.map((tick, i) => (
        <g key={`y-grid-${i}`}>
          <line
            x1={0}
            y1={tick.y}
            x2={width}
            y2={tick.y}
            stroke="rgba(255, 255, 255, 0.07)"
            strokeDasharray="4,4"
          />
          <text
            x={8}
            y={tick.y - 4}
            fill="#64748b"
            fontSize={10}
            fontFamily="Inter, sans-serif"
          >
            {tick.label}
          </text>
        </g>
      ))}

      {/* X Ticks & Vertical Lines */}
      {xTicks.map((tick, i) => (
        <g key={`x-grid-${i}`}>
          <line
            x1={tick.x}
            y1={0}
            x2={tick.x}
            y2={height - 20}
            stroke="rgba(255, 255, 255, 0.05)"
            strokeDasharray="2,2"
          />
          <text
            x={tick.x}
            y={height - 6}
            textAnchor="middle"
            fill="#94a3b8"
            fontSize={10}
            fontWeight="500"
            fontFamily="Inter, sans-serif"
          >
            {tick.label}
          </text>
        </g>
      ))}

      {/* Start Line Badge */}
      <g transform={`translate(${xScale(0)}, 16)`}>
        <rect
          x={4}
          y={0}
          width={42}
          height={16}
          rx={4}
          fill="rgba(16, 185, 129, 0.2)"
          stroke="rgba(16, 185, 129, 0.4)"
        />
        <text x={25} y={11} textAnchor="middle" fill="#10b981" fontSize={9} fontWeight="bold">
          START
        </text>
      </g>

      {/* Finish Line Badge */}
      {totalDistance > 0 && (
        <g transform={`translate(${xScale(totalDistance) - 48}, 16)`}>
          <rect
            x={0}
            y={0}
            width={44}
            height={16}
            rx={4}
            fill="rgba(99, 102, 241, 0.2)"
            stroke="rgba(99, 102, 241, 0.4)"
          />
          <text x={22} y={11} textAnchor="middle" fill="#818cf8" fontSize={9} fontWeight="bold">
            FINISH
          </text>
        </g>
      )}
    </svg>
  );
}

"use client";

import { useEffect, useRef } from "react";
import { ChartDataPoint } from "@/types/elevation";
import { ScaleLinear } from "@/lib/elevation/scales";

interface ElevationCanvasProps {
  data: ChartDataPoint[];
  width: number;
  height: number;
  xScale: ScaleLinear;
  yScale: ScaleLinear;
}

/**
 * Canvas Layer 1: Static area fill + elevation contour line.
 * Redrawn only when chart data or dimensions change.
 */
export function ElevationCanvas({
  data,
  width,
  height,
  xScale,
  yScale,
}: ElevationCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !data || data.length === 0 || width <= 0 || height <= 0) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Handle high-DPI displays (Retina)
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    ctx.clearRect(0, 0, width, height);

    // ── 1. Create Area Fill Gradient ─────────────────────────────
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, "rgba(99, 102, 241, 0.35)");  // Indigo top
    gradient.addColorStop(0.5, "rgba(99, 102, 241, 0.15)");
    gradient.addColorStop(1, "rgba(99, 102, 241, 0.0)");   // Transparent bottom

    // ── 2. Draw Area Fill Path ───────────────────────────────────
    ctx.beginPath();
    ctx.moveTo(xScale(data[0].distance), height);
    ctx.lineTo(xScale(data[0].distance), yScale(data[0].elevation));

    for (let i = 1; i < data.length; i++) {
      ctx.lineTo(xScale(data[i].distance), yScale(data[i].elevation));
    }

    ctx.lineTo(xScale(data[data.length - 1].distance), height);
    ctx.closePath();

    ctx.fillStyle = gradient;
    ctx.fill();

    // ── 3. Draw Contour Line ──────────────────────────────────────
    ctx.beginPath();
    ctx.moveTo(xScale(data[0].distance), yScale(data[0].elevation));

    for (let i = 1; i < data.length; i++) {
      ctx.lineTo(xScale(data[i].distance), yScale(data[i].elevation));
    }

    ctx.strokeStyle = "#818cf8"; // Indigo-400
    ctx.lineWidth = 2.5;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    ctx.stroke();

    // ── 4. Gradient stroke highlights for steep climbs (> 6% grade) ──
    for (let i = 1; i < data.length; i++) {
      if (data[i].grade > 6) {
        ctx.beginPath();
        ctx.moveTo(xScale(data[i - 1].distance), yScale(data[i - 1].elevation));
        ctx.lineTo(xScale(data[i].distance), yScale(data[i].elevation));
        ctx.strokeStyle = "#f43f5e"; // Rose-500 for steep climb
        ctx.lineWidth = 3.5;
        ctx.stroke();
      }
    }
  }, [data, width, height, xScale, yScale]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "absolute",
        left: 0,
        top: 0,
        width: `${width}px`,
        height: `${height}px`,
        pointerEvents: "none",
        zIndex: 1,
      }}
    />
  );
}

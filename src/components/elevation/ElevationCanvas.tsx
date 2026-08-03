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
 * Canvas Layer 1: Static area fill + elevation contour line (Light Mode).
 * Redrawn only when chart data, dimensions, or scales change.
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

    // ── 1. Create Light Mode Area Fill Gradient ──────────────────
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, "rgba(79, 70, 229, 0.18)");   // Royal Indigo top (soft fill)
    gradient.addColorStop(0.6, "rgba(79, 70, 229, 0.05)");
    gradient.addColorStop(1, "rgba(79, 70, 229, 0.0)");    // Transparent bottom

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

    // ── 3. Draw Contour Line (Royal Indigo-600) ───────────────────
    ctx.beginPath();
    ctx.moveTo(xScale(data[0].distance), yScale(data[0].elevation));

    for (let i = 1; i < data.length; i++) {
      ctx.lineTo(xScale(data[i].distance), yScale(data[i].elevation));
    }

    ctx.strokeStyle = "#4f46e5"; // Indigo-600
    ctx.lineWidth = 2.5;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    ctx.stroke();

    // ── 4. Highlighting steep climbs (> 6% grade) ─────────────
    for (let i = 1; i < data.length; i++) {
      if (data[i].grade > 6) {
        ctx.beginPath();
        ctx.moveTo(xScale(data[i - 1].distance), yScale(data[i - 1].elevation));
        ctx.lineTo(xScale(data[i].distance), yScale(data[i].elevation));
        ctx.strokeStyle = "#e11d48"; // Rose-600 for steep climb
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

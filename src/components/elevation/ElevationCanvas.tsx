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

    // ── 1. Create Crisp High-Contrast Gradient Fill ─────────────
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, "rgba(2, 132, 199, 0.22)");   // Sky-600 sharp fill
    gradient.addColorStop(0.7, "rgba(2, 132, 199, 0.05)");
    gradient.addColorStop(1, "rgba(2, 132, 199, 0.0)");

    // ── 2. Draw Sharp Subtle Background Grid Lines ─────────
    ctx.strokeStyle = "rgba(203, 213, 225, 0.5)";
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);
    for (let h = 20; h < height - 10; h += 25) {
      ctx.beginPath();
      ctx.moveTo(0, Math.floor(h) + 0.5);
      ctx.lineTo(width, Math.floor(h) + 0.5);
      ctx.stroke();
    }
    ctx.setLineDash([]); // Reset dash

    // ── 3. Draw Sharp Area Fill Path ──────────────────────────────
    ctx.beginPath();
    ctx.moveTo(xScale(data[0].distance), height - 10);
    ctx.lineTo(xScale(data[0].distance), yScale(data[0].elevation));

    for (let i = 1; i < data.length; i++) {
      ctx.lineTo(xScale(data[i].distance), yScale(data[i].elevation));
    }

    ctx.lineTo(xScale(data[data.length - 1].distance), height - 10);
    ctx.closePath();

    ctx.fillStyle = gradient;
    ctx.fill();

    // ── 4. Draw Ultra-Sharp High-Precision Contour Line ───────────
    ctx.beginPath();
    ctx.moveTo(xScale(data[0].distance), yScale(data[0].elevation));

    for (let i = 1; i < data.length; i++) {
      ctx.lineTo(xScale(data[i].distance), yScale(data[i].elevation));
    }

    ctx.strokeStyle = "#0284c7"; // Sky-600 sharp crisp line
    ctx.lineWidth = 2;
    ctx.lineJoin = "miter";
    ctx.miterLimit = 2;
    ctx.lineCap = "square";
    ctx.stroke();

    // ── 5. Highlighting steep climb segments (> 6% grade) ─────────
    for (let i = 1; i < data.length; i++) {
      if (data[i].grade > 6) {
        ctx.beginPath();
        ctx.moveTo(xScale(data[i - 1].distance), yScale(data[i - 1].elevation));
        ctx.lineTo(xScale(data[i].distance), yScale(data[i].elevation));
        ctx.strokeStyle = "#e11d48"; // Rose-600 for sharp steep climb
        ctx.lineWidth = 2.5;
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

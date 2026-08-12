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

    // ── 1. Create Vibrant Cyan-Indigo Area Fill Gradient ─────────────
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, "rgba(76, 185, 231, 0.35)");   // EcoRaceMaps Cyan (#4CB9E7)
    gradient.addColorStop(0.5, "rgba(79, 70, 229, 0.15)");  // Indigo
    gradient.addColorStop(1, "rgba(79, 70, 229, 0.0)");     // Transparent bottom

    // ── 2. Draw Subtle Background Horizontal Grid Lines ─────────
    ctx.strokeStyle = "rgba(226, 232, 240, 0.4)";
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    for (let h = 20; h < height - 10; h += 30) {
      ctx.beginPath();
      ctx.moveTo(0, h);
      ctx.lineTo(width, h);
      ctx.stroke();
    }
    ctx.setLineDash([]); // Reset dash

    // ── 3. Draw Area Fill Path ───────────────────────────────────
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

    // ── 4. Draw Glowing Contour Stroke Line ───────────────────────
    ctx.shadowColor = "rgba(76, 185, 231, 0.6)";
    ctx.shadowBlur = 8;

    ctx.beginPath();
    ctx.moveTo(xScale(data[0].distance), yScale(data[0].elevation));

    for (let i = 1; i < data.length; i++) {
      ctx.lineTo(xScale(data[i].distance), yScale(data[i].elevation));
    }

    ctx.strokeStyle = "#4CB9E7"; // EcoRaceMaps primary cyan
    ctx.lineWidth = 3;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    ctx.stroke();

    // Reset shadow
    ctx.shadowColor = "transparent";
    ctx.shadowBlur = 0;

    // ── 5. Highlighting steep climbs (> 6% grade) ─────────────
    for (let i = 1; i < data.length; i++) {
      if (data[i].grade > 6) {
        ctx.beginPath();
        ctx.moveTo(xScale(data[i - 1].distance), yScale(data[i - 1].elevation));
        ctx.lineTo(xScale(data[i].distance), yScale(data[i].elevation));
        ctx.strokeStyle = "#f43f5e"; // Rose-500 for steep climb
        ctx.lineWidth = 4;
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

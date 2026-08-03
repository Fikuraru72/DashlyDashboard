"use client";

import { useEffect, useRef } from "react";
import { ParticipantData } from "@/store/useParticipantStore";
import { ScaleLinear } from "@/lib/elevation/scales";
import { useElevationStore } from "@/store/useElevationStore";
import { findNearestProfileDistance, interpolateAtDistance } from "@/lib/elevation/interpolation";

interface ElevationPointersProps {
  participants: Record<string, ParticipantData>;
  width: number;
  height: number;
  xScale: ScaleLinear;
  yScale: ScaleLinear;
  selectedParticipantId: string | null;
  onPointerClick?: (participantId: string) => void;
}

interface PointerAnimationState {
  id: string;
  name: string;
  bibNumber?: string;
  targetDistance: number;
  targetElevation: number;
  displayDistance: number;
  displayElevation: number;
  status: string;
  rank?: number;
}

/**
 * Canvas Layer 2: Dynamic participant pointers animated at 60fps via rAF.
 * Mutates internal lerp states in refs to avoid React re-render thrashing.
 */
export function ElevationPointers({
  participants,
  width,
  height,
  xScale,
  yScale,
  selectedParticipantId,
}: ElevationPointersProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animStatesRef = useRef<Map<string, PointerAnimationState>>(new Map());
  const rAfIdRef = useRef<number | null>(null);

  const altitudeProfile = useElevationStore((state) => state.altitudeProfile);

  // Synchronize incoming participant store targets into internal animation state
  useEffect(() => {
    const animMap = animStatesRef.current;

    for (const [id, p] of Object.entries(participants)) {
      let targetDist = p.routeDistance;
      let targetElev = p.routeElevation;

      // Fallback interpolation if pre-calculated routeDistance is missing but lat/lng exist
      if ((targetDist == null || targetElev == null) && p.lat && p.lng && altitudeProfile && altitudeProfile.length > 0) {
        targetDist = findNearestProfileDistance(altitudeProfile, p.lat, p.lng);
        const interpolated = interpolateAtDistance(altitudeProfile, targetDist);
        targetElev = interpolated?.elevation ?? altitudeProfile[0].elevation;
      }

      if (targetDist == null || targetElev == null) continue;

      const existing = animMap.get(id);
      if (!existing) {
        animMap.set(id, {
          id,
          name: p.name || `User ${id}`,
          targetDistance: targetDist,
          targetElevation: targetElev,
          displayDistance: targetDist,
          displayElevation: targetElev,
          status: p.status,
          rank: p.rank,
        });
      } else {
        existing.targetDistance = targetDist;
        existing.targetElevation = targetElev;
        existing.status = p.status;
        existing.rank = p.rank;
      }
    }

    // Clean up stale participants no longer in store
    for (const id of animMap.keys()) {
      if (!participants[id]) {
        animMap.delete(id);
      }
    }
  }, [participants, altitudeProfile]);

  // Main 60fps requestAnimationFrame loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || width <= 0 || height <= 0) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;

    const animate = () => {
      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, width, height);

      const animMap = animStatesRef.current;
      let lerpActive = false;

      // ── 1. Update lerp positions ─────────────────────────────
      for (const p of animMap.values()) {
        const dDist = p.targetDistance - p.displayDistance;
        const dElev = p.targetElevation - p.displayElevation;

        if (Math.abs(dDist) > 0.1 || Math.abs(dElev) > 0.05) {
          p.displayDistance += dDist * 0.08; // Exponential ease-out
          p.displayElevation += dElev * 0.08;
          lerpActive = true;
        } else {
          p.displayDistance = p.targetDistance;
          p.displayElevation = p.targetElevation;
        }
      }

      // ── 2. Viewport culling & clustering ─────────────────────
      const activePointers: PointerAnimationState[] = [];
      for (const p of animMap.values()) {
        const px = xScale(p.displayDistance);
        if (px >= -20 && px <= width + 20) {
          activePointers.push(p);
        }
      }

      // ── 3. Batch render unselected pointers ─────────────────
      ctx.beginPath();
      for (const p of activePointers) {
        if (p.id === selectedParticipantId) continue;
        const px = xScale(p.displayDistance);
        const py = yScale(p.displayElevation);

        ctx.moveTo(px + 4.5, py);
        ctx.arc(px, py, 4.5, 0, Math.PI * 2);
      }
      ctx.fillStyle = "#38bdf8"; // Sky-400
      ctx.fill();
      ctx.strokeStyle = "#0f172a"; // Slate-900 border
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // ── 4. Render selected participant pointer + halo label ─
      if (selectedParticipantId) {
        const selected = animMap.get(selectedParticipantId);
        if (selected) {
          const px = xScale(selected.displayDistance);
          const py = yScale(selected.displayElevation);

          // Pulsing halo
          ctx.beginPath();
          ctx.arc(px, py, 12, 0, Math.PI * 2);
          ctx.fillStyle = "rgba(244, 63, 94, 0.25)"; // Rose halo
          ctx.fill();

          // Selected Dot
          ctx.beginPath();
          ctx.arc(px, py, 7, 0, Math.PI * 2);
          ctx.fillStyle = "#f43f5e"; // Rose-500
          ctx.fill();
          ctx.strokeStyle = "#ffffff";
          ctx.lineWidth = 2;
          ctx.stroke();

          // Label tooltip above pointer
          const labelText = selected.name || `User ${selected.id}`;
          ctx.font = "bold 11px Inter, sans-serif";
          const textWidth = ctx.measureText(labelText).width;

          const labelX = Math.max(10, Math.min(width - textWidth - 16, px - textWidth / 2 - 8));
          const labelY = Math.max(20, py - 18);

          // Label pill background
          ctx.fillStyle = "rgba(15, 23, 42, 0.9)";
          ctx.beginPath();
          ctx.roundRect(labelX, labelY, textWidth + 16, 20, 6);
          ctx.fill();
          ctx.strokeStyle = "rgba(244, 63, 94, 0.6)";
          ctx.lineWidth = 1;
          ctx.stroke();

          // Label text
          ctx.fillStyle = "#ffffff";
          ctx.fillText(labelText, labelX + 8, labelY + 14);
        }
      }

      ctx.restore();
      rAfIdRef.current = requestAnimationFrame(animate);
    };

    rAfIdRef.current = requestAnimationFrame(animate);

    return () => {
      if (rAfIdRef.current) {
        cancelAnimationFrame(rAfIdRef.current);
      }
    };
  }, [width, height, xScale, yScale, selectedParticipantId]);

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
        zIndex: 2,
      }}
    />
  );
}

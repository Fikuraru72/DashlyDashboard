"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ScaleLinear } from "@/lib/elevation/scales";
import { useElevationStore } from "@/store/useElevationStore";
import { findNearestProfileDistance, interpolateAtDistance } from "@/lib/elevation/interpolation";

interface ElevationPointersProps {
  participants?: Record<string, any> | Map<string, any>;
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
 * Supports both Map<string, any> and Record<string, any> for participants.
 * Renders tooltip on pointer hover displaying [BIB Number] - [Full Name].
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
  const hoveredPointerIdRef = useRef<string | null>(null);

  const altitudeProfile = useElevationStore((state) => state.altitudeProfile);

  // Convert participants prop (Map or Object) into an iterable entries list
  const participantList = useMemo(() => {
    if (!participants) return [];
    if (participants instanceof Map) {
      return Array.from(participants.entries()).map(([id, p]) => ({ id: String(id), ...p }));
    }
    return Object.entries(participants).map(([id, p]) => ({ id: String(id), ...p }));
  }, [participants]);

  // Synchronize incoming participant store targets into internal animation state
  useEffect(() => {
    const animMap = animStatesRef.current;
    const currentStoreIds = new Set<string>();

    for (const p of participantList) {
      const id = String(p.id || p.userId || p.participantId);
      currentStoreIds.add(id);

      let targetDist = p.routeDistance;
      let targetElev = p.routeElevation;

      // Fallback interpolation if pre-calculated routeDistance is missing but lat/lng exist
      if (
        (targetDist == null || targetElev == null) &&
        p.lat &&
        p.lng &&
        altitudeProfile &&
        altitudeProfile.length > 0
      ) {
        targetDist = findNearestProfileDistance(altitudeProfile, parseFloat(p.lat), parseFloat(p.lng));
        const interpolated = interpolateAtDistance(altitudeProfile, targetDist);
        targetElev = interpolated?.elevation ?? altitudeProfile[0].elevation;
      }

      if (targetDist == null || targetElev == null) continue;

      const bibText = p.bibNumber && p.bibNumber !== "-" ? p.bibNumber : "";
      const rawName = p.name || `User ${id.substring(0, 4)}`;
      // Ensure clean name without duplicate BIB
      const cleanName = bibText && rawName.startsWith(`${bibText} - `)
        ? rawName.replace(`${bibText} - `, "")
        : rawName;

      const existing = animMap.get(id);
      if (!existing) {
        animMap.set(id, {
          id,
          name: cleanName,
          bibNumber: bibText,
          targetDistance: targetDist,
          targetElevation: targetElev,
          displayDistance: targetDist,
          displayElevation: targetElev,
          status: p.status || "active",
          rank: p.rank,
        });
      } else {
        existing.name = cleanName;
        existing.bibNumber = bibText;
        existing.targetDistance = targetDist;
        existing.targetElevation = targetElev;
        existing.status = p.status || "active";
        existing.rank = p.rank;
      }
    }

    // Clean up stale participants no longer in store
    for (const id of animMap.keys()) {
      if (!currentStoreIds.has(id)) {
        animMap.delete(id);
      }
    }
  }, [participantList, altitudeProfile]);

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
      const hoveredId = hoveredPointerIdRef.current;

      // ── 1. Update lerp positions ─────────────────────────────
      for (const p of animMap.values()) {
        const dDist = p.targetDistance - p.displayDistance;
        const dElev = p.targetElevation - p.displayElevation;

        if (Math.abs(dDist) > 0.1 || Math.abs(dElev) > 0.05) {
          p.displayDistance += dDist * 0.08; // Exponential ease-out
          p.displayElevation += dElev * 0.08;
        } else {
          p.displayDistance = p.targetDistance;
          p.displayElevation = p.targetElevation;
        }
      }

      // ── 2. Viewport culling ──────────────────────────────────
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
        if (p.id === selectedParticipantId || p.id === hoveredId) continue;
        const px = xScale(p.displayDistance);
        const py = yScale(p.displayElevation);

        ctx.moveTo(px + 5, py);
        ctx.arc(px, py, 5, 0, Math.PI * 2);
      }
      ctx.fillStyle = "#0284c7"; // Sky-600
      ctx.fill();
      ctx.strokeStyle = "#ffffff"; // White border
      ctx.lineWidth = 2;
      ctx.stroke();

      // ── 4. Render hovered/selected participant pointer + label ─
      const highlightId = hoveredId || selectedParticipantId;
      if (highlightId) {
        const targetPtr = animMap.get(highlightId);
        if (targetPtr) {
          const px = xScale(targetPtr.displayDistance);
          const py = yScale(targetPtr.displayElevation);

          const isSelected = highlightId === selectedParticipantId;
          const color = isSelected ? "#e11d48" : "#0284c7";

          // Pulsing halo
          ctx.beginPath();
          ctx.arc(px, py, 13, 0, Math.PI * 2);
          ctx.fillStyle = isSelected ? "rgba(225, 29, 72, 0.2)" : "rgba(2, 132, 199, 0.2)";
          ctx.fill();

          // Highlighted Dot
          ctx.beginPath();
          ctx.arc(px, py, 7.5, 0, Math.PI * 2);
          ctx.fillStyle = color;
          ctx.fill();
          ctx.strokeStyle = "#ffffff";
          ctx.lineWidth = 2.5;
          ctx.stroke();

          // Label tooltip format: BIB - Full Name
          const bibPrefix = targetPtr.bibNumber ? `${targetPtr.bibNumber} - ` : "";
          const labelText = `${bibPrefix}${targetPtr.name}`;

          ctx.font = "bold 11px Inter, sans-serif";
          const textWidth = ctx.measureText(labelText).width;

          const labelX = Math.max(10, Math.min(width - textWidth - 18, px - textWidth / 2 - 9));
          const labelY = Math.max(20, py - 20);

          // Label pill background (Light Mode)
          ctx.fillStyle = "rgba(255, 255, 255, 0.96)";
          ctx.beginPath();
          ctx.roundRect(labelX, labelY, textWidth + 18, 22, 6);
          ctx.fill();
          ctx.strokeStyle = isSelected ? "rgba(225, 29, 72, 0.5)" : "rgba(2, 132, 199, 0.5)";
          ctx.lineWidth = 1.5;
          ctx.stroke();

          // Label text
          ctx.fillStyle = "#0f172a"; // Slate-900 text
          ctx.fillText(labelText, labelX + 9, labelY + 15);
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

  // Proximity mouse hover detection for participant pointer tooltip
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current || width <= 0 || height <= 0) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    let closestId: string | null = null;
    let closestDistSq = 14 * 14; // 14px hit radius

    for (const p of animStatesRef.current.values()) {
      const px = xScale(p.displayDistance);
      const py = yScale(p.displayElevation);
      const dx = px - mx;
      const dy = py - my;
      const distSq = dx * dx + dy * dy;
      if (distSq <= closestDistSq) {
        closestDistSq = distSq;
        closestId = p.id;
      }
    }

    hoveredPointerIdRef.current = closestId;
  };

  const handleMouseLeave = () => {
    hoveredPointerIdRef.current = null;
  };

  return (
    <canvas
      ref={canvasRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{
        position: "absolute",
        left: 0,
        top: 0,
        width: `${width}px`,
        height: `${height}px`,
        pointerEvents: "auto",
        zIndex: 2,
      }}
    />
  );
}

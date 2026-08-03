"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { AltitudePoint } from "@/types/elevation";
import { useElevationStore } from "@/store/useElevationStore";
import { useParticipantStore } from "@/store/useParticipantStore";
import { createLinearScale } from "@/lib/elevation/scales";

import { ElevationStats } from "./ElevationStats";
import { ElevationCanvas } from "./ElevationCanvas";
import { ElevationPointers } from "./ElevationPointers";
import { ElevationAxes } from "./ElevationAxes";
import { ElevationTooltip } from "./ElevationTooltip";

interface ElevationProfileProps {
  altitudeProfile: AltitudePoint[];
  participants?: Record<string, any> | Map<string, any>;
  onChartClick?: (lat: number, lng: number, distance: number) => void;
  onChartHover?: (lat: number, lng: number, distance: number | null) => void;
}

const MIN_ZOOM_RANGE_METERS = 200; // Minimum zoom window = 200 meters
const ZOOM_FACTOR = 0.15; // 15% zoom per wheel tick

export function ElevationProfile({
  altitudeProfile,
  participants: participantsProp,
  onChartClick,
  onChartHover,
}: ElevationProfileProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartAreaRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState<{ width: number; height: number }>({
    width: 0,
    height: 0,
  });

  // Stores
  const {
    chartData,
    totalDistance,
    totalElevationGain,
    minElevation,
    maxElevation,
    isReady,
    initializeRoute,
    hoveredDistance,
    hoveredPoint,
    setHoveredDistance,
    setClickedDistance,
    zoomDomain,
    setZoomDomain,
    resetZoom,
  } = useElevationStore();

  const storeParticipants = useParticipantStore((state) => state.participants);
  const selectedParticipantId = useParticipantStore((state) => state.selectedParticipantId);

  // Fallback to store participants if prop is omitted
  const activeParticipants = participantsProp ?? storeParticipants;

  // Initialize route data in store on mount/change
  useEffect(() => {
    if (altitudeProfile && altitudeProfile.length > 0) {
      initializeRoute(altitudeProfile);
    }
  }, [altitudeProfile, initializeRoute]);

  // Handle container resize
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        setDimensions({
          width: Math.floor(entry.contentRect.width),
          height: Math.max(100, Math.floor(entry.contentRect.height) - 36), // subtract header
        });
      }
    });

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // ── Effective zoom domain (fallback to full range) ──────────
  const effectiveDomain = useMemo<[number, number]>(() => {
    if (zoomDomain) return zoomDomain;
    return [0, totalDistance || 1];
  }, [zoomDomain, totalDistance]);

  // ── Compute elevation range for zoomed domain ──────────────
  const zoomedElevationRange = useMemo(() => {
    if (!chartData || chartData.length === 0) {
      return { min: minElevation, max: maxElevation };
    }

    if (!zoomDomain) {
      return { min: minElevation, max: maxElevation };
    }

    let zMin = Infinity;
    let zMax = -Infinity;
    for (const pt of chartData) {
      if (pt.distance >= zoomDomain[0] && pt.distance <= zoomDomain[1]) {
        if (pt.elevation < zMin) zMin = pt.elevation;
        if (pt.elevation > zMax) zMax = pt.elevation;
      }
    }
    if (zMin === Infinity) zMin = minElevation;
    if (zMax === -Infinity) zMax = maxElevation;

    return { min: zMin, max: zMax };
  }, [chartData, zoomDomain, minElevation, maxElevation]);

  // Compute D3 linear scales for chart (respecting zoom domain)
  const xScale = useMemo(() => {
    return createLinearScale(effectiveDomain, [0, dimensions.width]);
  }, [effectiveDomain, dimensions.width]);

  const yScale = useMemo(() => {
    const { min, max } = zoomedElevationRange;
    const pad = (max - min) * 0.1 || 20;
    return createLinearScale(
      [min - pad, max + pad],
      [dimensions.height, 0],
    );
  }, [zoomedElevationRange, dimensions.height]);

  // ── Native Non-Passive Wheel Listener (Fixes page zoom/scroll issue) ──
  useEffect(() => {
    const el = chartAreaRef.current;
    if (!el) return;

    const onWheelNative = (e: WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();

      if (dimensions.width <= 0 || totalDistance <= 0) return;

      const rect = el.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseDist = xScale.invert(mouseX);

      const [domMin, domMax] = effectiveDomain;
      const domRange = domMax - domMin;

      const zoomIn = e.deltaY < 0;
      const factor = zoomIn ? (1 - ZOOM_FACTOR) : (1 + ZOOM_FACTOR);
      let newRange = domRange * factor;

      if (newRange < MIN_ZOOM_RANGE_METERS) {
        newRange = MIN_ZOOM_RANGE_METERS;
      }

      if (newRange >= totalDistance) {
        resetZoom();
        return;
      }

      const mouseRatio = (mouseDist - domMin) / domRange;
      let newMin = mouseDist - mouseRatio * newRange;
      let newMax = newMin + newRange;

      if (newMin < 0) {
        newMin = 0;
        newMax = newRange;
      }
      if (newMax > totalDistance) {
        newMax = totalDistance;
        newMin = Math.max(0, totalDistance - newRange);
      }

      setZoomDomain([newMin, newMax]);
    };

    el.addEventListener("wheel", onWheelNative, { passive: false });
    return () => {
      el.removeEventListener("wheel", onWheelNative);
    };
  }, [dimensions.width, totalDistance, xScale, effectiveDomain, resetZoom, setZoomDomain]);

  // Mouse / Touch Interaction Handlers
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!chartAreaRef.current || dimensions.width <= 0) return;
    const rect = chartAreaRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const dist = Math.max(0, Math.min(totalDistance, xScale.invert(mouseX)));

    setHoveredDistance(dist);

    if (onChartHover && hoveredPoint) {
      onChartHover(hoveredPoint.lat, hoveredPoint.lng, dist);
    }
  };

  const handleMouseLeave = () => {
    setHoveredDistance(null);
    if (onChartHover) {
      onChartHover(0, 0, null);
    }
  };

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!chartAreaRef.current || dimensions.width <= 0) return;
    const rect = chartAreaRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const dist = Math.max(0, Math.min(totalDistance, xScale.invert(mouseX)));

    setClickedDistance(dist);

    if (onChartClick && hoveredPoint) {
      onChartClick(hoveredPoint.lat, hoveredPoint.lng, dist);
    }
  };

  if (!isReady || dimensions.width <= 0 || dimensions.height <= 0) {
    return (
      <div
        ref={containerRef}
        className="w-full h-full min-h-[140px] flex flex-col bg-white/95 border border-slate-200/80 rounded-2xl overflow-hidden backdrop-blur-xl shadow-lg shadow-slate-200/50"
      >
        <div className="flex-1 flex items-center justify-center text-xs text-slate-400">
          Initializing elevation profile...
        </div>
      </div>
    );
  }

  const isZoomed = zoomDomain !== null;

  return (
    <div
      ref={containerRef}
      className="w-full h-full min-h-[140px] flex flex-col bg-white/95 border border-slate-200/80 rounded-2xl overflow-hidden backdrop-blur-xl shadow-lg shadow-slate-200/50 transition-all duration-300"
    >
      {/* Top Stats Header + Zoom Controls (Light Mode) */}
      <div className="flex items-center justify-between border-b border-slate-200/80 bg-slate-50/90">
        <ElevationStats
          totalDistance={totalDistance}
          totalElevationGain={totalElevationGain}
          maxElevation={maxElevation}
          minElevation={minElevation}
        />

        {/* Zoom Controls */}
        <div className="flex items-center gap-1.5 pr-3 flex-shrink-0">
          {isZoomed && (
            <button
              onClick={resetZoom}
              className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg transition-all duration-150 shadow-sm"
              title="Reset Zoom"
            >
              <svg className="w-3 h-3" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M1 1l5 5M15 1l-5 5M1 15l5-5M15 15l-5-5" strokeLinecap="round" />
                <rect x="5" y="5" width="6" height="6" rx="1" />
              </svg>
              Reset Zoom
            </button>
          )}
          <span className="text-[10px] text-slate-500 font-medium hidden sm:inline">
            Scroll to zoom
          </span>
        </div>
      </div>

      {/* Main Multi-Layer Chart Canvas Container */}
      <div
        ref={chartAreaRef}
        className="relative flex-1 w-full cursor-crosshair overflow-hidden bg-white"
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onClick={handleClick}
      >
        {/* Layer 1: Canvas Static Area Fill */}
        <ElevationCanvas
          data={chartData}
          width={dimensions.width}
          height={dimensions.height}
          xScale={xScale}
          yScale={yScale}
        />

        {/* Layer 2: Canvas Animated Participant Pointers (60fps rAF) */}
        <ElevationPointers
          participants={activeParticipants}
          width={dimensions.width}
          height={dimensions.height}
          xScale={xScale}
          yScale={yScale}
          selectedParticipantId={selectedParticipantId}
        />

        {/* Layer 3: SVG Axes, Gridlines, Start/Finish badges */}
        <ElevationAxes
          width={dimensions.width}
          height={dimensions.height}
          totalDistance={effectiveDomain[1] - effectiveDomain[0]}
          minElevation={zoomedElevationRange.min}
          maxElevation={zoomedElevationRange.max}
          xScale={xScale}
          yScale={yScale}
          domainStart={effectiveDomain[0]}
          isZoomed={isZoomed}
        />

        {/* Layer 4: SVG Hover Crosshair & Tooltip */}
        <ElevationTooltip
          hoveredDistance={hoveredDistance}
          hoveredPoint={hoveredPoint}
          width={dimensions.width}
          height={dimensions.height}
          xScale={xScale}
          yScale={yScale}
        />
      </div>
    </div>
  );
}

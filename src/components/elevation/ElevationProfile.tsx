"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
  onChartClick?: (lat: number, lng: number, distance: number) => void;
  onChartHover?: (lat: number, lng: number, distance: number | null) => void;
}

export function ElevationProfile({
  altitudeProfile,
  onChartClick,
  onChartHover,
}: ElevationProfileProps) {
  const containerRef = useRef<HTMLDivElement>(null);
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
  } = useElevationStore();

  const participants = useParticipantStore((state) => state.participants);
  const selectedParticipantId = useParticipantStore((state) => state.selectedParticipantId);

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

  // Compute D3 linear scales for chart
  const xScale = useMemo(() => {
    return createLinearScale([0, totalDistance || 1], [0, dimensions.width]);
  }, [totalDistance, dimensions.width]);

  const yScale = useMemo(() => {
    // Add 10% padding on top/bottom of elevation range
    const pad = (maxElevation - minElevation) * 0.1 || 20;
    return createLinearScale(
      [minElevation - pad, maxElevation + pad],
      [dimensions.height, 0],
    );
  }, [minElevation, maxElevation, dimensions.height]);

  // Mouse / Touch Interaction Handlers
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current || dimensions.width <= 0) return;
    const rect = containerRef.current.getBoundingClientRect();
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
    if (!containerRef.current || dimensions.width <= 0) return;
    const rect = containerRef.current.getBoundingClientRect();
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
        className="w-full h-full min-h-[140px] flex flex-col bg-slate-900/90 border border-white/10 rounded-2xl overflow-hidden backdrop-blur-xl"
      >
        <div className="flex-1 flex items-center justify-center text-xs text-slate-400">
          Initializing elevation profile...
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="w-full h-full min-h-[140px] flex flex-col bg-slate-900/90 border border-white/10 rounded-2xl overflow-hidden backdrop-blur-xl shadow-2xl transition-all duration-300"
    >
      {/* Top Stats Header */}
      <ElevationStats
        totalDistance={totalDistance}
        totalElevationGain={totalElevationGain}
        maxElevation={maxElevation}
        minElevation={minElevation}
      />

      {/* Main Multi-Layer Chart Canvas Container */}
      <div
        className="relative flex-1 w-full cursor-crosshair overflow-hidden"
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
          participants={participants}
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
          totalDistance={totalDistance}
          minElevation={minElevation}
          maxElevation={maxElevation}
          xScale={xScale}
          yScale={yScale}
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

"use client";

import { Activity, ArrowUpRight, Mountain, TrendingUp } from "lucide-react";

interface ElevationStatsProps {
  totalDistance: number;    // meters
  totalElevationGain: number; // meters
  maxElevation: number;     // meters
  minElevation: number;     // meters
}

export function ElevationStats({
  totalDistance,
  totalElevationGain,
  maxElevation,
  minElevation,
}: ElevationStatsProps) {
  const km = (totalDistance / 1000).toFixed(1);
  const gain = Math.round(totalElevationGain);
  const max = Math.round(maxElevation);
  const min = Math.round(minElevation);

  return (
    <div className="flex items-center justify-between px-4 py-2 bg-slate-950/70 border-b border-white/10 text-xs backdrop-blur-md">
      <div className="flex items-center space-x-4 overflow-x-auto no-scrollbar">
        {/* Total Distance */}
        <div className="flex items-center space-x-1.5 shrink-0">
          <Activity className="w-3.5 h-3.5 text-indigo-400" />
          <span className="text-slate-400">Distance:</span>
          <span className="font-semibold text-slate-100">{km} km</span>
        </div>

        {/* Total Climb */}
        <div className="flex items-center space-x-1.5 shrink-0">
          <ArrowUpRight className="w-3.5 h-3.5 text-emerald-400" />
          <span className="text-slate-400">Climb:</span>
          <span className="font-semibold text-slate-100">+{gain} m</span>
        </div>

        {/* Peak Altitude */}
        <div className="flex items-center space-x-1.5 shrink-0">
          <Mountain className="w-3.5 h-3.5 text-sky-400" />
          <span className="text-slate-400">Peak:</span>
          <span className="font-semibold text-slate-100">{max} m</span>
        </div>

        {/* Min Altitude */}
        <div className="flex items-center space-x-1.5 shrink-0 hidden sm:flex">
          <TrendingUp className="w-3.5 h-3.5 text-amber-400" />
          <span className="text-slate-400">Lowest:</span>
          <span className="font-semibold text-slate-100">{min} m</span>
        </div>
      </div>
    </div>
  );
}

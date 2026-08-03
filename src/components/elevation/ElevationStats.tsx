"use client";

interface ElevationStatsProps {
  totalDistance: number;       // meters
  totalElevationGain: number;   // meters
  maxElevation: number;         // meters
  minElevation: number;         // meters
}

/**
 * Top Header Stats Bar (Light Mode).
 * Displays key route metrics (Total Distance, Climb Gain, Peak, Lowest point).
 */
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
    <div className="flex items-center gap-4 px-4 py-2 bg-slate-50/90 border-b border-slate-200/80 text-[11px] text-slate-600 font-medium overflow-x-auto select-none">
      <div className="flex items-center gap-1.5 flex-shrink-0">
        <span className="text-slate-400">📏</span>
        <span>Distance:</span>
        <span className="font-bold text-slate-900">{km} km</span>
      </div>

      <div className="h-3 w-[1px] bg-slate-200" />

      <div className="flex items-center gap-1.5 flex-shrink-0">
        <span className="text-emerald-500 font-bold">▲</span>
        <span>Climb Gain:</span>
        <span className="font-bold text-slate-900">+{gain} m</span>
      </div>

      <div className="h-3 w-[1px] bg-slate-200" />

      <div className="flex items-center gap-1.5 flex-shrink-0">
        <span className="text-indigo-500">⛰️</span>
        <span>Peak:</span>
        <span className="font-bold text-slate-900">{max} m</span>
      </div>

      <div className="h-3 w-[1px] bg-slate-200" />

      <div className="flex items-center gap-1.5 flex-shrink-0">
        <span className="text-sky-500">📉</span>
        <span>Lowest:</span>
        <span className="font-bold text-slate-900">{min} m</span>
      </div>
    </div>
  );
}

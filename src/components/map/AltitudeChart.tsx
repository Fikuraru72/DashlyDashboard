"use client";

import React, { useMemo } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  ReferenceDot,
} from "recharts";
import { Info, Mountain, Footprints, Clock } from "lucide-react";

export interface AltitudePoint {
  distance: number;
  elevation: number;
  lat: number;
  lng: number;
  cumGain: number;
  cumLoss: number;
}

interface AltitudeChartProps {
  data: AltitudePoint[];
  hoveredDistance: number | null;
  onHover: (point: AltitudePoint | null) => void;
  participants?: any[];
  onParticipantClick?: (participant: any) => void;
}

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload as AltitudePoint;
    return (
      <div className="bg-slate-900/95 text-white p-3 rounded-xl shadow-2xl border border-white/20 text-xs backdrop-blur-md z-50">
        <p className="font-black text-cyan-400 mb-1">
          Dist: {(data.distance / 1000).toFixed(2)} km
        </p>
        <p className="text-slate-200 font-bold">
          Elev: <span className="font-black text-white">{Math.round(data.elevation)} m</span>
        </p>
        <div className="flex gap-3 mt-1.5 pt-1.5 border-t border-white/10 text-[10px] font-bold">
          <span className="text-emerald-400">Gain: +{data.cumGain}m</span>
          <span className="text-rose-400">Loss: -{data.cumLoss}m</span>
        </div>
      </div>
    );
  }
  return null;
};

export default function AltitudeChart({
  data,
  hoveredDistance,
  onHover,
  participants = [],
  onParticipantClick,
}: AltitudeChartProps) {
  if (!data || data.length === 0) return null;

  // Find max and min elevation for stats display
  const stats = useMemo(() => {
    let minE = data[0].elevation;
    let maxE = data[0].elevation;
    let peakPoint = data[0];

    data.forEach((pt) => {
      if (pt.elevation < minE) minE = pt.elevation;
      if (pt.elevation > maxE) {
        maxE = pt.elevation;
        peakPoint = pt;
      }
    });

    return {
      minElev: Math.round(minE),
      maxElev: Math.round(maxE),
      gain: Math.round(data[data.length - 1].cumGain || maxE - minE),
      peakPoint,
    };
  }, [data]);

  const haversineMeters = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
    const R = 6371000;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  };

  const findClosestRoutePoint = (pLat: number, pLng: number): { distance: number; elevation: number } => {
    let closest = data[0];
    let minMeters = haversineMeters(data[0].lat, data[0].lng, pLat, pLng);
    for (let i = 1; i < data.length; i++) {
      const m = haversineMeters(data[i].lat, data[i].lng, pLat, pLng);
      if (m < minMeters) {
        minMeters = m;
        closest = data[i];
      }
    }
    return { distance: closest.distance, elevation: closest.elevation };
  };

  const getElevationAtDistance = (dist: number): number => {
    if (data.length === 0) return 0;
    if (dist <= data[0].distance) return data[0].elevation;
    if (dist >= data[data.length - 1].distance) return data[data.length - 1].elevation;

    let lo = 0;
    let hi = data.length - 1;
    while (lo < hi - 1) {
      const mid = (lo + hi) >>> 1;
      if (data[mid].distance <= dist) lo = mid;
      else hi = mid;
    }

    const d0 = data[lo].distance;
    const d1 = data[hi].distance;
    const e0 = data[lo].elevation;
    const e1 = data[hi].elevation;

    if (d1 === d0) return e0;
    const t = (dist - d0) / (d1 - d0);
    return e0 + (e1 - e0) * t;
  };

  return (
    <div className="w-full h-full relative flex flex-col" onMouseLeave={() => onHover(null)}>
      {/* ── RACEMAP TOP CONTROL BAR & ELEVATION STATS ── */}
      <div className="absolute top-1 left-4 right-4 z-20 flex items-center justify-between pointer-events-none">
        {/* Left Stats: Min/Max Altitude */}
        <div className="flex items-center gap-3 bg-slate-900/80 backdrop-blur-md px-3 py-1 rounded-xl border border-white/10 text-white font-mono text-[10px] font-black pointer-events-auto shadow-lg">
          <span className="text-slate-300">{stats.minElev} m</span>
          <span className="text-cyan-400">↑ {stats.gain} m</span>
          <span className="text-amber-400">{stats.maxElev} m</span>
        </div>

        {/* Center Control Pills Bar (Racemap Style) */}
        <div className="flex items-center gap-1 bg-slate-900/80 backdrop-blur-md p-1 rounded-2xl border border-white/15 shadow-xl pointer-events-auto">
          <button className="p-1.5 hover:bg-white/15 rounded-xl text-slate-300 hover:text-white transition-colors" title="Info">
            <Info size={14} />
          </button>
          <button className="p-1.5 bg-indigo-600 rounded-xl text-white shadow-md" title="Elevation Profile">
            <Mountain size={14} />
          </button>
          <button className="p-1.5 hover:bg-white/15 rounded-xl text-slate-300 hover:text-white transition-colors" title="Live Runners">
            <Footprints size={14} />
          </button>
          <button className="p-1.5 hover:bg-white/15 rounded-xl text-slate-300 hover:text-white transition-colors" title="Timing">
            <Clock size={14} />
          </button>
        </div>
      </div>

      {/* ── RECHARTS ELEVATION CANVAS ── */}
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={data}
          margin={{ top: 40, right: 20, left: 10, bottom: 5 }}
          onMouseMove={(e: any) => {
            if (e && e.activePayload && e.activePayload.length > 0) {
              onHover(e.activePayload[0].payload);
            }
          }}
        >
          <defs>
            {/* Racemap Translucent White Topo Gradient */}
            <linearGradient id="racemapWhiteGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#ffffff" stopOpacity={0.65} />
              <stop offset="60%" stopColor="#e2e8f0" stopOpacity={0.35} />
              <stop offset="100%" stopColor="#cbd5e1" stopOpacity={0.15} />
            </linearGradient>
          </defs>

          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255, 255, 255, 0.15)" />
          
          <XAxis
            dataKey="distance"
            tickFormatter={(val) => `${(val / 1000).toFixed(1)} km`}
            stroke="#ffffff"
            fontSize={10}
            fontWeight="800"
            minTickGap={40}
            axisLine={{ stroke: "#ffffff", strokeWidth: 3 }}
            tickLine={false}
          />
          <YAxis
            stroke="#ffffff"
            fontSize={10}
            fontWeight="800"
            domain={["dataMin - 10", "dataMax + 20"]}
            tickFormatter={(val) => `${val} m`}
            width={45}
            axisLine={false}
            tickLine={false}
          />
          
          <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#00e5ff', strokeWidth: 1.5, strokeDasharray: '4 4' }} />

          {hoveredDistance !== null && (
            <ReferenceLine x={hoveredDistance} stroke="#00e5ff" strokeDasharray="3 3" strokeWidth={2} />
          )}

          {/* RACEMAP CHECKPOINT / MILESTONE BADGES (Orange Flags) */}
          <ReferenceDot
            x={data[0].distance}
            y={data[0].elevation}
            r={0}
            label={{
              value: "START",
              position: "top",
              fill: "#ffffff",
              fontSize: 9,
              fontWeight: "900",
              className: "bg-amber-600 px-2 py-0.5 rounded text-white shadow uppercase border border-amber-400/50",
            }}
          />
          {stats.peakPoint && (
            <ReferenceDot
              x={stats.peakPoint.distance}
              y={stats.peakPoint.elevation}
              r={0}
              label={{
                value: `PEAK ${stats.maxElev}m`,
                position: "top",
                fill: "#ffffff",
                fontSize: 9,
                fontWeight: "900",
                className: "bg-orange-500 px-2 py-0.5 rounded text-white shadow uppercase border border-orange-300/50",
              }}
            />
          )}
          <ReferenceDot
            x={data[data.length - 1].distance}
            y={data[data.length - 1].elevation}
            r={0}
            label={{
              value: "FINISH",
              position: "top",
              fill: "#ffffff",
              fontSize: 9,
              fontWeight: "900",
              className: "bg-rose-600 px-2 py-0.5 rounded text-white shadow uppercase border border-rose-400/50",
            }}
          />

          {/* Main Translucent Silhouette Mountain Area */}
          <Area
            type="monotone"
            dataKey="elevation"
            stroke="#ffffff"
            strokeWidth={3}
            fillOpacity={1}
            fill="url(#racemapWhiteGradient)"
            isAnimationActive={false}
          />

          {/* ── REAL-TIME PARTICIPANT RUNNER DOTS & CYAN VERTICAL PIN LINES ── */}
          {participants
            .filter((p) => typeof p.lat === "number" && typeof p.lng === "number" && !isNaN(p.lat) && !isNaN(p.lng))
            .map((p) => {
              let pDist: number;
              const rawDist = p.routeDistance !== undefined && p.routeDistance !== null ? parseFloat(p.routeDistance) : NaN;

              if (!isNaN(rawDist) && rawDist >= 0) {
                pDist = rawDist;
              } else {
                const pLat = parseFloat(p.lat);
                const pLng = parseFloat(p.lng);
                const routePoint = findClosestRoutePoint(pLat, pLng);
                pDist = routePoint.distance;
              }

              // Derive exact Y height on silhouette line
              const pElev = getElevationAtDistance(pDist);
              const pColor = p.color || "#00e5ff"; // default cyan/indigo
              const bibLabel = p.bibNumber ? `${p.bibNumber}` : p.name ? p.name.substring(0, 4) : `P-${p.id}`;

              return (
                <g key={`racemap-participant-${p.id}`}>
                  {/* Vertical Cyan Pin Line (Racemap Drop Line) */}
                  <ReferenceLine
                    segment={[
                      { x: pDist, y: pElev },
                      { x: pDist, y: pElev + 35 },
                    ]}
                    stroke="#00e5ff"
                    strokeWidth={2}
                  />

                  {/* Runner Position Dot on Slope */}
                  <ReferenceDot
                    x={pDist}
                    y={pElev}
                    r={6}
                    fill={pColor}
                    stroke="#ffffff"
                    strokeWidth={2}
                    style={{ cursor: "pointer" }}
                    onClick={() => onParticipantClick?.(p)}
                  />

                  {/* White BIB Number Badge above Cyan Pin Line */}
                  <ReferenceDot
                    x={pDist}
                    y={pElev + 38}
                    r={0}
                    style={{ cursor: "pointer" }}
                    onClick={() => onParticipantClick?.(p)}
                    label={{
                      value: bibLabel,
                      position: "top",
                      fill: "#ffffff",
                      fontSize: 11,
                      fontWeight: "900",
                      className: "text-white font-black drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] cursor-pointer",
                    }}
                  />
                </g>
              );
            })}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

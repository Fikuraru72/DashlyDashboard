"use client";

import React from "react";
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
  hoveredDistance: number | null; // From map interaction
  onHover: (point: AltitudePoint | null) => void; // To map interaction
  participants?: any[];
  onParticipantClick?: (participant: any) => void;
}

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload as AltitudePoint;
    return (
      <div className="bg-slate-800 text-white p-3 rounded-lg shadow-xl border border-slate-700 text-xs z-50 relative">
        <p className="font-bold text-emerald-400 mb-1">
          Dist: {(data.distance / 1000).toFixed(2)} km
        </p>
        <p className="text-slate-300">
          Elev: <span className="font-semibold">{Math.round(data.elevation)}m</span>
        </p>
        <p className="text-emerald-500">
          Gain: +{data.cumGain}m
        </p>
        <p className="text-rose-500">
          Loss: -{data.cumLoss}m
        </p>
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

  // Fallback Haversine distance calculation in meters (used only if routeDistance is missing)
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

  return (
    <div className="w-full h-full relative" onMouseLeave={() => onHover(null)}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={data}
          margin={{ top: 25, right: 20, left: 0, bottom: 0 }}
          onMouseMove={(e: any) => {
            if (e && e.activePayload && e.activePayload.length > 0) {
              onHover(e.activePayload[0].payload);
            }
          }}
        >
          <defs>
            <linearGradient id="colorElevation" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10b981" stopOpacity={0.8} />
              <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" />
          <XAxis
            dataKey="distance"
            tickFormatter={(val) => `${(val / 1000).toFixed(1)}km`}
            stroke="#94a3b8"
            fontSize={10}
            minTickGap={30}
          />
          <YAxis
            stroke="#94a3b8"
            fontSize={10}
            domain={["dataMin - 10", "dataMax + 10"]}
            tickFormatter={(val) => `${val}m`}
            width={40}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#cbd5e1', strokeWidth: 1, strokeDasharray: '4 4' }} />
          {hoveredDistance !== null && (
            <ReferenceLine x={hoveredDistance} stroke="#f43f5e" strokeDasharray="3 3" />
          )}

          {/* Render main elevation profile area FIRST so dots draw ON TOP */}
          <Area
            type="monotone"
            dataKey="elevation"
            stroke="#10b981"
            strokeWidth={2.5}
            fillOpacity={1}
            fill="url(#colorElevation)"
            isAnimationActive={false}
          />

          {/* Render real-time markers for all participants ON TOP of the elevation area */}
          {participants
            .filter((p) => typeof p.lat === "number" && typeof p.lng === "number" && !isNaN(p.lat) && !isNaN(p.lng))
            .map((p) => {
              // Direct O(1) rendering using pre-calculated backend routeDistance and routeElevation
              let pDist = typeof p.routeDistance === "number" ? p.routeDistance : undefined;
              let pElev = typeof p.routeElevation === "number" ? p.routeElevation : undefined;

              // Fallback to spatial matching only if backend routeDistance is absent
              if (pDist === undefined || pElev === undefined || (pDist === 0 && pElev === 0)) {
                const pLat = parseFloat(p.lat);
                const pLng = parseFloat(p.lng);
                const routePoint = findClosestRoutePoint(pLat, pLng);
                pDist = routePoint.distance;
                pElev = routePoint.elevation;
              }

              const pColor = p.color || "#6366f1"; // default indigo
              const labelName = p.bibNumber ? `#${p.bibNumber}` : p.name ? p.name.split(" ")[0] : `P-${p.id}`;

              return (
                <ReferenceDot
                  key={`participant-chart-${p.id}`}
                  x={pDist}
                  y={pElev}
                  r={8}
                  fill={pColor}
                  stroke="#ffffff"
                  strokeWidth={2.5}
                  style={{ cursor: "pointer" }}
                  onClick={() => onParticipantClick?.(p)}
                  label={{
                    value: labelName,
                    position: "top",
                    fill: "#ffffff",
                    fontSize: 10,
                    fontWeight: "900",
                    className: "bg-slate-900 px-1.5 py-0.5 rounded shadow cursor-pointer border border-white/30",
                  }}
                />
              );
            })}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

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

  // Helper to interpolate elevation at distance
  const getElevationAtDistance = (targetDist: number): number => {
    if (data.length === 0) return 0;
    let closest = data[0];
    let minDiff = Math.abs(data[0].distance - targetDist);
    for (let i = 1; i < data.length; i++) {
      const diff = Math.abs(data[i].distance - targetDist);
      if (diff < minDiff) {
        minDiff = diff;
        closest = data[i];
      }
    }
    return closest.elevation;
  };

  return (
    <div className="w-full h-full relative" onMouseLeave={() => onHover(null)}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={data}
          margin={{ top: 15, right: 15, left: 0, bottom: 0 }}
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

          {/* Render markers for all participants on the elevation curve */}
          {participants
            .filter((p) => typeof p.lat === "number" && typeof p.lng === "number")
            .map((p) => {
              const pDist = ((p.distance || p.totalDistance || 0) * 1000);
              const pElev = getElevationAtDistance(pDist);
              const pColor = p.color || "#10b981";
              const labelName = p.bibNumber ? `#${p.bibNumber}` : p.name ? p.name.split(" ")[0] : `P-${p.id}`;

              return (
                <ReferenceDot
                  key={`participant-chart-${p.id}`}
                  x={pDist}
                  y={pElev}
                  r={7}
                  fill={pColor}
                  stroke="#ffffff"
                  strokeWidth={2}
                  style={{ cursor: "pointer" }}
                  onClick={() => onParticipantClick?.(p)}
                  label={{
                    value: labelName,
                    position: "top",
                    fill: "#ffffff",
                    fontSize: 9,
                    fontWeight: "bold",
                    className: "bg-slate-900 px-1 rounded shadow cursor-pointer",
                  }}
                />
              );
            })}

          <Area
            type="monotone"
            dataKey="elevation"
            stroke="#10b981"
            strokeWidth={2}
            fillOpacity={1}
            fill="url(#colorElevation)"
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

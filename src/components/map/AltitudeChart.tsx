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

  // Real-time spatial matching: Find closest point on route to participant's GPS (lat, lng)
  const findClosestRoutePoint = (pLat: number, pLng: number): { distance: number; elevation: number } => {
    let closest = data[0];
    let minSqDist = Math.pow(data[0].lat - pLat, 2) + Math.pow(data[0].lng - pLng, 2);
    for (let i = 1; i < data.length; i++) {
      const sqDist = Math.pow(data[i].lat - pLat, 2) + Math.pow(data[i].lng - pLng, 2);
      if (sqDist < minSqDist) {
        minSqDist = sqDist;
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
          margin={{ top: 20, right: 20, left: 0, bottom: 0 }}
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

          {/* Render real-time markers for all participants on the elevation curve */}
          {participants
            .filter((p) => typeof p.lat === "number" && typeof p.lng === "number" && !isNaN(p.lat) && !isNaN(p.lng))
            .map((p) => {
              // Real-time position matching
              const pLat = parseFloat(p.lat);
              const pLng = parseFloat(p.lng);
              const routePoint = findClosestRoutePoint(pLat, pLng);
              const pDist = routePoint.distance;
              const pElev = p.altitude != null ? parseFloat(p.altitude) : routePoint.elevation;
              const pColor = p.color || "#10b981";
              const labelName = p.bibNumber ? `#${p.bibNumber}` : p.name ? p.name.split(" ")[0] : `P-${p.id}`;

              return (
                <ReferenceDot
                  key={`participant-chart-${p.id}`}
                  x={pDist}
                  y={pElev}
                  r={8}
                  fill={pColor}
                  stroke="#ffffff"
                  strokeWidth={2}
                  style={{ cursor: "pointer" }}
                  onClick={() => onParticipantClick?.(p)}
                  label={{
                    value: labelName,
                    position: "top",
                    fill: "#ffffff",
                    fontSize: 10,
                    fontWeight: "bold",
                    className: "bg-slate-900 px-1.5 py-0.5 rounded shadow cursor-pointer border border-white/20",
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

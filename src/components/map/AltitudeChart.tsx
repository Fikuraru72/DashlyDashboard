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
}: AltitudeChartProps) {
  if (!data || data.length === 0) return null;

  return (
    <div className="w-full h-full relative" onMouseLeave={() => onHover(null)}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={data}
          margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
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

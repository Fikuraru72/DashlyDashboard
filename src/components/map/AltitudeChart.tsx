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
      <div className="bg-slate-900 text-white p-3 rounded-xl shadow-xl border border-slate-700 text-xs z-50">
        <p className="font-black text-indigo-400 mb-1">
          Dist: {(data.distance / 1000).toFixed(2)} km
        </p>
        <p className="text-slate-200 font-bold">
          Elev: <span className="font-black text-white">{Math.round(data.elevation)} m</span>
        </p>
        <div className="flex gap-3 mt-1.5 pt-1.5 border-t border-slate-800 text-[10px] font-bold">
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

  // High-precision flat-earth meter space segment projection with loop-intersection bias
  const findClosestRoutePoint = (pLat: number, pLng: number): { distance: number; elevation: number } => {
    if (!data || data.length === 0) return { distance: 0, elevation: 0 };
    if (data.length === 1) return { distance: data[0].distance, elevation: data[0].elevation };

    // Distance to official start line (node 0)
    const distToStart = haversineMeters(data[0].lat, data[0].lng, pLat, pLng);

    // Pass 1: Find closest node index to constrain candidate segment window
    let minNodeMeters = Infinity;
    let closestIdx = 0;
    for (let i = 0; i < data.length; i++) {
      const d = haversineMeters(data[i].lat, data[i].lng, pLat, pLng);

      // Loop Penalty: If participant is near Start (<150m), penalize distant nodes (>1000m) so loop intersections don't hijack position
      let effectiveDist = d;
      if (distToStart < 150 && data[i].distance > 1000) {
        effectiveDist += 300;
      }

      if (effectiveDist < minNodeMeters) {
        minNodeMeters = effectiveDist;
        closestIdx = i;
      }
    }

    // Pass 2: Evaluate adjacent segments in local flat-earth meter space around closest node
    const startSeg = Math.max(0, closestIdx - 3);
    const endSeg = Math.min(data.length - 2, closestIdx + 2);

    const cosLat = Math.cos((pLat * Math.PI) / 180);
    const px = pLng * cosLat * 111320;
    const py = pLat * 111320;

    let minSegMeters = Infinity;
    let bestDistance = data[closestIdx].distance;
    let bestElevation = data[closestIdx].elevation;

    for (let i = startSeg; i <= endSeg; i++) {
      const a = data[i];
      const b = data[i + 1];

      const ax = a.lng * cosLat * 111320;
      const ay = a.lat * 111320;
      const bx = b.lng * cosLat * 111320;
      const by = b.lat * 111320;

      const dx = bx - ax;
      const dy = by - ay;
      const lenSq = dx * dx + dy * dy;

      let t = 0;
      if (lenSq > 0) {
        t = ((px - ax) * dx + (py - ay) * dy) / lenSq;
        t = Math.max(0, Math.min(1, t)); // clamp t to segment [0, 1]
      }

      const projX = ax + t * dx;
      const projY = ay + t * dy;

      const perpMeters = Math.sqrt((px - projX) * (px - projX) + (py - projY) * (py - projY));

      if (perpMeters < minSegMeters) {
        minSegMeters = perpMeters;
        const segLength = b.distance - a.distance;
        bestDistance = a.distance + t * segLength;
        bestElevation = a.elevation + t * (b.elevation - a.elevation);
      }
    }

    return { distance: bestDistance, elevation: bestElevation };
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
    <div className="w-full h-full relative flex flex-col bg-white text-slate-900" onMouseLeave={() => onHover(null)}>
      {/* ── KETERANGAN STATS ELEVASI (HILANGKAN ICON, HANYA KETERANGAN TEKS JELAS) ── */}
      <div className="absolute top-0 left-4 z-20 flex items-center pointer-events-none">
        <div className="flex items-center gap-3 bg-slate-100/90 backdrop-blur-md px-3.5 py-1 rounded-xl border border-slate-200/90 text-slate-800 text-[11px] font-black pointer-events-auto shadow-sm">
          <div className="flex items-center gap-1">
            <span className="text-slate-500 font-bold uppercase text-[9px]">Start Alt:</span>
            <span className="text-slate-900 font-black">{stats.minElev} m</span>
          </div>
          <div className="w-px h-3.5 bg-slate-300"></div>
          <div className="flex items-center gap-1">
            <span className="text-sky-600 font-bold uppercase text-[9px]">Elev Gain:</span>
            <span className="text-sky-700 font-black">↑ {stats.gain} m</span>
          </div>
          <div className="w-px h-3.5 bg-slate-300"></div>
          <div className="flex items-center gap-1">
            <span className="text-amber-600 font-bold uppercase text-[9px]">Max Alt:</span>
            <span className="text-amber-700 font-black">{stats.maxElev} m</span>
          </div>
        </div>
      </div>

      {/* ── RECHARTS ELEVATION CANVAS (HIGH-CONTRAST LIGHT MODE) ── */}
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={data}
          margin={{ top: 32, right: 20, left: 10, bottom: 5 }}
          onMouseMove={(e: any) => {
            if (e && e.activePayload && e.activePayload.length > 0) {
              onHover(e.activePayload[0].payload);
            } else {
              onHover(null);
            }
          }}
          onMouseLeave={() => onHover(null)}
        >
          <defs>
            {/* Crisp High-Contrast Light Mode Indigo Silhouette Gradient */}
            <linearGradient id="lightModeElevationGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#4f46e5" stopOpacity={0.35} />
              <stop offset="70%" stopColor="#6366f1" stopOpacity={0.12} />
              <stop offset="100%" stopColor="#818cf8" stopOpacity={0.02} />
            </linearGradient>
          </defs>

          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
          
          <XAxis
            dataKey="distance"
            tickFormatter={(val) => `${(val / 1000).toFixed(1)} km`}
            stroke="#334155"
            fontSize={10}
            fontWeight="800"
            minTickGap={40}
            axisLine={{ stroke: "#0f172a", strokeWidth: 3 }}
            tickLine={false}
          />
          <YAxis
            stroke="#334155"
            fontSize={10}
            fontWeight="800"
            domain={["dataMin - 10", "dataMax + 20"]}
            tickFormatter={(val) => `${val} m`}
            width={45}
            axisLine={false}
            tickLine={false}
          />
          
          <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#0284c7', strokeWidth: 1.5, strokeDasharray: '4 4' }} />

          {hoveredDistance !== null && (
            <ReferenceLine x={hoveredDistance} stroke="#0284c7" strokeDasharray="3 3" strokeWidth={2} />
          )}

          {/* CHECKPOINT / MILESTONE BADGES */}
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
              className: "bg-emerald-600 px-2 py-0.5 rounded text-white shadow uppercase border border-emerald-500",
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
                className: "bg-amber-500 px-2 py-0.5 rounded text-white shadow uppercase border border-amber-400",
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
              className: "bg-rose-600 px-2 py-0.5 rounded text-white shadow uppercase border border-rose-500",
            }}
          />

          {/* Main High-Contrast Indigo Topo Area Silhouette (LINEAR type for exact slope alignment) */}
          <Area
            type="linear"
            dataKey="elevation"
            stroke="#4f46e5"
            strokeWidth={3}
            fillOpacity={1}
            fill="url(#lightModeElevationGradient)"
            isAnimationActive={false}
          />

          {/* ── REAL-TIME PARTICIPANT RUNNER DOTS & CYAN VERTICAL PIN LINES ── */}
          {participants
            .filter((p) => {
              const lat = parseFloat(p.lat);
              const lng = parseFloat(p.lng);
              return !isNaN(lat) && !isNaN(lng);
            })
            .map((p, index) => {
              const pLat = parseFloat(p.lat);
              const pLng = parseFloat(p.lng);
              const maxRouteDist = data[data.length - 1].distance;
              const minRouteDist = data[0].distance;

              let pDist: number;
              const rawDist = p.routeDistance !== undefined && p.routeDistance !== null && p.routeDistance !== "" ? parseFloat(p.routeDistance) : NaN;
              const routePoint = findClosestRoutePoint(pLat, pLng);

              if (!isNaN(rawDist) && rawDist >= 0) {
                pDist = rawDist;
              } else {
                pDist = routePoint.distance;
              }

              // Clamp distance to valid route bounds to ensure X-axis domain match
              const clampedDist = Math.max(minRouteDist, Math.min(maxRouteDist, pDist));

              // Derive exact Y height on silhouette line
              const pElev = getElevationAtDistance(clampedDist);
              const pColor = p.color || "#0284c7"; // default sky blue
              const pId = String(p.userId || p.participantId || p.id || p.bibNumber || `idx-${index}`);
              const bibLabel = p.bibNumber ? `#${p.bibNumber}` : p.name ? p.name.substring(0, 5) : `P-${pId}`;

              return (
                <ReferenceDot
                  key={`racemap-participant-${pId}`}
                  x={clampedDist}
                  y={pElev}
                  r={0}
                  shape={(props: any) => {
                    // Extract exact SVG pixel coordinates from Recharts scale props
                    let cx = typeof props.cx === "number" && !isNaN(props.cx) ? props.cx : null;
                    let cy = typeof props.cy === "number" && !isNaN(props.cy) ? props.cy : null;

                    // Fallback pixel calculation from viewBox if scale prop is pending
                    if (cx == null) {
                      const viewBox = props.viewBox || {};
                      const width = viewBox.width || 800;
                      const left = viewBox.x || 55;
                      const ratio = maxRouteDist > minRouteDist ? (clampedDist - minRouteDist) / (maxRouteDist - minRouteDist) : 0;
                      cx = left + ratio * (width - left - 30);
                    }

                    if (cy == null) {
                      const viewBox = props.viewBox || {};
                      const height = viewBox.height || 200;
                      const top = viewBox.y || 32;
                      const minE = stats.minElev - 10;
                      const maxE = stats.maxElev + 20;
                      const ratio = maxE > minE ? (pElev - minE) / (maxE - minE) : 0;
                      cy = top + (1 - ratio) * (height - top - 37);
                    }

                    return (
                      <g
                        style={{ cursor: "pointer" }}
                        onClick={() => onParticipantClick?.(p)}
                      >
                        {/* Vertical Cyan Drop Pin Line */}
                        <line
                          x1={cx}
                          y1={cy}
                          x2={cx}
                          y2={cy - 28}
                          stroke="#0284c7"
                          strokeWidth={2.5}
                        />

                        {/* Outer Glow Ring for High Visibility */}
                        <circle
                          cx={cx}
                          cy={cy}
                          r={10}
                          fill={pColor}
                          fillOpacity={0.3}
                        />

                        {/* Core Runner Position Dot on Slope */}
                        <circle
                          cx={cx}
                          cy={cy}
                          r={7}
                          fill={pColor}
                          stroke="#ffffff"
                          strokeWidth={2.5}
                        />

                        {/* White BIB Number Badge Box above Pin Line */}
                        <g transform={`translate(${cx}, ${cy - 42})`}>
                          <rect
                            x="-18"
                            y="-9"
                            width="36"
                            height="18"
                            rx="4"
                            fill="#0f172a"
                            stroke="#0284c7"
                            strokeWidth="1.5"
                          />
                          <text
                            x="0"
                            y="1"
                            fill="#ffffff"
                            fontSize="10"
                            fontWeight="900"
                            textAnchor="middle"
                            dominantBaseline="middle"
                          >
                            {bibLabel}
                          </text>
                        </g>
                      </g>
                    );
                  }}
                />
              );
            })}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ChevronLeft, User, Activity, Navigation, ShieldAlert } from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

export default function ParticipantDetailPage() {
  const { id: idParam } = useParams();
  const id = String(idParam);
  const router = useRouter();
  const [participant, setParticipant] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Mock data for speed chart. In a real scenario, this would be fetched from
  // the historical telemetry logs in the backend DB or Redis replay buffer.
  const [speedData] = useState([
    { time: "10:00", speed: 12 },
    { time: "10:05", speed: 14 },
    { time: "10:10", speed: 13 },
    { time: "10:15", speed: 15 },
    { time: "10:20", speed: 11 },
    { time: "10:25", speed: 12 },
    { time: "10:30", speed: 0 },
    { time: "10:35", speed: 0 },
    { time: "10:40", speed: 10 },
  ]);

  useEffect(() => {
    // In MVP, we might not have a direct endpoint for a single participant by ID
    // that returns full history yet, so we mock the fetch process.
    setTimeout(() => {
      setParticipant({
        id,
        name: `Participant #${id}`,
        bibNumber: "A-123",
        status: "TRACKING",
        distanceCovered: 12400, // meters
        speedCalculated: 3.5, // m/s
        progressPercentage: 45.2,
      });
      setLoading(false);
    }, 1000);
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-slate-500 animate-pulse">Loading participant data...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen w-full bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-50">
      {/* Header */}
      <header className="h-16 flex-shrink-0 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-6 flex items-center gap-4 shadow-sm">
        <button
          onClick={() => router.back()}
          className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
        >
          <ChevronLeft className="w-5 h-5 text-slate-500" />
        </button>
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <User className="w-5 h-5 text-indigo-500" />
            {participant?.name}
          </h1>
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-widest">
            BIB: {participant?.bibNumber || "--"}
          </p>
        </div>
      </header>

      <div className="flex-1 overflow-auto p-6 md:p-8">
        <div className="max-w-5xl mx-auto space-y-6">
          {/* Top Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <div className="flex items-center gap-2 text-slate-500 mb-2">
                <Activity className="w-4 h-4" />
                <span className="text-xs font-bold uppercase">Current Status</span>
              </div>
              <div className="text-2xl font-black text-indigo-600 dark:text-indigo-400">
                {participant?.status}
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <div className="flex items-center gap-2 text-slate-500 mb-2">
                <Navigation className="w-4 h-4" />
                <span className="text-xs font-bold uppercase">Distance Covered</span>
              </div>
              <div className="text-2xl font-black">
                {((participant?.distanceCovered || 0) / 1000).toFixed(2)} km
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <div className="flex items-center gap-2 text-slate-500 mb-2">
                <Activity className="w-4 h-4" />
                <span className="text-xs font-bold uppercase">Current Speed</span>
              </div>
              <div className="text-2xl font-black">
                {((participant?.speedCalculated || 0) * 3.6).toFixed(1)} km/h
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden">
              <div
                className="absolute inset-y-0 left-0 bg-indigo-500/10 dark:bg-indigo-500/20"
                style={{ width: `${participant?.progressPercentage || 0}%` }}
              ></div>
              <div className="flex items-center gap-2 text-slate-500 mb-2 relative z-10">
                <ShieldAlert className="w-4 h-4" />
                <span className="text-xs font-bold uppercase">Progress</span>
              </div>
              <div className="text-2xl font-black relative z-10">
                {(participant?.progressPercentage || 0).toFixed(1)}%
              </div>
            </div>
          </div>

          {/* Speed Chart */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
              <Activity className="w-5 h-5 text-emerald-500" />
              Speed History (km/h)
            </h3>
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={speedData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                  <XAxis
                    dataKey="time"
                    stroke="#94a3b8"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    stroke="#94a3b8"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) => `${value}`}
                  />
                  <Tooltip
                    contentStyle={{
                      borderRadius: "8px",
                      border: "none",
                      boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="speed"
                    stroke="#4f46e5"
                    strokeWidth={3}
                    dot={{ r: 4, strokeWidth: 2 }}
                    activeDot={{ r: 6, strokeWidth: 0 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

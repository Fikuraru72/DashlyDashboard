"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { History, Eye, CheckCircle2, Clock, ShieldAlert, Calendar } from "lucide-react";

export default function HistoryPage() {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const value = `; ${document.cookie}`;
        const parts = value.split(`; auth_token=`);
        const token = parts.length === 2 ? parts.pop()?.split(';').shift() : null;

        const res = await fetch(`http://localhost:3001/events`, {
          headers: {
            "Authorization": `Bearer ${token}`
          }
        });

        if (!res.ok) {
          throw new Error("Failed to fetch historical data");
        }
        
        const json = await res.json();
        setEvents(json.data || []);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    
    fetchEvents();
  }, []);

  const completedEvents = events.filter(e => e.status === 'FINISHED' || e.status === 'COMPLETED');

  return (
    <div className="flex-1 overflow-y-auto p-6 md:p-8 bg-slate-50/50 dark:bg-[#0f172a] font-sans h-full">
      <div className="mb-8 max-w-7xl mx-auto flex items-center gap-4">
        <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-900/40 rounded-full flex items-center justify-center shadow-inner">
            <History className="h-6 w-6 text-indigo-600 dark:text-cyan-400" />
        </div>
        <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-800 dark:text-slate-100">Race Archives</h1>
            <p className="text-slate-500 text-sm mt-1 font-medium">Review and analyze past racing events and their telemetry.</p>
        </div>
      </div>

      {loading && (
        <div className="max-w-7xl mx-auto flex items-center justify-center p-12 text-slate-500 animate-pulse font-bold tracking-widest uppercase">
          Loading Archives...
        </div>
      )}

      {error && (
        <div className="max-w-7xl mx-auto p-6 bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/30 text-rose-600 dark:text-rose-400 rounded-2xl font-bold flex items-center gap-3">
          <ShieldAlert className="w-6 h-6" />
          {error}
        </div>
      )}

      {!loading && !error && completedEvents.length === 0 && (
        <div className="max-w-7xl mx-auto flex flex-col items-center justify-center p-16 bg-white/50 dark:bg-slate-900/50 backdrop-blur rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-800 text-center">
          <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4">
            <CheckCircle2 className="w-8 h-8 text-slate-400" />
          </div>
          <h3 className="text-xl font-bold text-slate-800 dark:text-slate-300 tracking-tight">No Events Completed Yet</h3>
          <p className="text-slate-500 font-medium mt-2">When an active race concludes and is marked as "FINISHED", it will be permanently archived here.</p>
        </div>
      )}

      {!loading && !error && completedEvents.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-7xl mx-auto pb-12">
          {completedEvents.map((evt) => (
            <div
              key={evt.id}
              className="relative flex flex-col p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md shadow-sm opacity-90 transition-all hover:opacity-100 hover:-translate-y-1 hover:shadow-lg"
            >
              <div className="flex justify-between items-start mb-6">
                <div className="flex flex-col gap-1.5">
                  <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                    <Calendar size={12}/>
                    {new Date(evt.dateEvent || evt.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                  </span>
                  <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 uppercase tracking-tight leading-snug pr-2 grayscale opacity-90">{evt.name}</h3>
                </div>

                <div className="flex-shrink-0 px-2.5 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider border flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700">
                  <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                  Archived
                </div>
              </div>

              <div className="flex items-center justify-between mb-8 text-sm text-slate-500 dark:text-slate-400 font-medium bg-slate-50 dark:bg-slate-950/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800/60">
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] uppercase text-slate-400 font-bold tracking-widest">Final Load</span>
                  <span className="text-slate-700 dark:text-slate-300 text-lg font-black">{evt.currentCount} <span className="text-xs opacity-50">/ {evt.maxParticipants}</span></span>
                </div>
                <div className="w-px h-8 bg-slate-200 dark:bg-slate-800"></div>
                <div className="flex flex-col gap-1 text-right">
                  <span className="text-[10px] uppercase text-slate-400 font-bold tracking-widest">Archive ID</span>
                  <span className="text-slate-600 dark:text-slate-400 font-mono text-sm tracking-tight">{evt.id}</span>
                </div>
              </div>

              <div className="mt-auto">
                <Link
                  href={`/dashboard/events/${evt.id}`}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors shadow-sm"
                >
                  <Eye className="w-4 h-4 text-indigo-500 dark:text-cyan-400" />
                  View Historical Data
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

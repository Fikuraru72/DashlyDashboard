"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Activity, Eye, CheckCircle2, Clock, Plus, ShieldAlert } from "lucide-react";

export default function EventsPage() {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
        const value = `; ${document.cookie}`;
        const parts = value.split(`; auth_token=`);
        const token = parts.length === 2 ? parts.pop()?.split(';').shift() : null;

        const res = await fetch(`${apiUrl}/events`, {
          headers: {
            "Authorization": `Bearer ${token}`
          }
        });

        if (!res.ok) {
          throw new Error("Failed to fetch events directory");
        }
        
        const data = await res.json();
        const eventList = data.success ? data.data : (Array.isArray(data) ? data : []);
        setEvents(eventList);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchEvents();
    
    // Poll every 3 seconds to get immediate quota updates without WebSocket
    const interval = setInterval(fetchEvents, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex-1 overflow-y-auto p-6 md:p-8 bg-slate-50/50 dark:bg-[#0f172a] font-sans h-full">
      <div className="mb-8 max-w-7xl mx-auto flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-black tracking-tight text-slate-900 dark:text-slate-50">Event Directory</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-2 font-medium">Manage and monitor all racing events across the platform.</p>
        </div>
        
        <Link 
          href="/dashboard/events/create"
          className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition-all shadow-md hover:shadow-lg shadow-indigo-500/20 hover:-translate-y-0.5"
        >
          <Plus className="w-4 h-4" />
          Create New Event
        </Link>
      </div>

      {loading && (
        <div className="max-w-7xl mx-auto flex items-center justify-center p-12 text-slate-500 animate-pulse font-bold tracking-widest uppercase">
          Loading Directory...
        </div>
      )}

      {error && (
        <div className="max-w-7xl mx-auto p-6 bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/30 text-rose-600 dark:text-rose-400 rounded-2xl font-bold flex items-center gap-3">
          <ShieldAlert className="w-6 h-6" />
          {error}
        </div>
      )}

      {!loading && !error && events.filter(e => e.status !== 'FINISHED').length === 0 && (
        <div className="max-w-7xl mx-auto p-12 bg-white/50 dark:bg-slate-900/50 backdrop-blur rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-800 text-center text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">
          No Active Events Found. Create one to get started!
        </div>
      )}

      {!loading && !error && events.filter(e => e.status !== 'FINISHED').length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-7xl mx-auto pb-12">
          {events.filter(e => e.status !== 'FINISHED').map((evt) => (
              <div
              key={evt.id}
              className={`relative flex flex-col p-6 rounded-2xl border bg-white/80 dark:bg-slate-900/80 backdrop-blur-md shadow-sm transition-all group hover:-translate-y-1 hover:shadow-lg
                ${evt.status === 'START'
                  ? 'border-emerald-500/30 dark:border-emerald-500/30 shadow-[0_4px_20px_rgba(16,185,129,0.1)]'
                  : 'border-slate-200 dark:border-slate-800'
                }
              `}
            >
              {evt.status === 'START' && (
                <div className="absolute -top-px -left-px -right-px h-1 bg-gradient-to-r from-emerald-400 to-cyan-500 rounded-t-2xl shadow-[0_0_10px_rgba(52,211,153,0.5)]"></div>
              )}

              <div className="flex justify-between items-start mb-6">
                <div className="flex flex-col gap-1.5">
                  <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                    <Clock size={12}/>
                    {new Date(evt.dateEvent || evt.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                  </span>
                  <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 uppercase tracking-tight leading-snug pr-2">{evt.name}</h3>
                </div>

                <div className={`flex-shrink-0 px-2.5 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider border flex items-center gap-1.5
                  ${evt.status === 'START' || evt.status === 'LIVE' ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/30' :
                    evt.status === 'IDLE' || evt.status === 'READY' || evt.status === 'REGISTRATION_OPEN' ? 'bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-500/20' :
                    evt.status === 'DRAFT' || evt.status === 'REGISTRATION_CLOSED' ? 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700' :
                    evt.status === 'CANCELLED' ? 'bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-500/30' :
                      'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700'}
                `}>
                  {(evt.status === 'START' || evt.status === 'LIVE') && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>}
                  {evt.status === 'FINISHED' && <CheckCircle2 className="w-3 h-3" />}
                  {evt.status}
                </div>
              </div>

              <div className="flex items-center justify-between mb-8 text-sm text-slate-600 dark:text-slate-400 font-medium bg-slate-50/50 dark:bg-slate-950/30 p-4 rounded-xl border border-slate-100 dark:border-slate-800/60">
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] uppercase text-slate-400 font-bold tracking-widest">Load</span>
                  <span className="text-slate-800 dark:text-slate-200 text-lg font-black">{evt.currentCount} <span className="text-xs text-slate-500">/ {evt.maxParticipants}</span></span>
                </div>
                <div className="w-px h-8 bg-slate-200 dark:bg-slate-800"></div>
                <div className="flex flex-col gap-1 text-right">
                  <span className="text-[10px] uppercase text-slate-400 font-bold tracking-widest">Database ID</span>
                  <span className="text-indigo-600 dark:text-cyan-400 font-mono text-sm tracking-tight">{evt.id}</span>
                </div>
              </div>

              <div className="mt-auto flex items-center gap-3">
                {(evt.status === 'START' || evt.status === 'LIVE') && (
                  <Link
                    href={`/dashboard/monitoring/${evt.id}`}
                    className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-slate-900 to-slate-800 dark:from-indigo-600 dark:to-cyan-600 text-white px-4 py-3 rounded-xl text-sm font-bold shadow-[0_4px_14px_0_rgba(79,70,229,0.39)] hover:shadow-lg transition-all hover:scale-[1.02] border border-transparent dark:border-indigo-500/50"
                  >
                    <Activity className="w-4 h-4 animate-pulse" />
                    Live Monitor
                  </Link>
                )}
                <Link
                  href={`/dashboard/events/${evt.id}`}
                  className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-bold border transition-colors
                    ${(evt.status === 'START' || evt.status === 'LIVE') ? 'flex-[0.5] border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300' : 'flex-1 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800/80 shadow-sm hover:scale-[1.02] hover:bg-slate-50 dark:hover:bg-slate-800'}
                  `}
                >
                  <Eye className="w-4 h-4" />
                  {(evt.status === 'START' || evt.status === 'LIVE') ? 'Details' : 'Manage Event'}
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

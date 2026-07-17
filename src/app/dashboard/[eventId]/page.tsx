"use client";

import { authenticatedFetch } from "@/lib/api";
import React, { useEffect, useState, use } from "react";
import { useParticipantStore } from "@/store/useParticipantStore";
import { AlertTriangle, Navigation, Zap } from "lucide-react";
import { useSocket } from "@/hooks/useSocket";
import MapWrapper from "@/components/map/DynamicLiveMap";

export default function DashboardPage({ params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = use(params);

  const {
    participants,
    anomalies,
    eventMetadata,
    setParticipants,
    setEventMetadata,
    setSelectedParticipantId,
    selectedParticipantId,
  } = useParticipantStore();
  useSocket(eventId);

  const [isFlashing, setIsFlashing] = useState(false);

  // Trigger red flash when a new anomaly is added
  useEffect(() => {
    if (anomalies.length > 0) {
      setIsFlashing(true);
      const timer = setTimeout(() => setIsFlashing(false), 500);
      return () => clearTimeout(timer);
    }
  }, [anomalies.length]);

  // Fetch real event data from backend
  useEffect(() => {
    const fetchEventData = async () => {
      try {
        const value = `; ${document.cookie}`;
        const parts = value.split(`; auth_token=`);
        const token = parts.length === 2 ? parts.pop()?.split(";").shift() : null;

        const defaultBackendUrl =
          typeof window !== "undefined"
            ? `http://${window.location.hostname}:3001`
            : "http://localhost:3001";
        const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || defaultBackendUrl;
        const res = await authenticatedFetch(`${backendUrl}/events/${eventId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!res.ok) {
          console.error("Failed to fetch event data. Status:", res.status);
          // Return early instead of throwing to prevent crashing the page
          return;
        }

        const data = await res.json();
        const eventData = data.success ? data.data : data;
        // Map backend routeGeojson to store's routeGeoJSON if names differ,
        // but let's just pass the data and ensure store/map are aligned.
        setEventMetadata({
          id: eventData.id,
          name: eventData.name,
          dateEvent: eventData.dateEvent,
          routeGeoJSON: eventData.routeGeojson, // Mapping lowercase 'json' from backend to store's uppercase 'JSON'
        });

        // FIX: Changed from /live-positions (did not exist) to /live
        const positionsRes = await authenticatedFetch(`${backendUrl}/events/${eventId}/live`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (positionsRes.ok) {
          const positions = await positionsRes.json();
          console.log("[INIT] 🟢 Fetched live positions:", positions);
          const participantMap: Record<string, any> = {};
          positions.forEach((p: any) => {
            const pid = p.userId.toString();
            participantMap[pid] = {
              id: pid,
              name: p.name || `Runner ${pid}`, // Use real name from backend
              lat: parseFloat(p.lat),
              lng: parseFloat(p.lng),
              speed: parseFloat(p.speed) || 0,
              battery: parseInt(p.battery) || 100,
              status: p.isOffline === "true" ? "inactive" : "active",
              pathHistory: [[parseFloat(p.lat), parseFloat(p.lng)]],
            };
          });
          setParticipants(participantMap);
          console.log(
            "[INIT] ✅ setParticipants executed with map size:",
            Object.keys(participantMap).length,
          );
        } else {
          console.error("[INIT] 🔴 Fetch failed with status:", positionsRes.status);
        }
      } catch (err) {
        console.error("Error fetching event metadata or positions:", err);
      }
    };

    if (eventId) {
      void fetchEventData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId]); // FIX: Only eventId — store setters are stable and don't need to be deps

  const participantList = Object.values(participants);

  return (
    <div className="flex flex-1 overflow-hidden font-sans text-slate-900 dark:text-slate-50">
      {/* Sidebar Left: Leaderboard */}
      <aside className="w-80 flex-shrink-0 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col z-10 transition-colors">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-2">
            <Navigation className="h-4 w-4" /> Leaderboard
          </h2>
        </div>
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {participantList.map((p, idx) => (
            <div
              key={p.id}
              onClick={() => setSelectedParticipantId(p.id)}
              className={`flex items-center justify-between p-3 rounded-xl border transition-colors shadow-sm cursor-pointer
                  ${
                    selectedParticipantId === p.id
                      ? "border-indigo-400 dark:border-indigo-500 bg-indigo-50/80 dark:bg-indigo-900/40"
                      : "border-slate-100 dark:border-slate-800/60 bg-slate-50/50 dark:bg-slate-950/50 hover:bg-slate-100 dark:hover:bg-slate-800/80"
                  }`}
            >
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-indigo-100 dark:bg-slate-800 text-indigo-700 dark:text-cyan-400 font-bold text-sm">
                  {idx + 1}
                </div>
                <div className="flex flex-col">
                  <span className="font-semibold text-sm text-slate-800 dark:text-slate-200">
                    {p.name}
                  </span>
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    {p.status === "stuck" ? "Idle" : "Moving"}
                  </span>
                </div>
              </div>
              <div className="text-right flex flex-col items-end">
                <span className="font-bold text-sm text-indigo-600 dark:text-emerald-400">
                  {p.speed.toFixed(1)}{" "}
                  <span className="text-xs font-normal text-slate-500 dark:text-slate-400">
                    km/h
                  </span>
                </span>
                <div className="flex items-center gap-1 mt-0.5">
                  <Zap
                    className={`h-3 w-3 ${p.battery < 20 ? "text-rose-500" : "text-amber-500"}`}
                  />
                  <span className="text-[10px] text-slate-500 dark:text-slate-400">
                    {p.battery}%
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </aside>

      {/* Center Area: Live Map */}
      <main
        className={`flex-1 relative flex items-center justify-center overflow-hidden shadow-inner transition-colors duration-300 ${isFlashing ? "bg-rose-500/20" : "bg-slate-200/50 dark:bg-[#0f172a]"}`}
      >
        <MapWrapper routeGeojson={eventMetadata?.routeGeoJSON} livePositions={participants} />
        {/* Subtle Vignette Overlay for Depth */}
        <div className="absolute inset-0 pointer-events-none shadow-[inset_0_0_120px_rgba(0,0,0,0.15)] dark:shadow-[inset_0_0_120px_rgba(0,0,0,0.7)] z-20"></div>
        {/* Red Flash Overlay */}
        <div
          className={`absolute inset-0 pointer-events-none transition-opacity duration-300 z-30 ${isFlashing ? "opacity-100 bg-rose-500/20" : "opacity-0"}`}
        ></div>
      </main>

      {/* Sidebar Right: Alerts */}
      <aside className="w-80 flex-shrink-0 bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 flex flex-col z-10 transition-colors">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" /> Live Alerts
          </h2>
          <span className="flex items-center justify-center bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-400 text-xs font-bold w-6 h-6 rounded-full">
            {anomalies.length}
          </span>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {anomalies.map((alert) => (
            <div
              key={alert.id}
              className="relative overflow-hidden p-4 rounded-xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-950 shadow-sm hover:shadow-md transition-shadow group"
            >
              {/* Severity indicator line */}
              <div
                className={`absolute top-0 left-0 w-1 h-full ${
                  alert.type === "stuck"
                    ? "bg-amber-500 dark:bg-amber-400"
                    : "bg-rose-500 dark:bg-rose-400"
                }`}
              ></div>

              <div className="flex justify-between items-start mb-2 pl-2">
                <span
                  className={`text-xs font-bold uppercase tracking-wider ${
                    alert.type === "stuck"
                      ? "text-amber-600 dark:text-amber-400"
                      : "text-rose-600 dark:text-rose-400"
                  }`}
                >
                  {alert.type.replace("-", " ")}
                </span>
                <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                  {new Date(alert.timestamp).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>

              <p className="text-sm font-medium text-slate-700 dark:text-slate-300 leading-snug pl-2 mb-3">
                {alert.message}
              </p>

              <div className="pl-2 flex items-center gap-2">
                <span className="text-xs font-semibold px-2 py-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-md border border-slate-200 dark:border-slate-700">
                  ID: {alert.participantId}
                </span>
              </div>
            </div>
          ))}

          {anomalies.length === 0 && (
            <div className="flex flex-col items-center justify-center p-8 text-center text-slate-400 dark:text-slate-600">
              <AlertTriangle className="h-8 w-8 mb-2 opacity-20" />
              <span className="text-sm">System Normal</span>
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}

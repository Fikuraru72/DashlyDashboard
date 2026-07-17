"use client";

import React from "react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useParticipantStore } from "@/store/useParticipantStore";
import { usePathname } from "next/navigation";

export function Header() {
  const pathname = usePathname();
  const { eventMetadata, participants, anomalies, socketConnected } = useParticipantStore();

  const segments = pathname?.split("/").filter(Boolean) || [];
  const isMonitoring =
    segments.length === 2 &&
    segments[0] === "dashboard" &&
    !["events", "users", "history", "settings"].includes(segments[1]);

  const activeAnomaliesCount = anomalies.length;
  const totalParticipantsCount = Object.keys(participants).length;

  return (
    <header className="h-16 flex-shrink-0 bg-white/60 dark:bg-slate-900/60 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-4 md:px-6 flex items-center justify-between shadow-sm z-40 transition-colors sticky top-0">
      <div className="flex items-center gap-4">
        {/* Indent to accounts for mobile sidebar toggle */}
        <div className="pl-12 md:pl-0">
          <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-slate-800 to-slate-500 dark:from-slate-100 dark:to-slate-400 hidden sm:block">
            {isMonitoring ? "Mission Control" : "Dashly Platform"}
          </h1>
          {isMonitoring && eventMetadata?.name && (
            <div className="flex items-center gap-2">
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-widest hidden sm:block">
                {eventMetadata.name}
              </p>
              {eventMetadata.dateEvent && (
                <>
                  <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-600 hidden sm:block"></span>
                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-widest hidden sm:block">
                    {new Date(eventMetadata.dateEvent).toLocaleDateString(undefined, {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                  </p>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-4 md:gap-6">
        {isMonitoring && (
          <>
            <div className="hidden lg:flex items-center gap-4 mr-2">
              <div className="flex flex-col items-end">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  Participants
                </span>
                <span className="text-lg font-bold leading-none text-slate-800 dark:text-slate-200">
                  {totalParticipantsCount}
                </span>
              </div>
              <div className="h-6 w-px bg-slate-200 dark:bg-slate-700"></div>
              <div className="flex flex-col items-end">
                <span className="text-[10px] font-bold uppercase tracking-wider text-rose-500">
                  Alerts
                </span>
                <span className="text-lg font-bold leading-none text-rose-600 dark:text-rose-400">
                  {activeAnomaliesCount}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 rounded-full text-sm font-medium border border-slate-200 dark:border-slate-700 shadow-sm">
              <span
                className={`w-2 h-2 rounded-full shadow-lg ${socketConnected ? "bg-emerald-500 animate-pulse shadow-emerald-500/50" : "bg-rose-500 shadow-rose-500/50"}`}
              ></span>
              <span className="text-slate-700 dark:text-slate-300 hidden sm:inline font-bold text-[10px] md:text-xs uppercase tracking-wide">
                {socketConnected ? "Telemetry Up" : "Link Lost"}
              </span>
            </div>
          </>
        )}

        <ThemeToggle />
      </div>
    </header>
  );
}

"use client";

import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Activity, AlertTriangle, CheckCircle, Navigation } from "lucide-react";
import { apiFetch, API_URL } from "@/lib/api";

interface DashboardStats {
  totalActiveEvents: number;
  activeRunners: number;
  finishedRunners: number;
  sosAlerts: number;
  offRouteParticipants: number;
}

export default function DashboardOverview() {
  const { data: stats } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: async () => (await apiFetch<{ data: DashboardStats }>(`${API_URL}/admin/stats`)).data,
    refetchInterval: 10_000,
  });

  if (!stats) {
    return (
      <div className="p-8 h-full flex items-center justify-center text-slate-500">
        <p>Failed to load dashboard statistics. Ensure backend is running.</p>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 h-full overflow-y-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
          Dashboard Overview
        </h1>
        <p className="text-slate-500 mt-1">Live operational statistics for Dashly events.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-8">
        {/* Active Events */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-600 dark:text-slate-400">Active Events</h3>
            <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-lg">
              <CalendarIcon className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-black text-slate-900 dark:text-white">
            {stats.totalActiveEvents}
          </div>
        </div>

        {/* Active Runners */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-600 dark:text-slate-400">Live Participants</h3>
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg">
              <Activity className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-black text-slate-900 dark:text-white">
            {stats.activeRunners}
          </div>
        </div>

        {/* Finished Runners */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-600 dark:text-slate-400">Finished</h3>
            <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-lg">
              <CheckCircle className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-black text-slate-900 dark:text-white">
            {stats.finishedRunners}
          </div>
        </div>

        {/* SOS Alerts */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 relative overflow-hidden">
          {stats.sosAlerts > 0 && (
            <div className="absolute top-0 left-0 w-1 h-full bg-rose-500"></div>
          )}
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-600 dark:text-slate-400">SOS Alerts</h3>
            <div
              className={`p-2 rounded-lg ${stats.sosAlerts > 0 ? "bg-rose-100 text-rose-600 animate-pulse" : "bg-slate-100 text-slate-500"}`}
            >
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
          <div
            className={`text-3xl font-black ${stats.sosAlerts > 0 ? "text-rose-600" : "text-slate-900 dark:text-white"}`}
          >
            {stats.sosAlerts}
          </div>
        </div>

        {/* Off Route */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-600 dark:text-slate-400">Off Route Warnings</h3>
            <div className="p-2 bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-lg">
              <Navigation className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-black text-slate-900 dark:text-white">
            {stats.offRouteParticipants}
          </div>
        </div>
      </div>
    </div>
  );
}

// Simple icon for Calendar
function CalendarIcon(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
      <line x1="16" x2="16" y1="2" y2="6" />
      <line x1="8" x2="8" y1="2" y2="6" />
      <line x1="3" x2="21" y1="10" y2="10" />
    </svg>
  );
}

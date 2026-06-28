"use client";

import React, { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSocketStore } from "@/store/useSocketStore";
import { ChevronLeft, Trophy, Clock, Target, Flag } from "lucide-react";
import Link from "next/link";

export default function LeaderboardPage() {
  const { eventId } = useParams();
  const router = useRouter();
  
  const connect = useSocketStore((state) => state.connect);
  const joinEvent = useSocketStore((state) => state.joinEvent);
  const leaveEvent = useSocketStore((state) => state.leaveEvent);
  const leaderboard = useSocketStore((state) => state.leaderboard);
  const isConnected = useSocketStore((state) => state.isConnected);

  useEffect(() => {
    connect();
    if (eventId) {
      joinEvent(eventId as string);
    }
    return () => {
      if (eventId) leaveEvent(eventId as string);
    };
  }, [eventId, connect, joinEvent, leaveEvent]);

  return (
    <div className="flex flex-col h-screen w-full bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-50 transition-colors">
      {/* Header */}
      <header className="h-16 flex-shrink-0 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-6 flex items-center gap-4 shadow-sm z-10">
        <button 
          onClick={() => router.back()}
          className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
        >
          <ChevronLeft className="w-5 h-5 text-slate-500" />
        </button>
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Trophy className="w-5 h-5 text-amber-500" />
            Live Leaderboard
          </h1>
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-widest">
            {isConnected ? <span className="text-emerald-500">● Live Updates</span> : <span className="text-amber-500">● Connecting...</span>}
          </p>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 overflow-auto p-6 md:p-8">
        <div className="max-w-5xl mx-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-slate-500 dark:text-slate-400 uppercase bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th scope="col" className="px-6 py-4 font-bold tracking-wider">Rank</th>
                    <th scope="col" className="px-6 py-4 font-bold tracking-wider">Participant</th>
                    <th scope="col" className="px-6 py-4 font-bold tracking-wider">Progress</th>
                    <th scope="col" className="px-6 py-4 font-bold tracking-wider">Distance</th>
                    <th scope="col" className="px-6 py-4 font-bold tracking-wider">Speed</th>
                    <th scope="col" className="px-6 py-4 font-bold tracking-wider text-right">Est. Finish</th>
                  </tr>
                </thead>
                <tbody>
                  {leaderboard.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                        No leaderboard data available yet. Waiting for race to start.
                      </td>
                    </tr>
                  ) : (
                    leaderboard.map((entry, index) => (
                      <tr 
                        key={entry.userId} 
                        className={`border-b border-slate-100 dark:border-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-800/20 transition-colors
                          ${index < 3 ? 'bg-indigo-50/30 dark:bg-indigo-900/10' : ''}
                        `}
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-sm
                            ${index === 0 ? 'bg-amber-100 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400' :
                              index === 1 ? 'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300' :
                              index === 2 ? 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400' :
                              'text-slate-400 font-bold'
                            }
                          `}>
                            {entry.rank}
                          </div>
                        </td>
                        <td className="px-6 py-4 font-bold text-slate-900 dark:text-white">
                          {entry.name || `Runner #${entry.userId}`}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <span className="font-bold w-12">{entry.progressPercentage.toFixed(1)}%</span>
                            <div className="w-24 h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-indigo-500 rounded-full" 
                                style={{ width: `${Math.min(100, Math.max(0, entry.progressPercentage))}%` }}
                              />
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 font-mono text-slate-600 dark:text-slate-300">
                          {(entry.distanceCovered / 1000).toFixed(2)} km
                        </td>
                        <td className="px-6 py-4">
                          <span className="px-2.5 py-1 bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400 rounded-md font-mono text-xs">
                            {(entry.speedCalculated * 3.6).toFixed(1)} km/h
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right font-mono text-slate-600 dark:text-slate-300">
                          {entry.estimatedFinishTime ? new Date(entry.estimatedFinishTime).toLocaleTimeString() : '--:--:--'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

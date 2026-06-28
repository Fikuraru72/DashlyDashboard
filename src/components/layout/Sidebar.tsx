"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuthStore } from "@/store/useAuthStore";
import { 
  Activity, 
  CalendarDays, 
  Users, 
  History, 
  Settings, 
  ChevronLeft, 
  ChevronRight,
  LogOut,
  User as UserIcon,
  ArrowLeft,
  Menu
} from "lucide-react";

export function Sidebar() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { user, fetchUser, logout } = useAuthStore();

  useEffect(() => {
    if (!user) {
      fetchUser();
    }
  }, [user, fetchUser]);

  // Handle URL parsing safely
  const segments = pathname?.split("/").filter(Boolean) || [];
  
  // Check if we are inside a specific event monitoring context
  // Paths like /dashboard/monitoring/evt-123 
  const isMonitoringContext = segments.length === 3 && segments[0] === "dashboard" && segments[1] === "monitoring";
  const activeEventId = isMonitoringContext ? segments[2] : null;

  // Paths like /dashboard/events/evt-123 (but not /dashboard/events/create)
  const isEventDetail = segments.length === 3 && segments[0] === "dashboard" && segments[1] === "events" && segments[2] !== "create";
  
  // Create Event Page: /dashboard/events/create
  const isCreateEvent = segments.length === 3 && segments[0] === "dashboard" && segments[1] === "events" && segments[2] === "create";

  const isDetailContext = isMonitoringContext || isEventDetail || isCreateEvent;

  const navItems = [
    { name: "Events", href: "/dashboard/events", icon: CalendarDays, active: pathname === "/dashboard/events" || pathname === "/dashboard" },
    { name: "Users", href: "/dashboard/users", icon: Users, active: pathname?.includes("/users") },
    { name: "History", href: "/dashboard/history", icon: History, active: pathname?.includes("/history") },
    { name: "Settings", href: "/dashboard/settings", icon: Settings, active: pathname?.includes("/settings") },
  ];

  // Close mobile sidebar on route change
  useEffect(() => {
    setIsMobileOpen(false);
  }, [pathname]);

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  return (
    <>
      {/* Mobile Menu Button (Visible only on small screens) */}
      <div className="md:hidden fixed top-3 left-4 z-[60]">
        <button 
          onClick={() => setIsMobileOpen(!isMobileOpen)}
          className="p-2 text-slate-600 dark:text-slate-300 bg-white/80 dark:bg-slate-800/80 backdrop-blur-md rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
        >
          {isMobileOpen ? <ChevronLeft size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Mobile Backdrop */}
      {isMobileOpen && (
        <div 
          className="md:hidden fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40 transition-opacity"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar Core */}
      <aside 
        className={`absolute md:relative flex flex-col h-full bg-slate-50/95 dark:bg-[#090e1a]/95 backdrop-blur-2xl border-r border-slate-200 dark:border-slate-800 transition-all duration-300 z-50 
          ${isCollapsed ? "w-20 hidden md:flex" : "w-64"}
          ${isMobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
        `}
      >
        {/* Brand */}
        <div className="h-16 flex flex-shrink-0 items-center justify-between px-4 border-b border-slate-200 dark:border-slate-800/60 transition-all">
          <div className={`flex items-center gap-3 overflow-hidden transition-all ${isCollapsed ? "opacity-0 w-0" : "opacity-100"}`}>
             <div className="flex items-center justify-center p-1.5 bg-indigo-100 dark:bg-indigo-900/50 rounded-lg text-indigo-600 dark:text-cyan-400">
               <Activity className="h-5 w-5" />
             </div>
             <span className="text-xl font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-blue-500 dark:from-cyan-400 dark:to-emerald-400">Dashly</span>
          </div>
          <button 
            onClick={() => setIsCollapsed(!isCollapsed)}
            className={`hidden md:block p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-500 transition-all ${isCollapsed ? "mx-auto" : ""}`}
          >
            {isCollapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-6 flex flex-col gap-2 px-3 overflow-y-auto overflow-x-hidden">
          
          {isDetailContext && (
            <div className={`mb-4 transition-all duration-300 ${isCollapsed ? "hidden" : "block"}`}>
              <Link 
                href="/dashboard/events"
                className="flex items-center gap-2 px-3 py-2 text-sm font-semibold text-slate-500 hover:text-indigo-600 dark:hover:text-cyan-400 transition-colors group bg-slate-100/50 dark:bg-slate-800/50 rounded-lg border border-slate-200/50 dark:border-slate-700/50"
              >
                <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
                <span>Back to Events</span>
              </Link>
            </div>
          )}

          {isMonitoringContext && activeEventId && (
             <Link 
               href={`/dashboard/monitoring/${activeEventId}`}
               className={`flex items-center gap-3 px-3 py-3 rounded-xl transition-all group relative overflow-hidden mb-2 ${
                 isMonitoringContext 
                   ? "bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]" 
                   : "text-slate-600 dark:text-slate-400 hover:bg-rose-50/50 dark:hover:bg-rose-500/5 hover:text-rose-600"
               }`}
             >
               {isMonitoringContext && (
                 <div className="absolute left-0 top-1/4 bottom-1/4 w-1 bg-rose-500 dark:bg-rose-500 rounded-r-full shadow-[0_0_8px_rgba(244,63,94,0.6)]"></div>
               )}
               <Activity className={`h-5 w-5 flex-shrink-0 ${isMonitoringContext ? 'animate-pulse' : ''}`} />
               <span className={`font-bold text-sm whitespace-nowrap transition-all duration-300 ${isCollapsed ? "opacity-0 translate-x-4 w-0 hidden" : "opacity-100 translate-x-0"}`}>
                 Live Monitoring
               </span>
             </Link>
          )}

          <div className="my-2 h-px bg-slate-200 dark:bg-slate-800/60 hidden"></div>

          {navItems.map((item) => (
            <Link 
              key={item.name} 
              href={item.href}
              className={`flex items-center gap-3 px-3 py-3 rounded-xl transition-all group relative overflow-hidden ${
                item.active 
                  ? "bg-indigo-100/50 dark:bg-indigo-500/20 text-indigo-600 dark:text-cyan-400 shadow-[inset_0_1px_0_rgba(255,255,255,0.1)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.02)]" 
                  : "text-slate-600 dark:text-slate-400 hover:bg-slate-200/50 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-slate-200"
              }`}
            >
              {item.active && (
                <div className="absolute left-0 top-1/4 bottom-1/4 w-1 bg-indigo-500 dark:bg-cyan-400 rounded-r-full shadow-[0_0_8px_rgba(34,211,238,0.6)]"></div>
              )}
              <item.icon className="h-5 w-5 flex-shrink-0" />
              <span className={`font-semibold text-sm whitespace-nowrap transition-all duration-300 ${isCollapsed ? "opacity-0 translate-x-4 w-0 hidden" : "opacity-100 translate-x-0"}`}>
                {item.name}
              </span>
            </Link>
          ))}
        </nav>

        {/* User Area */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800/60 transition-all">
          <div className={`flex items-center gap-3 ${isCollapsed ? "justify-center" : "justify-between"}`}>
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-indigo-500 to-cyan-500 flex items-center justify-center flex-shrink-0 shadow-lg shadow-indigo-500/30">
                <UserIcon className="h-5 w-5 text-white" />
              </div>
              {!isCollapsed && (
                <div className="flex flex-col">
                  <span className="text-sm font-bold text-slate-800 dark:text-slate-200">{user?.name || "Loading..."}</span>
                  <span className="text-xs font-medium text-slate-500 dark:text-slate-400">{user?.email || ""}</span>
                </div>
              )}
            </div>
            {!isCollapsed && (
              <button 
                onClick={handleLogout}
                className="p-2 text-slate-400 hover:text-rose-500 transition-colors rounded-lg hover:bg-rose-50 dark:hover:bg-rose-500/10" 
                title="Logout"
              >
                <LogOut className="h-5 w-5" />
              </button>
            )}
          </div>
        </div>
      </aside>
    </>
  );
}

import React from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen w-full bg-slate-50 dark:bg-slate-950 overflow-hidden font-sans">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 h-full relative">
        <Header />
        <div className="flex-1 flex flex-col overflow-hidden relative">
          {children}
        </div>
      </div>
    </div>
  );
}

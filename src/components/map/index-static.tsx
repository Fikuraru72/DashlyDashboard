"use client";
import dynamic from "next/dynamic";
const StaticMapWrapper = dynamic(() => import("./StaticMap"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full bg-slate-100 dark:bg-slate-800 animate-pulse rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-center">
      <span className="text-slate-400 font-bold uppercase tracking-widest text-xs">
        Loading Map...
      </span>
    </div>
  ),
});
export default StaticMapWrapper;

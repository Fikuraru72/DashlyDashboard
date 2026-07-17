"use client";

import dynamic from "next/dynamic";
import type { LocationPickerMapProps } from "@/components/map/LocationPickerMap";

const LocationPickerMapWrapper = dynamic<LocationPickerMapProps>(
  () => import("@/components/map/LocationPickerMap"),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full flex flex-col items-center justify-center bg-slate-100 dark:bg-slate-900 absolute inset-0 text-slate-500 dark:text-slate-400 rounded-2xl border border-slate-200 dark:border-slate-800">
        <div className="w-8 h-8 rounded-full border-4 border-emerald-500 border-t-transparent animate-spin mb-4"></div>
        <span className="text-sm font-medium">Loading Map Picker...</span>
      </div>
    ),
  },
);

export default LocationPickerMapWrapper;

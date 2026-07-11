"use client";

import React, { useState, useEffect, useRef } from "react";
import { Search, Navigation, Loader2, MapPin } from "lucide-react";
import { toast } from "sonner";

export interface LocationSearchResult {
  name: string;
  city: string;
  province: string;
  latitude: number;
  longitude: number;
}

interface LocationSearchProps {
  onLocationSelect: (result: LocationSearchResult) => void;
}

export default function LocationSearch({ onLocationSelect }: LocationSearchProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const MAPTILER_KEY = process.env.NEXT_PUBLIC_MAPTILER_KEY;

  // Handle outside click to close dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Debounced search
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (query.length > 2) {
        performSearch(query);
      } else {
        setResults([]);
      }
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [query]);

  const performSearch = async (searchQuery: string) => {
    if (!MAPTILER_KEY) return;
    setIsSearching(true);
    try {
      const res = await fetch(`https://api.maptiler.com/geocoding/${encodeURIComponent(searchQuery)}.json?key=${MAPTILER_KEY}&limit=5`);
      const data = await res.json();
      if (data && data.features) {
        setResults(data.features);
        setShowDropdown(true);
      }
    } catch (error) {
      console.error("Search error:", error);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectResult = (feature: any) => {
    // Extract context
    let city = "";
    let province = "";
    
    if (feature.context) {
      const cityCtx = feature.context.find((c: any) => c.id.startsWith("municipality") || c.id.startsWith("city") || c.id.startsWith("county"));
      const provCtx = feature.context.find((c: any) => c.id.startsWith("region") || c.id.startsWith("state") || c.id.startsWith("province"));
      
      if (cityCtx) city = cityCtx.text;
      if (provCtx) province = provCtx.text;
    }
    
    // If city is empty but place_type is city, use text
    if (!city && feature.place_type?.includes("municipality")) {
      city = feature.text;
    }
    if (!province && feature.place_type?.includes("region")) {
      province = feature.text;
    }

    onLocationSelect({
      name: feature.text,
      city: city,
      province: province,
      longitude: feature.center[0],
      latitude: feature.center[1],
    });
    
    setQuery(feature.place_name || feature.text);
    setShowDropdown(false);
  };

  const handleGetMyLocation = () => {
    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported by your browser");
      return;
    }

    setIsGettingLocation(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        if (!MAPTILER_KEY) {
          onLocationSelect({
            name: "Current Location",
            city: "",
            province: "",
            latitude,
            longitude
          });
          setIsGettingLocation(false);
          return;
        }

        // Reverse geocoding
        try {
          const res = await fetch(`https://api.maptiler.com/geocoding/${longitude},${latitude}.json?key=${MAPTILER_KEY}`);
          const data = await res.json();
          if (data && data.features && data.features.length > 0) {
            handleSelectResult(data.features[0]);
            toast.success("Location found!");
          } else {
             onLocationSelect({
              name: "Current Location",
              city: "",
              province: "",
              latitude,
              longitude
            });
          }
        } catch (error) {
          console.error("Reverse geocoding error:", error);
          toast.error("Failed to get location details");
        } finally {
          setIsGettingLocation(false);
        }
      },
      (error) => {
        console.error("Geolocation error:", error);
        toast.error("Please allow location access to use this feature");
        setIsGettingLocation(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  return (
    <div className="relative flex items-center gap-2 mb-4 z-50">
      <div className="relative flex-1" ref={dropdownRef}>
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
          <Search className="h-4 w-4" />
        </div>
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            if (!showDropdown && e.target.value.length > 2) setShowDropdown(true);
          }}
          onFocus={() => {
            if (results.length > 0) setShowDropdown(true);
          }}
          placeholder="Search for a location (e.g. Gelora Bung Karno)..."
          className="block w-full pl-10 pr-10 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none text-sm shadow-sm"
        />
        {isSearching && (
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-indigo-500">
            <Loader2 className="h-4 w-4 animate-spin" />
          </div>
        )}

        {/* Dropdown */}
        {showDropdown && results.length > 0 && (
          <div className="absolute top-full mt-2 w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl overflow-hidden z-[100] max-h-60 overflow-y-auto custom-scrollbar">
            {results.map((result, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSelectResult(result)}
                className="w-full text-left px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800 border-b border-slate-100 dark:border-slate-800 last:border-0 transition-colors flex items-start gap-3"
              >
                <MapPin className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                <div className="flex flex-col">
                  <span className="text-sm font-bold text-slate-700 dark:text-slate-200">{result.text}</span>
                  <span className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1">{result.place_name}</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={handleGetMyLocation}
        disabled={isGettingLocation}
        className="flex items-center gap-2 px-4 py-3 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-500/20 rounded-xl hover:bg-indigo-100 dark:hover:bg-indigo-500/20 transition-all font-bold text-xs uppercase tracking-wider shrink-0 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isGettingLocation ? <Loader2 className="w-4 h-4 animate-spin" /> : <Navigation className="w-4 h-4" />}
        <span className="hidden sm:inline">My Location</span>
      </button>
    </div>
  );
}

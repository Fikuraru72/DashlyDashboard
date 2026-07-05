"use client";

import React, { useEffect, useRef } from "react";
import { MapContainer, TileLayer, GeoJSON } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { useTheme } from "next-themes";
import L from "leaflet";
import { toRouteFeatureCollection } from "@/lib/utils/route-normalizer";

interface StaticMapProps {
  geoJson: any;
}

export default function StaticMap({ geoJson }: StaticMapProps) {
  const { theme, systemTheme } = useTheme();
  const currentTheme = theme === "system" ? systemTheme : theme;
  const isDark = currentTheme === "dark";

  const mapRef = useRef<L.Map>(null);

  const normalizedGeoJson = toRouteFeatureCollection(geoJson);

  useEffect(() => {
    if (mapRef.current && normalizedGeoJson.features.length > 0) {
      const map = mapRef.current;
      const layer = L.geoJSON(normalizedGeoJson);
      map.fitBounds(layer.getBounds(), { padding: [20, 20], maxZoom: 15 });
    }
  }, [normalizedGeoJson]);

  const tileUrl = isDark
    ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
    : "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png";

  const attribution = '&copy; <a href="https://carto.com/">CARTO</a>';
  const defaultCenter: [number, number] = [-6.1754, 106.8272];

  if (!geoJson) {
    return <div className="w-full h-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 font-bold tracking-widest uppercase text-xs rounded-xl">No Route Data</div>;
  }

  const geoJsonStyle = {
    color: "#3b82f6",
    weight: 5,
    opacity: 0.9,
    lineCap: "round" as const,
    lineJoin: "round" as const,
  };

  return (
    <div className="w-full h-full relative z-0 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700">
      <MapContainer
        center={defaultCenter}
        zoom={14}
        scrollWheelZoom={false}
        zoomControl={true}
        dragging={true}
        className="w-full h-full"
        ref={mapRef}
      >
        <TileLayer url={tileUrl} attribution={attribution} />
        <GeoJSON data={normalizedGeoJson} style={geoJsonStyle} />
      </MapContainer>
    </div>
  );
}

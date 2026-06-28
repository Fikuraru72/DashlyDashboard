"use client";

import React, { useEffect, useRef } from "react";
import { MapContainer, TileLayer, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import "@geoman-io/leaflet-geoman-free";
import "@geoman-io/leaflet-geoman-free/dist/leaflet-geoman.css";
import L from "leaflet";
import { useTheme } from "next-themes";

function GeomanEditController({ initialGeoJSON, onUpdate }: { initialGeoJSON?: any; onUpdate: (geojson: any) => void }) {
  const map = useMap();
  const hasLoadedRef = useRef(false);

  useEffect(() => {
    map.pm.addControls({
      position: "topleft",
      drawMarker: false,
      drawCircleMarker: false,
      drawPolyline: true,
      drawRectangle: false,
      drawPolygon: false,
      drawCircle: false,
      drawText: false,
      editMode: true,
      dragMode: true,
      cutPolygon: false,
      removalMode: true,
    });

    map.pm.setPathOptions({
      color: "#3b82f6",
      weight: 6,
      lineCap: "round",
      lineJoin: "round",
    });

    if (initialGeoJSON && !hasLoadedRef.current) {
      try {
        const geoLayer = L.geoJSON(initialGeoJSON, {
          style: { color: "#3b82f6", weight: 6, lineCap: "round", lineJoin: "round" },
        });
        geoLayer.eachLayer((layer: any) => layer.addTo(map));
        if (geoLayer.getBounds().isValid()) {
          map.fitBounds(geoLayer.getBounds(), { padding: [50, 50] });
        }
        hasLoadedRef.current = true;
      } catch (e) {
        console.error("Error loading initial GeoJSON into editor", e);
      }
    }

    const gatherGeoJSON = () => {
      const features: any[] = [];
      map.eachLayer((layer: any) => {
        if ((layer instanceof L.Polyline || layer instanceof L.Marker || layer instanceof L.Polygon) && !(layer instanceof L.TileLayer)) {
          try { features.push(layer.toGeoJSON()); } catch (e) { /* skip */ }
        }
      });
      onUpdate({ type: "FeatureCollection", features });
    };

    map.on("pm:create", gatherGeoJSON);
    map.on("pm:remove", gatherGeoJSON);
    map.on("layeradd", (e: any) => {
      if (e.layer && e.layer.pm) {
        e.layer.on("pm:edit", gatherGeoJSON);
        e.layer.on("pm:dragend", gatherGeoJSON);
      }
    });

    return () => {
      map.pm.removeControls();
      map.off("pm:create", gatherGeoJSON);
      map.off("pm:remove", gatherGeoJSON);
    };
  }, [map, initialGeoJSON, onUpdate]);

  return null;
}

export default function RouteEditorMap({ initialGeoJSON, onGeoJsonChange }: { initialGeoJSON?: any; onGeoJsonChange: (geojson: any) => void }) {
  const { theme, systemTheme } = useTheme();
  const isDark = (theme === "system" ? systemTheme : theme) === "dark";

  const tileUrl = isDark
    ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
    : "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png";

  return (
    <div className="w-full h-full rounded-xl overflow-hidden shadow-inner relative z-0 border border-slate-200 dark:border-slate-800">
      <MapContainer center={[-6.1754, 106.8272]} zoom={14} scrollWheelZoom={true} className="w-full h-full">
        <TileLayer url={tileUrl} attribution='&copy; <a href="https://carto.com/">CARTO</a>' />
        <GeomanEditController initialGeoJSON={initialGeoJSON} onUpdate={onGeoJsonChange} />
      </MapContainer>
    </div>
  );
}

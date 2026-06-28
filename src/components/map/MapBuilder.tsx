"use client";

import React, { useEffect } from "react";
import { MapContainer, TileLayer, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import "@geoman-io/leaflet-geoman-free";
import "@geoman-io/leaflet-geoman-free/dist/leaflet-geoman.css";
import L from "leaflet";
import { useTheme } from "next-themes";

function GeomanController({ onUpdate }: { onUpdate: (geojson: any) => void }) {
  const map = useMap();

  useEffect(() => {
    // Prevent Geoman from duplicating controls if re-rendered
    map.pm.addControls({
      position: "topleft",
      drawMarker: false,
      drawCircleMarker: false,
      drawPolyline: true, // We only want lines for routes
      drawRectangle: false,
      drawPolygon: false,
      drawCircle: false,
      drawText: false,
      editMode: true,
      dragMode: true,
      cutPolygon: false,
      removalMode: true,
    });

    // Style the drawn path to look sporty
    map.pm.setPathOptions({
      color: "#3b82f6",
      weight: 6,
      lineCap: "round",
      lineJoin: "round",
    });

    const gatherGeoJSON = () => {
      const layers = map.pm.getGeomanDrawLayers();
      const features = layers.map((layer: any) => layer.toGeoJSON());
      onUpdate({
        type: "FeatureCollection",
        features,
      });
    };

    map.on("pm:create", gatherGeoJSON);
    map.on("pm:remove", gatherGeoJSON);
    // map.on('pm:edit', gatherGeoJSON); // Geoman triggers this per layer
    
    // Listen to drag/edit stops
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
  }, [map, onUpdate]);

  return null;
}

interface MapBuilderProps {
  onGeoJsonChange: (geojson: any) => void;
  clearTrigger?: number; // whenever this increments, we clear map
  previewGeojson?: any; // external GeoJSON to render (e.g. from upload)
}

export default function MapBuilder({ onGeoJsonChange, clearTrigger, previewGeojson }: MapBuilderProps) {
  const { theme, systemTheme } = useTheme();
  const currentTheme = theme === "system" ? systemTheme : theme;
  const isDark = currentTheme === "dark";

  const mapRef = React.useRef<L.Map>(null);

  useEffect(() => {
    if ((clearTrigger && clearTrigger > 0) || previewGeojson) {
      if (mapRef.current) {
        const map = mapRef.current;
        // Remove manual drawings
        map.pm.getGeomanDrawLayers().forEach((layer: any) => {
          map.removeLayer(layer);
        });

        // Remove existing preview layers if any (we should track them)
        map.eachLayer((layer: any) => {
          if (layer.options && layer.options.pane === 'overlayPane' && layer.toGeoJSON) {
             // This is a bit broad, but helps clear previous previews
             // In a real app we'd track the specific preview layer ref
             if (!layer._url) map.removeLayer(layer); 
          }
        });

        if (!previewGeojson) {
          onGeoJsonChange(null);
        }
      }
    }
  }, [clearTrigger, previewGeojson, onGeoJsonChange]);

  // Handle Preview Layer & Recenter
  useEffect(() => {
    if (previewGeojson && mapRef.current) {
      const map = mapRef.current;
      const layer = L.geoJSON(previewGeojson, {
        style: {
          color: "#3b82f6",
          weight: 6,
          lineCap: "round",
          lineJoin: "round",
        }
      }).addTo(map);

      // Fit bounds to show the whole route
      map.fitBounds(layer.getBounds(), { padding: [50, 50] });
    }
  }, [previewGeojson]);

  const tileUrl = isDark
    ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
    : "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png";

  const attribution = '&copy; <a href="https://carto.com/">CARTO</a>';
  const defaultCenter: [number, number] = [-6.1754, 106.8272]; // Jakarta/Monas

  return (
    <div className="w-full h-full rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-sm relative z-0">
      <MapContainer
        center={defaultCenter}
        zoom={14}
        scrollWheelZoom={true}
        className="w-full h-full"
        ref={mapRef}
      >
        <TileLayer url={tileUrl} attribution={attribution} />
        <GeomanController onUpdate={onGeoJsonChange} />
      </MapContainer>
    </div>
  );
}

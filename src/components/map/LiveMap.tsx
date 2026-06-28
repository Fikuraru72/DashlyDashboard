"use client";

import React, { useEffect, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix default icon issue with Webpack
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

interface Position {
  userId: number;
  lat: number;
  lng: number;
  speed: number;
  state: string;
  name?: string;
  isOffline?: boolean;
}

interface LiveMapProps {
  routeGeojson?: any;
  livePositions?: Record<number, Position>;
}

const customIcon = (state: string) => {
  let color = "#3b82f6"; // blue
  if (state === "FINISHED") color = "#10b981"; // green
  if (state === "FROZEN") color = "#f43f5e"; // red
  if (state === "OFF_ROUTE") color = "#f59e0b"; // yellow

  return L.divIcon({
    className: "custom-div-icon",
    html: `<div style="background-color: ${color}; width: 12px; height: 12px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 4px rgba(0,0,0,0.4);"></div>`,
    iconSize: [16, 16],
    iconAnchor: [8, 8],
  });
};

function MapBoundsUpdater({ routeGeojson }: { routeGeojson: any }) {
  const map = useMap();

  useEffect(() => {
    if (routeGeojson && routeGeojson.geometry && routeGeojson.geometry.coordinates) {
      const coords = routeGeojson.geometry.coordinates;
      if (coords.length > 0) {
        // Find bounds
        const lats = coords.map((c: any[]) => c[1]);
        const lngs = coords.map((c: any[]) => c[0]);
        const minLat = Math.min(...lats);
        const maxLat = Math.max(...lats);
        const minLng = Math.min(...lngs);
        const maxLng = Math.max(...lngs);
        
        map.fitBounds([
          [minLat, minLng],
          [maxLat, maxLng],
        ], { padding: [50, 50] });
      }
    }
  }, [map, routeGeojson]);

  return null;
}

export default function LiveMap({ routeGeojson, livePositions = {} }: LiveMapProps) {
  let routeCoordinates: [number, number][] = [];
  
  if (routeGeojson?.geometry?.coordinates) {
    routeCoordinates = routeGeojson.geometry.coordinates.map((c: [number, number]) => [c[1], c[0]]);
  }

  const defaultCenter: [number, number] = routeCoordinates.length > 0 ? routeCoordinates[0] : [-6.200000, 106.816666];

  return (
    <div className="w-full h-full relative rounded-xl overflow-hidden shadow-sm border border-slate-200 dark:border-slate-800">
      <MapContainer 
        center={defaultCenter} 
        zoom={13} 
        style={{ height: "100%", width: "100%" }}
        zoomControl={false}
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
        />

        {routeCoordinates.length > 0 && (
          <Polyline positions={routeCoordinates} color="#4f46e5" weight={4} opacity={0.7} />
        )}

        <MapBoundsUpdater routeGeojson={routeGeojson} />

        {Object.values(livePositions)
          .filter((pos) => !pos.isOffline && (pos.state === 'TRACKING' || pos.state === 'FROZEN'))
          .map((pos) => (
          <Marker 
            key={pos.userId}
            position={[pos.lat, pos.lng]}
            icon={customIcon(pos.state)}
          >
            <Popup>
              <div className="text-sm">
                <p className="font-bold">{pos.name || `Runner ${pos.userId}`}</p>
                <p>Speed: {(pos.speed * 3.6).toFixed(1)} km/h</p>
                <p>Status: {pos.state}</p>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}

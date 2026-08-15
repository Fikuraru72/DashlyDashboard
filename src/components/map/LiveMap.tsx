"use client";

import React, { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { getRouteLatLngs } from "@/lib/utils/route-normalizer";

// Fix default icon issue with Webpack
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

interface Position {
  id?: string;
  userId?: number | string;
  lat: number;
  lng: number;
  speed: number;
  state?: string;
  status?: string;
  name?: string;
  bibNumber?: string;
  isOffline?: boolean;
}

interface LiveMapProps {
  routeGeojson?: any;
  livePositions?: Record<string, Position>;
}

const customIcon = (state?: string, bibNumber?: string) => {
  let color = "#3b82f6"; // blue
  if (state === "FINISHED") color = "#10b981"; // green
  if (state === "FROZEN" || state === "inactive") color = "#f43f5e"; // red
  if (state === "OFF_ROUTE" || state === "off-route") color = "#f59e0b"; // yellow

  const bibText = bibNumber && bibNumber !== "-" ? bibNumber : "BIB";

  return L.divIcon({
    className: "custom-div-icon",
    html: `
      <div style="
        display: inline-flex;
        align-items: center;
        gap: 5px;
        background: rgba(15, 23, 42, 0.92);
        backdrop-filter: blur(8px);
        border: 1.5px solid ${color};
        padding: 2px 7px 2px 5px;
        border-radius: 12px;
        box-shadow: 0 3px 10px rgba(0,0,0,0.5), 0 0 8px ${color}50;
        transform: translate(-50%, -50%);
        white-space: nowrap;
        pointer-events: auto;
      ">
        <div style="width: 9px; height: 9px; border-radius: 50%; background: ${color}; border: 1.5px solid #ffffff; box-shadow: 0 0 5px ${color}; flex-shrink: 0;"></div>
        <span style="color: #ffffff; font-size: 11px; font-weight: 900; font-family: ui-monospace, SFMono-Regular, monospace; letter-spacing: -0.3px; line-height: 1;">${bibText}</span>
      </div>
    `,
    iconSize: [0, 0],
    iconAnchor: [0, 0],
  });
};

function MapBoundsUpdater({ routeGeojson }: { routeGeojson: any }) {
  const map = useMap();

  useEffect(() => {
    const coords = getRouteLatLngs(routeGeojson);
    if (coords.length > 0) {
      map.fitBounds(coords, { padding: [50, 50] });
    }
  }, [map, routeGeojson]);

  return null;
}

export default function LiveMap({ routeGeojson, livePositions = {} }: LiveMapProps) {
  const routeCoordinates = getRouteLatLngs(routeGeojson);
  const defaultCenter: [number, number] =
    routeCoordinates.length > 0 ? routeCoordinates[0] : [-6.2, 106.816666];

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
          .filter((pos) => !pos.isOffline && Number.isFinite(pos.lat) && Number.isFinite(pos.lng))
          .map((pos) => {
            const markerState = pos.state ?? pos.status;
            const markerId = pos.userId ?? pos.id;
            return (
              <Marker key={markerId} position={[pos.lat, pos.lng]} icon={customIcon(markerState, pos.bibNumber)}>
                <Popup>
                  <div className="text-sm">
                    <p className="font-bold">
                      {pos.bibNumber ? `[BIB #${pos.bibNumber}] ` : ''}
                      {pos.name || `Runner ${markerId}`}
                    </p>
                    <p>Speed: {(pos.speed * 3.6).toFixed(1)} km/h</p>
                    <p>Status: {markerState}</p>
                  </div>
                </Popup>
              </Marker>
            );
          })}
      </MapContainer>
    </div>
  );
}

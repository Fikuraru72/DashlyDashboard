"use client";

import React, { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useTheme } from "next-themes";
import "leaflet-defaulticon-compatibility";
import "leaflet-defaulticon-compatibility/dist/leaflet-defaulticon-compatibility.css";

function ClickHandler({ setPos }: { setPos: (latlng: { lat: number; lng: number }) => void }) {
  useMapEvents({
    click(e) {
      setPos(e.latlng);
    },
  });
  return null;
}

function MapUpdater({ position }: { position: L.LatLng | null }) {
  const map = useMapEvents({});
  useEffect(() => {
    if (position) {
      map.flyTo(position, 15, { animate: true, duration: 1 });
    }
  }, [position, map]);
  return null;
}

export interface LocationPickerMapProps {
  latitude?: number | "";
  longitude?: number | "";
  onChange: (lat: number, lng: number) => void;
}

export default function LocationPickerMap({
  latitude,
  longitude,
  onChange,
}: LocationPickerMapProps) {
  const { theme, systemTheme } = useTheme();
  const currentTheme = theme === "system" ? systemTheme : theme;
  const isDark = currentTheme === "dark";

  const [position, setPosition] = useState<L.LatLng | null>(null);

  useEffect(() => {
    if (typeof latitude === "number" && typeof longitude === "number") {
      setPosition(L.latLng(latitude, longitude));
    } else {
      setPosition(null);
    }
  }, [latitude, longitude]);

  const handleSetPos = (latlng: { lat: number; lng: number }) => {
    setPosition(L.latLng(latlng.lat, latlng.lng));
    onChange(latlng.lat, latlng.lng);
  };

  const tileUrl = isDark
    ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
    : "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png";

  const attribution = '&copy; <a href="https://carto.com/">CARTO</a>';
  const defaultCenter: [number, number] = [-6.1754, 106.8272]; // Jakarta/Monas

  const initialCenter =
    typeof latitude === "number" && typeof longitude === "number"
      ? ([latitude, longitude] as [number, number])
      : defaultCenter;

  return (
    <div className="w-full h-full rounded-xl overflow-hidden relative z-0">
      <MapContainer
        center={initialCenter}
        zoom={12}
        scrollWheelZoom={true}
        className="w-full h-full"
      >
        <TileLayer url={tileUrl} attribution={attribution} />
        <ClickHandler setPos={handleSetPos} />
        <MapUpdater position={position} />
        {position && <Marker position={position} />}
      </MapContainer>
    </div>
  );
}

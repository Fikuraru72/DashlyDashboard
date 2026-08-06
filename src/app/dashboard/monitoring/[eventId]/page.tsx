"use client";

import React, { useEffect, useState, useRef, useMemo, useCallback } from "react";
import { useParams } from "next/navigation";
import maplibregl from "maplibre-gl";
import { useMapMarkerAnimation } from "@/hooks/useMapMarkerAnimation";

// ── Helper to normalize boolean/string isOffline values ──
const isParticipantOffline = (val: any): boolean => {
  if (val === true || val === "true") return true;
  if (val === false || val === "false") return false;
  return false;
};

import "maplibre-gl/dist/maplibre-gl.css";
import Supercluster from "supercluster";
import { io } from "socket.io-client";
import { ElevationProfile } from "@/components/elevation/ElevationProfile";
import { useTheme } from "next-themes";
import {
  Activity,
  Play,
  Square,
  Loader2,
  ShieldAlert,
  Navigation,
  ChevronLeft,
  ChevronDown,
  Mountain,
  Zap,
  AlertTriangle,
  Trophy,
  Radio,
  Signal,
  LayoutTemplate,
  PanelLeft,
  PanelRight,
  X,
  Timer,
  CheckCircle2,
  Bike,
  Footprints,
  Route,
  Flag,
} from "lucide-react";
import Link from "next/link";
import { useParticipantStore } from "@/store/useParticipantStore";
import { authenticatedFetch, refreshAccessToken } from "@/lib/api";
import { isParticipantDisconnected } from "@/lib/realtime-position";

const getCookie = (name: string) => {
  if (typeof document === "undefined") return null;
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop()?.split(";").shift() || null;
  return null;
};
import { getRouteCoordinates, toRouteFeatureCollection } from "@/lib/utils/route-normalizer";

// ── Marker Styling (Inline CSS Only — Tailwind does NOT work inside MapLibre canvas) ─────────
// Helper to generate a random hex color from a predefined aesthetic palette
const generateRandomColor = () => {
  const colors = [
    "#f87171", // red
    "#fb923c", // orange
    "#fbbf24", // yellow
    "#a3e635", // lime
    "#2dd4bf", // teal
    "#38bdf8", // sky
    "#60a5fa", // blue
    "#818cf8", // indigo
    "#a78bfa", // violet
    "#c084fc", // fuchsia
    "#e879f9", // pink
    "#f472b6", // rose
  ];
  return colors[Math.floor(Math.random() * colors.length)];
};

// Helper to inject HTML into an existing DOM element so we can update colors dynamically
const updateMarkerElement = (
  el: HTMLElement,
  displayName: string,
  status: string = "moving",
  isStale: boolean = false,
  isAnomaly: boolean = false,
  userColor?: string,
) => {
  let coreColor = isAnomaly
    ? "#e11d48" // Bright RED — Stationary Incident
    : isStale
      ? "#64748b" // Grey — Signal lost or disconnected
      : status === "stationary"
        ? "#f97316" // Orange — Long stationary (not yet incident)
        : status === "emergency"
          ? "#f43f5e" // Rose — Emergency
          : status === "stopped"
            ? "#f59e0b" // Amber — Stopped
            : userColor || "#10b981"; // Custom User Color or Emerald — Moving

  el.className = "dashly-marker";
  el.innerHTML = `
    <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); pointer-events: none;">
      <div style="
        width: 16px; height: 16px;
        border-radius: 50%;
        background: ${coreColor}35;
        animation: ${!isStale ? "ping 2s cubic-bezier(0,0,0.2,1) infinite" : "none"};
      "></div>
    </div>
    <div class="marker-dot" style="
      position: absolute;
      top: 50%; left: 50%;
      transform: translate(-50%, -50%);
      width: 12px; height: 12px;
      border-radius: 50%;
      background: ${coreColor};
      border: 2px solid #ffffff;
      box-shadow: 0 2px 5px rgba(0,0,0,0.4), 0 0 6px ${coreColor}80;
      transition: transform 0.2s ease;
    "></div>
    <div class="marker-tooltip" style="
      position: absolute;
      bottom: 100%;
      margin-bottom: 6px;
      left: 50%;
      transform: translateX(-50%) translateY(4px);
      background: rgba(15, 23, 42, 0.92);
      backdrop-filter: blur(8px);
      color: #ffffff;
      padding: 3px 8px;
      border-radius: 6px;
      font-size: 10.5px;
      font-weight: 800;
      white-space: nowrap;
      border: 1px solid rgba(255, 255, 255, 0.15);
      box-shadow: 0 4px 14px rgba(0, 0, 0, 0.25);
      opacity: 0;
      pointer-events: none;
      transition: opacity 0.15s ease, transform 0.15s ease;
      z-index: 120;
    ">
      ${displayName}
    </div>
  `;
};

const createPulseMarker = (
  displayName: string,
  status: string = "moving",
  isStale: boolean = false,
  isAnomaly: boolean = false,
  userColor?: string,
) => {
  const el = document.createElement("div");
  el.className = "dashly-marker";
  el.style.cssText = `
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    z-index: 9999 !important;
    cursor: pointer;
  `;
  updateMarkerElement(el, displayName, status, isStale, isAnomaly, userColor);

  el.addEventListener("mouseenter", () => {
    el.style.zIndex = "99999";
    const tooltip = el.querySelector(".marker-tooltip") as HTMLElement | null;
    if (tooltip) {
      tooltip.style.opacity = "1";
      tooltip.style.transform = "translateX(-50%) translateY(0px)";
    }
    const dot = el.querySelector(".marker-dot") as HTMLElement | null;
    if (dot) dot.style.transform = "translate(-50%, -50%) scale(1.35)";
  });

  el.addEventListener("mouseleave", () => {
    el.style.zIndex = "9999";
    const tooltip = el.querySelector(".marker-tooltip") as HTMLElement | null;
    if (tooltip) {
      tooltip.style.opacity = "0";
      tooltip.style.transform = "translateX(-50%) translateY(4px)";
    }
    const dot = el.querySelector(".marker-dot") as HTMLElement | null;
    if (dot) dot.style.transform = "translate(-50%, -50%) scale(1)";
  });

  return el;
};

// ── Status Config ────────────────────────────────────────────
const STATUS_CONFIG = {
  DRAFT: {
    label: "Draft",
    color: "text-slate-400",
    bgColor: "bg-slate-500/10 border-slate-500/20",
    dotColor: "bg-slate-400",
    icon: LayoutTemplate,
    description: "Event is in draft state",
  },
  IDLE: {
    label: "Idle",
    color: "text-slate-400",
    bgColor: "bg-slate-500/10 border-slate-500/20",
    dotColor: "bg-slate-400",
    icon: LayoutTemplate,
    description: "Event is idle",
  },
  REGISTRATION_OPEN: {
    label: "Reg Open",
    color: "text-blue-400",
    bgColor: "bg-blue-500/10 border-blue-500/20",
    dotColor: "bg-blue-400",
    icon: LayoutTemplate,
    description: "Registration is currently open",
  },
  REGISTRATION_CLOSED: {
    label: "Reg Closed",
    color: "text-slate-400",
    bgColor: "bg-slate-500/10 border-slate-500/20",
    dotColor: "bg-slate-400",
    icon: LayoutTemplate,
    description: "Registration is closed",
  },
  READY: {
    label: "Ready",
    color: "text-amber-400",
    bgColor: "bg-amber-500/10 border-amber-500/20",
    dotColor: "bg-amber-400",
    icon: Timer,
    description: "Event is ready to start",
  },
  START: {
    label: "Live (Starting)",
    color: "text-emerald-400",
    bgColor: "bg-emerald-500/10 border-emerald-500/20",
    dotColor: "bg-emerald-500",
    icon: Activity,
    description: "Race is starting",
  },
  LIVE: {
    label: "Live",
    color: "text-emerald-400",
    bgColor: "bg-emerald-500/10 border-emerald-500/20",
    dotColor: "bg-emerald-500",
    icon: Activity,
    description: "Race is active — telemetry is being ingested",
  },
  FINISHED: {
    label: "Finished",
    color: "text-indigo-400",
    bgColor: "bg-indigo-500/10 border-indigo-500/20",
    dotColor: "bg-indigo-400",
    icon: CheckCircle2,
    description: "Race has concluded",
  },
  CANCELLED: {
    label: "Cancelled",
    color: "text-rose-400",
    bgColor: "bg-rose-500/10 border-rose-500/20",
    dotColor: "bg-rose-400",
    icon: X,
    description: "Event has been cancelled",
  },
};

export default function PublicEventMonitoringPage() {
  const eventId = String(useParams().eventId);

  // ── States ──────────────────────────────────────────────────
  const [event, setEvent] = useState<any>(null);
  const [participants, setParticipants] = useState<Map<string, any>>(new Map());
  const anomalies = useParticipantStore((state) => state.anomalies);
  const removeAnomaly = useParticipantStore((state) => state.removeAnomaly);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isFlashing] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [statusError] = useState("");
  const [participantDetailModal, setParticipantDetailModal] = useState<any>(null);

  // HUD Visibility
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [showAlerts, setShowAlerts] = useState(false);
  const [showPolylines, setShowPolylines] = useState(false);
  const [showAltitudeChart, setShowAltitudeChart] = useState(true);
  const [showKmMarkers, setShowKmMarkers] = useState(false);
  const [is3DMode, setIs3DMode] = useState(true);

  // Altitude Chart Interactivity
  const [hoveredDistance, setHoveredDistance] = useState<number | null>(null);
  const [showMapToolsMenu, setShowMapToolsMenu] = useState(false);
  const chartMarkerInstance = useRef<maplibregl.Marker | null>(null);

  // Timer for monitoring window countdown
  const [now, setNow] = useState(new Date());

  // ── Refs ────────────────────────────────────────────────────
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<maplibregl.Map | null>(null);
  // PILLAR 2: Map readiness state — triggers marker sync when map becomes ready
  const [mapIsReady, setMapIsReady] = useState(false);
  // FORCE RENDER: Ref mirror so the socket closure always reads the LIVE value
  const mapIsReadyRef = useRef(false);
  // PILLAR 2: Queue for telemetry data that arrives before the map is loaded
  const pendingUpdates = useRef<any[]>([]);
  // FORCE RENDER: Ensure flyTo only fires once
  const hasFlownToFirst = useRef(false);
  // STORE STATIC USER INFO (bibNumber, name, etc.)
  const participantsInfo = useRef<
    Map<
      string,
      {
        name: string;
        firstName: string;
        bibNumber: string;
        formattedName: string;
        healthInfo?: any;
        email?: string;
        phone?: string;
        color?: string;
      }
    >
  >(new Map());

  const { theme, systemTheme } = useTheme();
  const currentTheme = theme === "system" ? systemTheme : theme;
  const mqttClient = useRef<any>(null);
  const markers = useRef<Map<string, maplibregl.Marker>>(new Map());
  const { pushWaypoint, removeTarget: removeMarkerTarget } = useMapMarkerAnimation(markers);
  const kmMarkersRef = useRef<maplibregl.Marker[]>([]);
  const elevationHoverMarker = useRef<maplibregl.Marker | null>(null);

  // Start & Finish Marker Visibility State & Refs
  const [showStartFinish, setShowStartFinish] = useState(true);
  const startMarkerRef = useRef<maplibregl.Marker | null>(null);
  const finishMarkerRef = useRef<maplibregl.Marker | null>(null);

  useEffect(() => {
    const startEl = startMarkerRef.current?.getElement();
    const finishEl = finishMarkerRef.current?.getElement();
    if (startEl) startEl.style.display = showStartFinish ? "block" : "none";
    if (finishEl) finishEl.style.display = showStartFinish ? "block" : "none";
  }, [showStartFinish]);

  const handleElevationHover = useCallback((lat: number, lng: number, distance: number | null) => {
    if (!mapInstance.current) return;

    if (distance !== null && lat !== 0 && lng !== 0 && !isNaN(lat) && !isNaN(lng)) {
      if (!elevationHoverMarker.current) {
        const el = document.createElement("div");
        el.className = "elevation-hover-arrow";
        el.style.cssText = `
          display: flex;
          flex-direction: column;
          align-items: center;
          pointer-events: none;
          z-index: 99999;
        `;
        el.innerHTML = `
          <div class="hover-km-badge" style="
            background: #2563eb;
            color: #ffffff;
            padding: 2px 7px;
            border-radius: 6px;
            font-size: 9.5px;
            font-weight: 900;
            white-space: nowrap;
            box-shadow: 0 4px 12px rgba(37, 99, 235, 0.4);
            border: 1.5px solid #ffffff;
            margin-bottom: 2px;
          ">
            📍 ${(distance / 1000).toFixed(2)} KM
          </div>
          <div style="
            width: 0;
            height: 0;
            border-left: 6px solid transparent;
            border-right: 6px solid transparent;
            border-top: 9px solid #2563eb;
            filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));
          "></div>
        `;
        elevationHoverMarker.current = new maplibregl.Marker({ element: el, anchor: "bottom" })
          .setLngLat([lng, lat])
          .addTo(mapInstance.current);
      } else {
        elevationHoverMarker.current.setLngLat([lng, lat]);
        const badge = elevationHoverMarker.current.getElement().querySelector(".hover-km-badge");
        if (badge) {
          badge.textContent = `📍 ${(distance / 1000).toFixed(2)} KM`;
        }
      }
    } else {
      if (elevationHoverMarker.current) {
        elevationHoverMarker.current.remove();
        elevationHoverMarker.current = null;
      }
    }
  }, []);

  const addKilometerMarkers = useCallback((map: maplibregl.Map, routeGeojson: any, isVisible: boolean) => {
    const coords = getRouteCoordinates(routeGeojson);
    if (!coords || coords.length < 2) return;

    const calculateHaversine = (lat1: number, lon1: number, lat2: number, lon2: number) => {
      const R = 6371e3;
      const φ1 = (lat1 * Math.PI) / 180;
      const φ2 = (lat2 * Math.PI) / 180;
      const Δφ = ((lat2 - lat1) * Math.PI) / 180;
      const Δλ = ((lon2 - lon1) * Math.PI) / 180;
      const a =
        Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
        Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
      return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    };

    let accumulatedMeters = 0;
    let nextKmTarget = 1000;
    const kmFeatures: any[] = [];

    for (let i = 1; i < coords.length; i++) {
      const [prevLng, prevLat] = coords[i - 1];
      const [currLng, currLat] = coords[i];
      const segDist = calculateHaversine(prevLat, prevLng, currLat, currLng);

      while (accumulatedMeters + segDist >= nextKmTarget) {
        const remainingMeters = nextKmTarget - accumulatedMeters;
        const fraction = segDist > 0 ? remainingMeters / segDist : 0;
        const kmLat = prevLat + (currLat - prevLat) * fraction;
        const kmLng = prevLng + (currLng - prevLng) * fraction;
        const kmNum = Math.round(nextKmTarget / 1000);

        if (!isNaN(kmLng) && !isNaN(kmLat)) {
          kmFeatures.push({
            type: "Feature",
            geometry: { type: "Point", coordinates: [kmLng, kmLat] },
            properties: { title: `${kmNum} KM` },
          });
        }
        nextKmTarget += 1000;
      }
      accumulatedMeters += segDist;
    }

    const geojson = {
      type: "FeatureCollection",
      features: kmFeatures,
    };

    if (map.getSource("km-markers-source")) {
      (map.getSource("km-markers-source") as maplibregl.GeoJSONSource).setData(geojson as any);
    } else {
      map.addSource("km-markers-source", { type: "geojson", data: geojson as any });
      map.addLayer({
        id: "km-markers-layer",
        type: "symbol",
        source: "km-markers-source",
        minzoom: 11,
        layout: {
          "text-field": ["get", "title"],
          "text-font": ["Open Sans Bold", "Arial Unicode MS Bold"],
          "text-size": 11,
          "text-anchor": "center",
          "text-allow-overlap": false,
          "visibility": isVisible ? "visible" : "none",
        },
        paint: {
          "text-color": "#4f46e5",
          "text-halo-color": "#ffffff",
          "text-halo-width": 2.5,
          "text-halo-blur": 0.5,
        },
      });
    }
  }, []);

  // Sync KM markers toggle state with MapLibre WebGL Layer
  useEffect(() => {
    if (mapInstance.current && mapInstance.current.getLayer("km-markers-layer")) {
      mapInstance.current.setLayoutProperty(
        "km-markers-layer",
        "visibility",
        showKmMarkers ? "visible" : "none",
      );
    }
  }, [showKmMarkers]);

  // ── Derived Data ────────────────────────────────────────────
  const sortedParticipants = useMemo(() => {
    return Array.from(participants.values()).sort((a, b) => {
      const distA = a.distanceKm ?? a.progressKm ?? 0;
      const distB = b.distanceKm ?? b.progressKm ?? 0;
      if (distA !== distB) return distB - distA;
      return (b.speed || 0) - (a.speed || 0);
    });
  }, [participants]);

  const leaderUserId = useMemo(() => {
    return sortedParticipants.length > 0 ? String(sortedParticipants[0].id) : null;
  }, [sortedParticipants]);

  // Compute monitoring status
  const monitoringStatus = useMemo(() => {
    return event?.status || null;
  }, [event]);

  // Countdown to actualStart
  const countdown = useMemo(() => {
    if (!event?.monitoringWindow?.actualStart) return null;
    const actualStart = new Date(event.monitoringWindow.actualStart);
    const diff = actualStart.getTime() - now.getTime();
    if (diff <= 0) return null;

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);
    return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  }, [event, now]);

  // ── Timer tick (update `now` every second) ──────────────────
  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  // ── FORCE RENDER: Keep mapIsReadyRef in sync with state ─────
  useEffect(() => {
    mapIsReadyRef.current = mapIsReady;
    console.log("[ForceRender] mapIsReadyRef synced to", mapIsReady);

    // Drain any pending updates the socket queued before the map was ready
    if (mapIsReady && mapInstance.current && pendingUpdates.current.length > 0) {
      console.log(
        "[ForceRender] 🔄 Draining",
        pendingUpdates.current.length,
        "queued updates NOW.",
      );
      const queued = [...pendingUpdates.current];
      pendingUpdates.current = [];

      setParticipants((prev) => {
        const next = new Map(prev);
        queued.forEach(({ userId, data, lat, lng }) => {
          const current = next.get(userId) || { id: userId };
          next.set(userId, { ...current, ...data, lat, lng, lastUpdate: Date.now() });
        });
        return next;
      });

      // Fly to the first queued participant
      if (!hasFlownToFirst.current && queued.length > 0) {
        hasFlownToFirst.current = true;
        mapInstance.current.flyTo({
          center: [queued[0].lng, queued[0].lat],
          zoom: 16,
          essential: true,
        });
      }
    }
  }, [mapIsReady]);

  const handleDismissAnomaly = async (alertId: string, userId?: string) => {
    // 1. Optimistic removal from Zustand store and local React state
    removeAnomaly(alertId);

    if (userId) {
      setParticipants((prev) => {
        const next = new Map(prev);
        const p = next.get(userId);
        if (p) {
          next.set(userId, {
            ...p,
            isAnomaly: false,
            status: "active",
          });
          const marker = markers.current.get(userId);
          if (marker) {
            (marker as any).__stateKey = null; // Force pulse marker element rebuild
          }
        }
        return next;
      });
    }

    try {
      const token = getCookie("auth_token");
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

      // Permanently delete anomaly from PostgreSQL database
      if (alertId.startsWith("db-anomaly-")) {
        await authenticatedFetch(`${apiUrl}/events/${eventId}/anomalies/${alertId}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        });
      } else if (userId) {
        await authenticatedFetch(`${apiUrl}/events/${eventId}/anomalies/user/${userId}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        });
      }
    } catch (err) {
      console.warn("[Anomaly] Error deleting anomaly from backend:", err);
    }
  };

  const handleUpdateParticipantState = async (
    userId: string,
    newState: string,
    alertId?: string,
  ) => {
    try {
      const token = getCookie("auth_token");
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
      const res = await authenticatedFetch(
        `${apiUrl}/events/${eventId}/participants/${userId}/state`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ state: newState }),
        },
      );
      if (!res.ok) throw new Error("Failed to update participant state");

      setParticipants((prev) => {
        const next = new Map(prev);
        const p = next.get(userId);
        if (p) {
          next.set(userId, { ...p, participantState: newState, isAnomaly: false });

          // Force reset marker visually immediately
          const marker = markers.current.get(userId);
          if (marker) {
            updateMarkerElement(
              marker.getElement(),
              p.name || `User ${userId.substring(0, 4)}`,
              p.status || "active",
              false,
              false, // isAnomaly = false
              participantsInfo.current.get(userId)?.color || p.color,
            );
          }
        }
        return next;
      });

      // Permanently clear anomalies for this participant when unfreezing
      if (newState === "TRACKING") {
        await authenticatedFetch(`${apiUrl}/events/${eventId}/anomalies/user/${userId}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        }).catch(() => {});
      }

      if (alertId) {
        handleDismissAnomaly(alertId, userId);
      }
    } catch (e) {
      console.error("Error updating participant state:", e);
      alert("Gagal mengupdate state partisipan.");
    }
  };

  const [statusLoading, setStatusLoading] = useState(false);
  const handleUpdateStatus = async (newStatus: string) => {
    try {
      setStatusLoading(true);
      const token = getCookie("auth_token");
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
      const res = await authenticatedFetch(`${apiUrl}/events/${eventId}/status`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error("Failed to update status");
      // Assuming eventMetadata is part of your store or state, you'd update it here if necessary.
      // For now, the dashboard will rely on socket updates or next polling.
    } catch (e) {
      console.error("Error updating status:", e);
      alert("Gagal mengupdate status acara.");
    } finally {
      setStatusLoading(false);
    }
  };

  // ── 1. Initial Data Fetch ───────────────────────────────────
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";
        const startTime = performance.now();
        const res = await authenticatedFetch(`${apiUrl}/events/${eventId}`, {
          headers: { Authorization: `Bearer ${getCookie("auth_token")}` },
        });

        if (!res.ok) throw new Error(`Failed to fetch event data: ${res.status}`);

        const textResponse = await res.text();
        const payloadSizeMb = (new Blob([textResponse]).size / (1024 * 1024)).toFixed(2);
        const endTime = performance.now();
        console.log(
          `[INIT] ⏱️ Event fetch took ${(endTime - startTime).toFixed(0)}ms. Payload size: ${payloadSizeMb} MB`,
        );

        const response = JSON.parse(textResponse);
        const eventData = response.success ? response.data : response;

        eventData.routeGeojson = toRouteFeatureCollection(eventData.routeGeojson);
        if (eventData.routeGeojson.features.length === 0) {
          console.warn(
            "[INIT] ⚠️ No route geometry detected for this event. Using empty fallback.",
          );
        }

        // Fetch participants for mapping
        try {
          const partsRes = await authenticatedFetch(`${apiUrl}/events/${eventId}/participants`, {
            headers: { Authorization: `Bearer ${getCookie("auth_token")}` },
          });
          if (partsRes.ok) {
            const partsData = await partsRes.json();
            if (partsData.success && partsData.data) {
              partsData.data.forEach((p: any) => {
                const firstName = p.name ? p.name.split(" ")[0] : "Runner";
                const bibNumber = p.bibNumber || "-";
                participantsInfo.current.set(String(p.id), {
                  name: p.name,
                  firstName: firstName,
                  bibNumber: bibNumber,
                  formattedName: `${bibNumber} - ${firstName}`,
                  healthInfo: p.healthInfo,
                  email: p.email,
                  phone: p.phone,
                  color: generateRandomColor(),
                });
              });
              console.log("[INIT] 👥 Loaded participants mapping:", participantsInfo.current.size);
            }
          }
        } catch (e) {
          console.warn("[INIT] ⚠️ Could not fetch participants mapping:", e);
        }

        // FIX: Set event AND loading=false in the same synchronous block
        // so React batches them into ONE render. This ensures mapContainer ref
        // is in the DOM when the map init useEffect fires.
        setEvent(eventData);
        setLoading(false);

        // Fetch live positions AFTER loading gate is removed.
        // Wrapped in its own try-catch so failures don't break the map.
        try {
          const posRes = await authenticatedFetch(`${apiUrl}/events/${eventId}/live`, {
            headers: { Authorization: `Bearer ${getCookie("auth_token")}` },
          });

          if (posRes.ok) {
            const livePositions = await posRes.json();
            console.log("[INIT] 🟢 Loaded", livePositions.length, "live positions from Redis");

            if (livePositions.length > 0) {
              setParticipants((prev) => {
                const next = new Map(prev);
                livePositions.forEach((p: any) => {
                  const uid = String(p.userId);
                  if (next.has(uid)) return;
                  const isOfflineNormalized = isParticipantOffline(p.isOffline);
                  console.log(
                    `[INIT Debug] User ${uid} raw isOffline:`,
                    p.isOffline,
                    "-> normalized:",
                    isOfflineNormalized,
                  );
                  const pInfo = participantsInfo.current.get(uid);
                  next.set(uid, {
                    id: uid,
                    name: pInfo?.formattedName || p.name || `User ${String(uid).substring(0, 4)}`,
                    bibNumber: pInfo?.bibNumber || p.bibNumber || "-",
                    lat: parseFloat(p.lat),
                    lng: parseFloat(p.lng),
                    color: pInfo?.color,
                    speed: parseFloat(p.speed) || 0,
                    battery:
                      p.battery != null && !isNaN(parseInt(p.battery))
                        ? parseInt(p.battery)
                        : undefined,
                    status: isOfflineNormalized ? "inactive" : "active",
                    isOffline: isOfflineNormalized,
                    routeIndex: p.routeIndex != null ? parseInt(p.routeIndex) : undefined,
                    routeDistance: p.routeDistance != null ? parseFloat(p.routeDistance) : undefined,
                    routeElevation: p.routeElevation != null ? parseFloat(p.routeElevation) : undefined,
                    lastUpdate: Date.now(),
                  });
                });
                return next;
              });
            }
          } else {
            console.warn("[INIT] ⚠️ Could not fetch live positions, status:", posRes.status);
          }
        } catch (posErr) {
          console.warn("[INIT] ⚠️ Live positions fetch error (non-fatal):", posErr);
        }

        // Fetch historical path data so polylines persist on refresh
        try {
          const pathRes = await authenticatedFetch(`${apiUrl}/events/${eventId}/path-history`, {
            headers: { Authorization: `Bearer ${getCookie("auth_token")}` },
          });
          if (pathRes.ok) {
            const historyMap = await pathRes.json();
            console.log(
              "[INIT] 🗺️ Loaded path history for",
              Object.keys(historyMap).length,
              "participants",
            );

            setParticipants((prev) => {
              const next = new Map(prev);
              for (const [uidStr, path] of Object.entries(historyMap)) {
                const current = next.get(uidStr) || { id: uidStr };
                const color = current.color || generateRandomColor();
                next.set(uidStr, { ...current, pathHistory: path as number[][], color });

                // Update participantsInfo cache
                const pInfo = participantsInfo.current.get(uidStr);
                if (pInfo) pInfo.color = color;
              }
              return next;
            });
          }
        } catch (pathErr) {
          console.warn("[INIT] ⚠️ Path history fetch error (non-fatal):", pathErr);
        }

        // Fetch historical anomalies so incident stream persists on refresh / new admin session
        try {
          const anomalyRes = await authenticatedFetch(`${apiUrl}/events/${eventId}/anomalies`, {
            headers: { Authorization: `Bearer ${getCookie("auth_token")}` },
          });
          if (anomalyRes.ok) {
            const historicalAnomalies = await anomalyRes.json();
            console.log(
              "[INIT] 🚨 Loaded",
              historicalAnomalies.length,
              "historical anomalies from DB",
            );
            if (Array.isArray(historicalAnomalies) && historicalAnomalies.length > 0) {
              useParticipantStore.getState().setAnomalies(historicalAnomalies);
              setParticipants((prev) => {
                const next = new Map(prev);
                historicalAnomalies.forEach((a: any) => {
                  const uid = String(a.userId);
                  const current = next.get(uid);
                  if (current) {
                    next.set(uid, {
                      ...current,
                      isAnomaly: true,
                      hasAlert: true,
                      status:
                        a.type === "STOP"
                          ? "stopped"
                          : a.type === "OFF_ROUTE"
                            ? "off-route"
                            : "emergency",
                    });
                  }
                });
                return next;
              });
            }
          }
        } catch (anomErr) {
          console.warn("[INIT] ⚠️ Anomalies fetch error (non-fatal):", anomErr);
        }
      } catch (err: any) {
        setError(err.message);
        setLoading(false);
      }
    };
    void fetchInitialData();
  }, [eventId]);

  // ── 2. Initialize MapLibre ──────────────────────────────────
  useEffect(() => {
    if (!event || !mapContainer.current) return;

    // Reset ready state when map reinitialized
    setMapIsReady(false);

    const firstCoord = getRouteCoordinates(event.routeGeojson)[0];
    const startCoord: [number, number] = firstCoord
      ? [firstCoord[0], firstCoord[1]]
      : [106.8272, -6.1754];

    const mapStyle = "https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json";

    const map = new maplibregl.Map({
      container: mapContainer.current,
      style: mapStyle,
      center: startCoord,
      zoom: 12.5,
      pitch: is3DMode ? 55 : 0,
      bearing: is3DMode ? -15 : 0,
      maxPitch: 85,
    });

    // PILLAR 2: Store the map instance immediately (before load)
    // so the socket handler can check if the map object exists
    mapInstance.current = map;

    map.on("load", () => {
      // Add Navigation control at bottom-right (clears top of map)
      map.addControl(
        new maplibregl.NavigationControl({
          visualizePitch: true,
          showCompass: true,
          showZoom: true,
        }),
        "bottom-right",
      );

      // Add 3D Terrain DEM Elevation Source
      try {
        if (!map.getSource("maplibre-dem")) {
          map.addSource("maplibre-dem", {
            type: "raster-dem",
            url: "https://demotiles.maplibre.org/terrain-tiles/tiles.json",
            tileSize: 256,
          });
          map.setTerrain({ source: "maplibre-dem", exaggeration: 1.5 });
        }
      } catch (demErr) {
        console.warn("[Map] ⚠️ Could not load 3D terrain DEM source:", demErr);
      }

      // Add Route Source
      map.addSource("route", { type: "geojson", data: event.routeGeojson });

      // Add Route Glow Layer
      map.addLayer({
        id: "route-glow",
        type: "line",
        source: "route",
        layout: { "line-join": "round", "line-cap": "round" },
        paint: {
          "line-color": "#4f46e5",
          "line-width": 8,
          "line-opacity": 0.3,
          "line-blur": 5,
        },
      });

      // Add Main Route Line Layer
      map.addLayer({
        id: "route-main",
        type: "line",
        source: "route",
        layout: { "line-join": "round", "line-cap": "round" },
        paint: {
          "line-color": "#4f46e5",
          "line-width": 4,
          "line-opacity": 0.9,
        },
      });

      // Add kilometer distance badges along the route (WebGL Layer)
      addKilometerMarkers(map, event.routeGeojson, showKmMarkers);

      // PILLAR 2: Signal map is ready — triggers Marker Sync useEffect
      setMapIsReady(true);

      // ADD START AND FINISH MARKERS & AUTO-FIT ROUTE BOUNDS
      const coords = getRouteCoordinates(event.routeGeojson);
      if (coords && coords.length > 0) {
        const bounds = new maplibregl.LngLatBounds();
        coords.forEach((c) => bounds.extend([c[0], c[1]]));
        map.fitBounds(bounds, { padding: 70, maxZoom: 14 });

        const startPoint = coords[0];
        const finishPoint = coords[coords.length - 1];

        // Start Marker (Compact Emerald Pill)
        const startEl = document.createElement("div");
        startEl.innerHTML = `
          <div style="
            background: #10b981;
            color: #ffffff;
            font-size: 8px;
            font-weight: 900;
            padding: 1.5px 5.5px;
            border-radius: 9999px;
            border: 1.5px solid #ffffff;
            box-shadow: 0 2px 6px rgba(0,0,0,0.25);
            letter-spacing: 0.5px;
            display: flex;
            align-items: center;
            gap: 2.5px;
            pointer-events: none;
          ">
            <span style="font-size: 7px;">🟢</span> START
          </div>
        `;
        startMarkerRef.current = new maplibregl.Marker({ element: startEl, anchor: "center" })
          .setLngLat([startPoint[0], startPoint[1]])
          .addTo(map);

        // Finish Marker (Compact Rose Pill)
        const finishEl = document.createElement("div");
        finishEl.innerHTML = `
          <div style="
            background: #e11d48;
            color: #ffffff;
            font-size: 8px;
            font-weight: 900;
            padding: 1.5px 5.5px;
            border-radius: 9999px;
            border: 1.5px solid #ffffff;
            box-shadow: 0 2px 6px rgba(0,0,0,0.25);
            letter-spacing: 0.5px;
            display: flex;
            align-items: center;
            gap: 2.5px;
            pointer-events: none;
          ">
            <span style="font-size: 7px;">🏁</span> FINISH
          </div>
        `;
        finishMarkerRef.current = new maplibregl.Marker({ element: finishEl, anchor: "center" })
          .setLngLat([finishPoint[0], finishPoint[1]])
          .addTo(map);
      }

      console.log(
        "[Map] ✅ Map fully loaded. Draining",
        pendingUpdates.current.length,
        "queued updates.",
      );

      // Drain pending updates that arrived before load completed
      if (pendingUpdates.current.length > 0) {
        setParticipants((prev) => {
          const next = new Map(prev);
          pendingUpdates.current.forEach(({ userId, data, lat, lng }) => {
            const current = next.get(userId) || { id: userId };
            next.set(userId, { ...current, ...data, lat, lng, lastUpdate: Date.now() });
          });
          pendingUpdates.current = [];
          return next;
        });
        // Fly to the first pending participant
        const first = pendingUpdates.current[0];
        if (first) {
          map.flyTo({ center: [first.lng, first.lat], zoom: 15, essential: true });
        }
      }

      // PILLAR 4: Expose a console debug utility to teleport the map
      (window as any).__dashlyMap = {
        flyTo: (userId?: string) => {
          const pMap = (window as any).__dashlyParticipants as Map<string, any> | undefined;
          if (userId && pMap) {
            const p = pMap.get(userId);
            if (p) {
              map.flyTo({ center: [p.lng, p.lat], zoom: 18 });
              console.log(`[Debug] 🚁 Flying to user ${userId} at [${p.lng}, ${p.lat}]`);
            } else {
              console.warn(`[Debug] User ${userId} not found in participants map.`);
            }
          } else {
            // Fly to the first available participant
            const pMap2 = (window as any).__dashlyParticipants as Map<string, any> | undefined;
            const first2 = pMap2 ? Array.from(pMap2.values())[0] : null;
            if (first2) {
              map.flyTo({ center: [first2.lng, first2.lat], zoom: 18 });
              console.log(`[Debug] 🚁 Flying to first participant [${first2.lng}, ${first2.lat}]`);
            } else {
              console.warn("[Debug] No participants found yet.");
            }
          }
        },
        listParticipants: () => {
          const pMap = (window as any).__dashlyParticipants as Map<string, any> | undefined;
          if (pMap)
            console.table(
              Array.from(pMap.values()).map((p) => ({
                id: p.id,
                lat: p.lat,
                lng: p.lng,
                name: p.name,
              })),
            );
        },
      };
      console.log(
        "[Map] 🛠️ Debug utils ready. Use __dashlyMap.flyTo() or __dashlyMap.listParticipants() in the console.",
      );
    });

    map.on("error", (e) => console.error("[Map] ❌ MapLibre error:", e));

    return () => {
      map.remove();
      setMapIsReady(false);
      delete (window as any).__dashlyMap;
    };
  }, [event, currentTheme]);

  useEffect(() => {
    const socket = io(process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000", {
      autoConnect: false,
      transports: ["polling", "websocket"],
      reconnectionDelay: 2000,
      withCredentials: true,
    });
    let cancelled = false;
    let refreshing = false;

    const connect = async () => {
      const token = await refreshAccessToken();
      if (cancelled || !token) return;
      socket.auth = { token };
      socket.connect();
    };

    socket.on("connect", () => {
      console.log("🔌 Socket CONNECTED. SID:", socket.id);
      socket.emit("joinEventRoom", { eventId: Number(eventId) }, (response: any) => {
        if (response?.event === "joinError") console.error("🔌 Socket JOIN ERROR:", response.data);
      });
      socket.emit("joinPublicEventRoom", { eventId: Number(eventId) }, (response: any) => {
        if (response?.event === "joinError") console.error("🔌 Socket PUBLIC JOIN ERROR:", response.data);
      });
    });

    socket.on("disconnect", (reason: string) => {
      console.warn("🔌 Socket DISCONNECTED. Reason:", reason);
    });

    socket.on("connect_error", (err: Error) => {
      console.error("🔌 Socket CONNECT ERROR:", err.message);
    });

    socket.on("auth_error", async () => {
      if (refreshing) return;
      refreshing = true;
      const token = await refreshAccessToken();
      refreshing = false;
      if (cancelled || !token) return;
      socket.auth = { token };
      socket.disconnect().connect();
    });

    void connect();

    // ── EMERGENCY DEBUG: Catch-ALL listener ──────────────────
    // This fires for EVERY event the server sends, regardless of name.
    // If you see events here but NOT in position_update, the event name is wrong.
    socket.onAny(() => {
      // console.log('📡 RAW WS EVENT:', eventName, args);
    });

    socket.on("position_batch", (batchData: any) => {
      try {
        if (!batchData || !batchData.positions || !Array.isArray(batchData.positions)) return;

        let hasFlown = hasFlownToFirst.current;
        const newParticipants = new Map();

        batchData.positions.forEach((data: any) => {
          const userId = String(data.userId || data.participantId || data.id);
          const lat = parseFloat(data.lat);
          const lng = parseFloat(data.lng);

          if (isNaN(lat) || isNaN(lng)) return;

          const pInfo = participantsInfo.current.get(userId);
          if (pInfo) {
            data.name = pInfo.formattedName || pInfo.name || data.name;
            data.bibNumber = pInfo.bibNumber || data.bibNumber;
          }

          // ==========================================
          // KODE PENGUJIAN LATENSI UNTUK SKRIPSI
          // ==========================================
          const rawTime = data.timestamp || data.capturedAt || data.captured_at;

          if (rawTime) {
            const timeSentFromMobile = new Date(rawTime);
            const timeReceivedAtDashboard = new Date();

            const latencyMs = timeReceivedAtDashboard.getTime() - timeSentFromMobile.getTime();

            const formatTime = (d: Date) => {
              return (
                `${d.getHours().toString().padStart(2, "0")}:` +
                `${d.getMinutes().toString().padStart(2, "0")}:` +
                `${d.getSeconds().toString().padStart(2, "0")}.` +
                `${d.getMilliseconds().toString().padStart(3, "0")}`
              );
            };

            console.log(
              `[LATENCY TEST] Peserta ID: ${userId} \n` +
                `  ├─ Dikirim dari Mobile : ${formatTime(timeSentFromMobile)} \n` +
                `  ├─ Diterima di Dasbor  : ${formatTime(timeReceivedAtDashboard)} \n` +
                `  └─ Total Latensi       : ${latencyMs} ms`,
            );
          } else {
            console.warn(
              `[DEBUG] Tidak ada variabel waktu pada peserta ${userId}. Isi data:`,
              data,
            );
          }
          // ==========================================

          if (!mapIsReadyRef.current || !mapInstance.current) {
            pendingUpdates.current.push({ userId, data, lat, lng });
            return;
          }

          // Only fly to the participant on the very first update
          if (!hasFlown && mapInstance.current) {
            hasFlown = true;
            mapInstance.current.flyTo({ center: [lng, lat], zoom: 16 });
            // console.log(`[Map] 🚁 Initial lock-on to [${lng}, ${lat}]`);
          }

          if (!data.color) {
            const currentP = participantsInfo.current.get(userId);
            data.color = currentP?.color || generateRandomColor();
            if (currentP) currentP.color = data.color;
          }

          newParticipants.set(userId, { data, lat, lng });
        });

        if (hasFlown !== hasFlownToFirst.current) {
          hasFlownToFirst.current = hasFlown;
        }

        if (newParticipants.size > 0) {
          // Keep React state updated for the sidebar leaderboard list, but it no longer controls the map markers
          setParticipants((prev) => {
            const next = new Map(prev);
            newParticipants.forEach(({ data, lat, lng }, userId) => {
              const current = next.get(userId) || { id: userId, pathHistory: [] };
              const newHistory = [...(current.pathHistory || []), [lng, lat]];
              const isOfflineNormalized = isParticipantOffline(data.isOffline);
              next.set(userId, {
                ...current,
                ...data,
                isOffline: isOfflineNormalized,
                status: isOfflineNormalized ? "inactive" : data.status,
                lat,
                lng,
                routeIndex: data.routeIndex !== undefined && data.routeIndex !== null ? parseInt(data.routeIndex) : current.routeIndex,
                routeDistance:
                  data.routeDistance !== undefined &&
                  data.routeDistance !== null &&
                  parseFloat(data.routeDistance) > 0
                    ? parseFloat(data.routeDistance)
                    : current.routeDistance,
                routeElevation:
                  data.routeElevation !== undefined &&
                  data.routeElevation !== null &&
                  parseFloat(data.routeElevation) > 0
                    ? parseFloat(data.routeElevation)
                    : current.routeElevation,
                lastUpdate: Date.now(),
                pathHistory: newHistory,
              });
            });
            return next;
          });
        }
      } catch (e) {
        console.error("Socket error mapping position_batch:", e);
      }
    });

    socket.on("sync_batch", (data: any) => {
      try {
        if (!data || !data.userId || !data.points || !Array.isArray(data.points)) return;
        const userId = String(data.userId);

        // console.log(`[Map] 📦 Received offline sync batch for ${userId} with ${data.points.length} points.`);

        setParticipants((prev) => {
          const next = new Map(prev);
          const current = next.get(userId);
          if (!current) return prev; // If user not on map yet, wait for position_batch

          // Extract coordinates and append to history
          const newHistory = [...(current.pathHistory || [])];
          data.points.forEach((p: any) => {
            const lat = parseFloat(p.lat);
            const lng = parseFloat(p.lng);
            if (!isNaN(lat) && !isNaN(lng)) {
              newHistory.push([lng, lat]);
            }
          });

          next.set(userId, {
            ...current,
            pathHistory: newHistory,
          });
          return next;
        });
      } catch (e) {
        console.error("Socket error processing sync_batch:", e);
      }
    });

    socket.on("anomaly_detected", (data: any) => {
      try {
        // CRITICAL: Always use data.userId (users.id), NOT data.participantId (event_participants.id)
        const userId = String(data.userId);
        if (!userId || userId === "undefined") {
          console.warn("[Map] ⚠️ Anomaly with no userId, skipping:", data);
          return;
        }
        // console.log(`[Map] 🚨 Anomaly detected for user ${userId}:`, data.type);

        const pInfo = participantsInfo.current.get(userId);
        if (pInfo) {
          data.name = pInfo.formattedName || pInfo.name;
          data.bibNumber = pInfo.bibNumber;
        }

        // Push to Incident Stream (Zustand Store)
        useParticipantStore.getState().addAnomaly({
          ...data,
          userId,
          message: data.message || data.reason || "Unusual telemetry patterns detected.",
        });

        let marker = markers.current.get(userId);
        if (marker) {
          updateMarkerElement(
            marker.getElement(),
            data.name || `User ${userId.substring(0, 4)}`,
            "emergency",
            false,
            true,
          );
        }

        setParticipants((prev) => {
          const next = new Map(prev);
          const current = next.get(userId);
          if (current) {
            next.set(userId, {
              ...current,
              isAnomaly: true,
              status: "emergency",
              lastUpdate: Date.now(),
            });
          }
          return next;
        });
      } catch (e) {
        console.error("Socket error mapping anomaly:", e);
      }
    });

    socket.on("sos_triggered", (data: any) => {
      try {
        // CRITICAL: Always use data.userId (users.id), NOT data.participantId (event_participants.id)
        const userId = String(data.userId);
        if (!userId || userId === "undefined") {
          console.warn("[Map] ⚠️ SOS with no userId, skipping:", data);
          return;
        }
        // console.log(`[Map] 🚨 SOS EMERGENCY triggered for user ${userId}`);

        const pInfo = participantsInfo.current.get(userId);
        if (pInfo) {
          data.name = pInfo.formattedName || pInfo.name;
          data.bibNumber = pInfo.bibNumber;
        }

        // Push to Incident Stream (Zustand Store)
        useParticipantStore.getState().addAnomaly({
          ...data,
          userId,
          type: "SOS_EMERGENCY",
          severity: "HIGH",
          message: "Participant triggered manual SOS emergency.",
          timestamp: new Date().toISOString(),
        });

        let marker = markers.current.get(userId);
        if (marker) {
          updateMarkerElement(
            marker.getElement(),
            data.name || `User ${userId.substring(0, 4)}`,
            "emergency",
            false,
            true,
          );
        }

        setParticipants((prev) => {
          const next = new Map(prev);
          const current = next.get(userId);
          if (current) {
            next.set(userId, {
              ...current,
              isAnomaly: true,
              status: "emergency",
              lastUpdate: Date.now(),
            });
          }
          return next;
        });
      } catch (e) {
        console.error("Socket error mapping SOS:", e);
      }
    });

    // ── OFF-ROUTE ALERT (participant deviated from route) ──
    socket.on("off_route_alert", (data: any) => {
      try {
        const userId = String(data.userId);
        if (!userId || userId === "undefined") return;
        const distance = data.distance ?? data.offRouteDistance ?? 0;
        // console.log(`[Map] ⚠️ Off-route alert for user ${userId}:`, distance, 'm');

        const pInfo = participantsInfo.current.get(userId);
        const name = pInfo?.formattedName || pInfo?.name || `User ${userId.substring(0, 4)}`;

        useParticipantStore.getState().addAnomaly({
          ...data,
          userId,
          name,
          bibNumber: pInfo?.bibNumber,
          type: data.type || "OFF_ROUTE",
          message:
            data.message || `Participant deviated ${Math.round(distance)} meters from the route.`,
          timestamp: data.timestamp || new Date().toISOString(),
        });

        // Mark participant as having alert in sidebar
        setParticipants((prev) => {
          const next = new Map(prev);
          const current = next.get(userId);
          if (current) {
            next.set(userId, {
              ...current,
              hasAlert: true,
              status: "off-route",
              lastUpdate: Date.now(),
            });
          }
          return next;
        });
      } catch (e) {
        console.error("Socket error mapping off_route_alert:", e);
      }
    });

    // ── USER STOPPED (participant idle for too long) ──
    socket.on("user_stopped", (data: any) => {
      try {
        const userId = String(data.userId);
        if (!userId || userId === "undefined") return;
        // console.log(`[Map] 🛑 User stopped alert for user ${userId}:`, data.durationSec, 's');

        const pInfo = participantsInfo.current.get(userId);
        const name = pInfo?.formattedName || pInfo?.name || `User ${userId.substring(0, 4)}`;

        useParticipantStore.getState().addAnomaly({
          ...data,
          userId,
          name,
          bibNumber: pInfo?.bibNumber,
          type: data.type || "STOP",
          message: data.message || `Participant stopped for ${data.durationSec || 0} seconds.`,
          timestamp: data.timestamp || new Date().toISOString(),
        });

        // Mark participant as having alert in sidebar
        setParticipants((prev) => {
          const next = new Map(prev);
          const current = next.get(userId);
          if (current) {
            next.set(userId, {
              ...current,
              hasAlert: true,
              status: "stopped",
              lastUpdate: Date.now(),
            });
          }
          return next;
        });
      } catch (e) {
        console.error("Socket error mapping user_stopped:", e);
      }
    });

    socket.on("sync_batch", (data: any) => {
      try {
        const userId = String(data.userId);
        if (!data.points || !Array.isArray(data.points)) return;

        // console.log(`[Map] 📦 Received offline sync batch for user ${userId}: ${data.points.length} points`);

        setParticipants((prev) => {
          const next = new Map(prev);
          const current = next.get(userId) || { id: userId, pathHistory: [] };

          const newCoords = data.points.map((p: any) => [
            parseFloat(p.lng ?? p.longitude),
            parseFloat(p.lat ?? p.latitude),
          ]);
          const combinedHistory = [...(current.pathHistory || []), ...newCoords];

          next.set(userId, { ...current, pathHistory: combinedHistory });
          return next;
        });
      } catch (e) {
        console.error("Socket error mapping sync batch:", e);
      }
    });

    socket.on("sos_recovered", (data: any) => {
      const userId = String(data.userId || data.participantId || data.id);
      if (!userId || userId === "undefined") return;
      const marker = markers.current.get(userId);
      if (marker)
        updateMarkerElement(
          marker.getElement(),
          data.name || `User ${userId.substring(0, 4)}`,
          "active",
          false,
          false,
          participantsInfo.current.get(userId)?.color || data.color,
        );
      setParticipants((prev) => {
        const next = new Map(prev);
        const current = next.get(userId);
        if (current)
          next.set(userId, {
            ...current,
            isAnomaly: false,
            hasAlert: false,
            status: "active",
            lastUpdate: Date.now(),
          });
        return next;
      });
    });

    socket.on("participant_finished", (data: any) => {
      const userId = String(data.userId || data.participantId || data.id);
      if (!userId || userId === "undefined") return;
      const marker = markers.current.get(userId);
      if (marker)
        updateMarkerElement(
          marker.getElement(),
          data.name || `User ${userId.substring(0, 4)}`,
          "FINISHED",
          false,
          false,
          participantsInfo.current.get(userId)?.color || data.color,
        );
      setParticipants((prev) => {
        const next = new Map(prev);
        const current = next.get(userId);
        if (current) next.set(userId, { ...current, status: "finished", lastUpdate: Date.now() });
        return next;
      });
    });

    socket.on("EVENT_STATUS_CHANGED", (data: any) => {
      // console.log(`[Map] 🚦 EVENT STATUS CHANGED:`, data.status);
      setEvent((prev: any) => {
        if (!prev) return prev;
        return { ...prev, status: data.status };
      });
    });

    // ── EMERGENCY DEBUG: Manual test marker ──────────────────
    // Usage: Open browser console → window.addTestMarker()
    // If the red dot appears, MapLibre rendering works. Problem is data.
    // If the red dot does NOT appear, MapLibre itself is broken.
    (window as any).addTestMarker = () => {
      if (!mapInstance.current) {
        console.error("❌ addTestMarker: mapInstance.current is null!");
        return;
      }
      const center = mapInstance.current.getCenter();
      // console.log('🧪 Adding test marker at map center:', center);
      const el = document.createElement("div");
      el.style.cssText = `
        width: 30px; height: 30px;
        background: red;
        border-radius: 50%;
        border: 3px solid white;
        box-shadow: 0 0 20px red;
        z-index: 99999;
      `;
      new maplibregl.Marker({ element: el })
        .setLngLat([center.lng, center.lat])
        .addTo(mapInstance.current!);
      // console.log('🧪 ✅ Test marker added! If you see a RED DOT, rendering works.');
    };
    // console.log('🧪 Debug: window.addTestMarker() is ready. Call it in the console.');

    mqttClient.current = socket as any;
    return () => {
      cancelled = true;
      // console.log("Socket: Cleanup - Disconnecting...");
      socket.emit("leaveEventRoom", { eventId: Number(eventId) });
      socket.disconnect();
      delete (window as any).addTestMarker;
    };
  }, [eventId]); // CRITICAL: Stop reconnecting on 'event' object changes

  // ── 4. High-Performance Marker Sync ──────────────────────────
  // PILLAR 5: Only creates a new marker for NEW participants.
  // For existing ones, it just calls marker.setLngLat() — no memory leaks.
  // PILLAR 2: Depends on 'mapIsReady' (state, not ref) so it re-fires when map loads.
  useEffect(() => {
    if (!mapIsReady || !mapInstance.current) return;

    participants.forEach((data, userId) => {
      // PILLAR 1: Skip invalid coords
      if (isNaN(data.lat) || isNaN(data.lng)) {
        console.warn(`[Marker] ⚠️ Skipping marker for userId=${userId} — invalid coordinates.`);
        return;
      }

      const rank = sortedParticipants.findIndex((p) => String(p.id) === String(userId)) + 1;
      const rankStr = rank > 0 ? `${rank}` : "-";
      let marker = markers.current.get(userId);
      const isStale = isParticipantDisconnected(data);
      const pInfo = participantsInfo.current.get(String(userId));
      const rawName = pInfo?.name || (data.name && data.name !== "undefined" && !data.name.startsWith("User ") ? data.name : null) || `Participant ${String(userId).substring(0, 4)}`;
      const bibNum = pInfo?.bibNumber || data.bibNumber || "-";
      const displayName = `${rankStr}_${bibNum}_${rawName}`;

      if (!marker) {
        const el = createPulseMarker(
          displayName,
          data.status,
          isStale,
          data.isAnomaly,
          data.color,
        );
        marker = new maplibregl.Marker({
          element: el,
          anchor: "center",
          subpixelPositioning: true,
        })
          .setLngLat([data.lng, data.lat])
          .addTo(mapInstance.current!);
        markers.current.set(userId, marker);
        pushWaypoint(userId, data.lng, data.lat, data.speed, data.lastUpdate);
      } else {
        // High Performance: Smooth continuous 60fps telemetry queue & dead reckoning
        pushWaypoint(userId, data.lng, data.lat, data.speed, data.lastUpdate);

        const stateKey = `${displayName}_${data.status}_${isStale}_${data.isAnomaly}_${data.color}`;
        if ((marker as any).__stateKey !== stateKey) {
          (marker as any).__stateKey = stateKey;
          const el = marker.getElement();
          updateMarkerElement(
            el,
            displayName,
            data.status,
            isStale,
            data.isAnomaly,
            data.color,
          );
        }
      }
    });

    // Stale cleanup — remove markers for participants gone >5min
    const currentTime = Date.now();
    markers.current.forEach((marker, userId) => {
      const p = participants.get(userId);
      if (!p || currentTime - p.lastUpdate > 300000) {
        console.log(`[Marker] 🧹 Removing stale marker for userId=${userId}`);
        marker.remove();
        markers.current.delete(userId);
        removeMarkerTarget(userId);
      }
    });

    // --- DRAW HISTORICAL PATHS ---
    const map = mapInstance.current;
    if (map) {
      const features: any[] = [];
      participants.forEach((data, userId) => {
        if (data.pathHistory && data.pathHistory.length > 1) {
          features.push({
            type: "Feature",
            properties: { userId, color: data.color || "#10b981" },
            geometry: {
              type: "LineString",
              coordinates: data.pathHistory,
            },
          });
        }
      });

      const geojsonData = {
        type: "FeatureCollection",
        features,
      };

      const sourceId = "participants-paths";
      const source = map.getSource(sourceId) as maplibregl.GeoJSONSource;

      if (source) {
        source.setData(geojsonData as any);
      } else {
        map.addSource(sourceId, { type: "geojson", data: geojsonData as any });
        map.addLayer({
          id: "participants-paths-layer",
          type: "line",
          source: sourceId,
          layout: {
            "line-join": "round",
            "line-cap": "round",
            visibility: showPolylines ? "visible" : "none",
          },
          paint: {
            "line-color": ["get", "color"], // Dynamic colored paths
            "line-width": 3,
            "line-opacity": 0.6,
            "line-dasharray": [2, 2], // Dashed line to differentiate from main route
          },
        });
      }
    }
  }, [participants, mapIsReady, now, showPolylines]);

  // Effect to toggle polyline visibility instantly
  useEffect(() => {
    if (mapInstance.current && mapInstance.current.getLayer("participants-paths-layer")) {
      mapInstance.current.setLayoutProperty(
        "participants-paths-layer",
        "visibility",
        showPolylines ? "visible" : "none",
      );
    }
  }, [showPolylines]);

  // ── Interaction ─────────────────────────────────────────────
  const goToParticipant = (userId: string) => {
    const p = participants.get(userId);
    if (p && mapInstance.current) {
      if (typeof p.lng !== "number" || typeof p.lat !== "number" || isNaN(p.lng) || isNaN(p.lat)) {
        console.warn("Cannot go to participant: Missing coordinates", p);
        return;
      }
      setSelectedUserId(userId);
      mapInstance.current.flyTo({
        center: [p.lng, p.lat],
        zoom: 17,
        pitch: 60,
        essential: true,
      });
    }
  };

  if (loading)
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-slate-50 text-slate-700 gap-4">
        <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="font-black uppercase tracking-[0.2em] text-xs text-slate-600">
          Initializing Telemetry Core...
        </p>
      </div>
    );

  if (error)
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-rose-50 text-rose-700 p-8 text-center">
        <ShieldAlert className="w-16 h-16 mb-4 text-rose-500 opacity-80" />
        <h2 className="text-2xl font-black mb-2 uppercase tracking-tight text-slate-900">Stream Access Denied</h2>
        <p className="text-sm font-medium mb-8 max-w-xs text-slate-600">{error}</p>
        <Link
          href="/dashboard/events"
          className="px-6 py-3 bg-rose-600 text-white rounded-xl font-bold uppercase text-xs tracking-widest hover:bg-rose-700 transition-all shadow-md"
        >
          Return to Directory
        </Link>
      </div>
    );

  const currentStatus = monitoringStatus
    ? STATUS_CONFIG[monitoringStatus as keyof typeof STATUS_CONFIG]
    : null;

  return (
    <div className="relative flex flex-col h-full w-full overflow-hidden bg-slate-50 font-sans">
      {/* ── TOP MAIN AREA: MAP & FLOATING OVERLAYS ── */}
      <div className="relative flex-1 w-full h-full overflow-hidden">
        {/* ── MAP INTERFACE (FULL SCREEN BASE) ── */}
        <div ref={mapContainer} className="absolute inset-0 w-full h-full z-0" />

      {/* Global HUD Header (Floating Top - Minimalist, Left-Aligned & Consolidated) */}
      <div className="absolute top-3 sm:top-5 left-3 sm:left-5 right-3 sm:right-5 z-40 flex items-center justify-start gap-2.5 flex-wrap pointer-events-none">
        {/* Left: Event Branding + Merged Live Active Info */}
        <div className="flex items-center gap-2.5 bg-white/95 backdrop-blur-xl p-1.5 pr-3.5 rounded-2xl border border-slate-200/80 shadow-lg pointer-events-auto max-w-full overflow-hidden">
          <Link
            href={`/events/${eventId}`}
            className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-colors shrink-0"
            title="Back to Event"
          >
            <ChevronLeft className="w-4 h-4 text-slate-700" />
          </Link>
          <div className="flex flex-col min-w-0">
            <span className="text-[8px] font-black text-indigo-600 uppercase tracking-widest leading-none mb-0.5">
              Telemetry Monitor
            </span>
            <h1 className="text-xs sm:text-sm font-black text-slate-900 uppercase tracking-tight truncate max-w-[120px] sm:max-w-[180px] leading-none">
              {event.name}
            </h1>
          </div>
          {/* Category Badge */}
          <div
            className={`hidden sm:flex px-2 py-0.5 rounded-md text-[8.5px] font-black uppercase tracking-widest items-center gap-1 shrink-0 ${
              event.category === "CYCLING"
                ? "bg-blue-50 text-blue-700 border border-blue-200"
                : "bg-emerald-50 text-emerald-700 border border-emerald-200"
            }`}
          >
            {event.category === "CYCLING" ? <Bike size={10} /> : <Footprints size={10} />}
            {event.category || "RUNNING"}
          </div>

          {/* Merged Live Active Status Pill */}
          {currentStatus && (
            <div className="flex items-center gap-1.5 px-2 py-0.5 bg-slate-100/90 border border-slate-200/80 rounded-md text-[8.5px] font-black text-slate-800 uppercase tracking-widest shrink-0">
              <div
                className={`w-2 h-2 rounded-full ${currentStatus.dotColor} ${monitoringStatus === "START" ? "animate-pulse shadow-[0_0_6px_rgba(16,185,129,0.8)]" : ""}`}
              />
              <span>{currentStatus.label}</span>
              <span className="text-slate-400 font-bold">•</span>
              <span className="text-indigo-600 font-black">{participants.size} Active</span>
            </div>
          )}
        </div>

        {/* Map Tools Dropdown Button (Left-Aligned next to event card) */}
        <div className="relative pointer-events-auto">
          <button
            onClick={() => setShowMapToolsMenu(!showMapToolsMenu)}
            className="flex items-center gap-2 px-3 py-2 bg-white/95 text-slate-700 font-black text-xs border border-slate-200 rounded-2xl shadow-md hover:bg-slate-50 transition-all"
          >
            <LayoutTemplate size={16} className="text-indigo-600" />
            <span>Map Tools</span>
            <ChevronDown size={14} className={`text-slate-400 transition-transform ${showMapToolsMenu ? "rotate-180" : ""}`} />
          </button>

          {/* Map Tools Dropdown Menu */}
          {showMapToolsMenu && (
            <div className="absolute left-0 mt-2 w-60 bg-white/95 backdrop-blur-2xl border border-slate-200 rounded-2xl shadow-2xl p-2 z-50 flex flex-col gap-1 animate-in fade-in zoom-in-95 duration-150">
              <div className="px-3 py-1 text-[9px] font-black text-slate-400 uppercase tracking-wider">
                Features & Panels
              </div>

              <button
                onClick={() => { setShowLeaderboard(!showLeaderboard); setShowMapToolsMenu(false); }}
                className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                  showLeaderboard ? "bg-indigo-50 text-indigo-700" : "hover:bg-slate-100 text-slate-700"
                }`}
              >
                <span className="flex items-center gap-2">
                  <PanelLeft size={15} /> Live Leaderboard
                </span>
                {showLeaderboard && <CheckCircle2 size={14} className="text-indigo-600" />}
              </button>

              <button
                onClick={() => { setShowPolylines(!showPolylines); setShowMapToolsMenu(false); }}
                className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                  showPolylines ? "bg-emerald-50 text-emerald-700" : "hover:bg-slate-100 text-slate-700"
                }`}
              >
                <span className="flex items-center gap-2">
                  <Navigation size={15} /> Participant Paths
                </span>
                {showPolylines && <CheckCircle2 size={14} className="text-emerald-600" />}
              </button>

              {event?.altitudeProfile && (
                <button
                  onClick={() => { setShowAltitudeChart(!showAltitudeChart); setShowMapToolsMenu(false); }}
                  className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                    showAltitudeChart ? "bg-fuchsia-50 text-fuchsia-700" : "hover:bg-slate-100 text-slate-700"
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <Mountain size={15} /> Elevation Profile
                  </span>
                  {showAltitudeChart && <CheckCircle2 size={14} className="text-fuchsia-600" />}
                </button>
              )}

              <button
                onClick={() => { setShowKmMarkers(!showKmMarkers); setShowMapToolsMenu(false); }}
                className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                  showKmMarkers ? "bg-blue-50 text-blue-700" : "hover:bg-slate-100 text-slate-700"
                }`}
              >
                <span className="flex items-center gap-2">
                  <Route size={15} /> KM Badges / Distance Markers
                </span>
                {showKmMarkers && <CheckCircle2 size={14} className="text-blue-600" />}
              </button>

              <button
                onClick={() => {
                  const next3D = !is3DMode;
                  setIs3DMode(next3D);
                  if (mapInstance.current) {
                    mapInstance.current.easeTo({ pitch: next3D ? 55 : 0, bearing: next3D ? -15 : 0, duration: 800 });
                  }
                  setShowMapToolsMenu(false);
                }}
                className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                  is3DMode ? "bg-indigo-50 text-indigo-700" : "hover:bg-slate-100 text-slate-700"
                }`}
              >
                <span className="flex items-center gap-2">
                  <Activity size={15} /> 3D Terrain Mode
                </span>
                {is3DMode && <CheckCircle2 size={14} className="text-indigo-600" />}
              </button>

              <button
                onClick={() => {
                  setShowStartFinish(!showStartFinish);
                  setShowMapToolsMenu(false);
                }}
                className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                  showStartFinish ? "bg-emerald-50 text-emerald-700" : "hover:bg-slate-100 text-slate-700"
                }`}
              >
                <span className="flex items-center gap-2">
                  <Flag size={15} /> Start & Finish Markers
                </span>
                {showStartFinish && <CheckCircle2 size={14} className="text-emerald-600" />}
              </button>
            </div>
          )}
        </div>

        {/* Standalone Incident Stream Toggle Button with Label (Left-aligned beside Map Tools) */}
        <button
          onClick={() => setShowAlerts(!showAlerts)}
          className={`relative flex items-center gap-2 px-3.5 py-2 rounded-2xl border transition-all pointer-events-auto ${
            showAlerts
              ? "bg-rose-600 text-white border-rose-500 shadow-lg shadow-rose-500/20"
              : "bg-white/95 text-slate-700 border-slate-200 shadow-md hover:bg-slate-50"
          }`}
          title="Incident Stream"
        >
          <AlertTriangle size={16} className={showAlerts ? "text-white" : "text-rose-600"} />
          <span className="text-xs font-black tracking-tight">Incident Stream</span>
          {anomalies.length > 0 && (
            <span className="min-w-[18px] h-[18px] px-1 bg-rose-500 text-white text-[9.5px] font-black rounded-full flex items-center justify-center border border-white shadow-md animate-pulse">
              {anomalies.length}
            </span>
          )}
        </button>
      </div>

      {/* Status Error Toast */}
      {statusError && (
        <div className="absolute top-24 left-1/2 -translate-x-1/2 z-50 pointer-events-auto animate-in fade-in slide-in-from-top-5 duration-300">
          <div className="bg-rose-600 text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-3 font-bold text-xs border border-rose-400/30">
            <AlertTriangle size={16} />
            {statusError}
          </div>
        </div>
      )}

      {/* ── LEFT FLOATING PANEL: LEADERBOARD (Minimalist Compact) ── */}
      <aside
        className={`absolute left-2 sm:left-4 top-[80px] sm:top-[88px] w-[calc(100%-16px)] sm:w-64 flex flex-col rounded-2xl border border-slate-200/90 bg-white/95 backdrop-blur-2xl z-30 bottom-4 sm:bottom-6 transition-all duration-300 ease-out ${showLeaderboard ? "translate-x-0 opacity-100 shadow-xl shadow-slate-400/15" : "-translate-x-[calc(100%+24px)] opacity-0 pointer-events-none"}`}
      >
        <div className="p-3 border-b border-slate-200 bg-slate-50/80 flex items-center justify-between rounded-t-2xl">
          <div className="flex items-center gap-2">
            <Trophy className="w-3.5 h-3.5 text-amber-500" />
            <h2 className="text-xs font-black uppercase tracking-wider text-slate-900">
              Live Ranking
            </h2>
          </div>
          <button
            onClick={() => setShowLeaderboard(false)}
            className="p-1 hover:bg-slate-200 rounded-lg text-slate-400 hover:text-slate-700 transition-colors"
          >
            <X size={13} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1.5 custom-scrollbar">
          {sortedParticipants.map((p, idx) => {
            const pInfo = participantsInfo.current.get(String(p.id)) || participantsInfo.current.get(String(p.userId));
            const rawName =
              pInfo?.name ||
              (p.name && p.name !== "undefined" && !p.name.startsWith("User ") ? p.name : null) ||
              `Participant ${String(p.id).substring(0, 4)}`;
            const bibNum = pInfo?.bibNumber || p.bibNumber || "-";

            return (
              <div
                key={p.id}
                onClick={() => goToParticipant(p.id)}
                className={`p-2 rounded-xl border transition-all cursor-pointer group relative overflow-hidden
                  ${
                    selectedUserId === p.id
                      ? "bg-indigo-50 border-indigo-300 shadow-sm text-slate-900"
                      : "bg-slate-50/80 border-slate-200/80 hover:bg-indigo-50/50 text-slate-900"
                  }
                  ${p.hasAlert ? "border-rose-300 bg-rose-50/90 text-rose-950" : ""}
                `}
              >
                <div className="flex items-center justify-between relative z-10">
                  <div className="flex items-center gap-2 min-w-0">
                    <div
                      className={`w-6 h-6 rounded-lg flex items-center justify-center text-[9px] font-black shrink-0
                      ${
                        idx === 0
                          ? "bg-amber-400 text-amber-950 shadow-sm border border-amber-300"
                          : idx === 1
                            ? "bg-slate-300 text-slate-900"
                            : idx === 2
                              ? "bg-orange-400 text-orange-950"
                              : "bg-slate-200 text-slate-800"
                      }
                    `}
                    >
                      {idx === 0 ? "👑 1" : idx + 1}
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="text-[12px] font-black text-slate-900 uppercase tracking-tight truncate w-28" title={`${bibNum} - ${rawName}`}>
                        {rawName}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[8.5px] font-extrabold text-indigo-600 bg-indigo-50 px-1 py-0.2 rounded border border-indigo-200/60">
                          BIB #{bibNum}
                        </span>
                        <span
                          className={`text-[8.5px] font-bold flex items-center gap-1 uppercase tracking-widest ${p.isOffline ? "text-slate-400" : "text-slate-500"}`}
                        >
                          <Signal
                            className={`w-2.5 h-2.5 ${p.isOffline ? "text-slate-400" : "text-emerald-500"}`}
                          />
                          {p.isOffline ? "Offline" : "Connected"}
                        </span>
                        {!p.isOffline && (
                          <span className="text-[8px] font-black text-indigo-600 bg-indigo-50 px-1 py-0.5 rounded border border-indigo-200 flex items-center gap-0.5 uppercase tracking-tighter">
                            <Route size={8} /> OSRM
                          </span>
                        )}
                        {p.hasAlert && (
                          <span className="text-[9px] font-black text-rose-600 animate-pulse uppercase">
                            Incident!
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                <div className="text-right flex flex-col items-end">
                  <div className="text-[13px] font-black text-slate-900">
                    {(p.speed || 0).toFixed(1)}{" "}
                    <span className="text-[8px] font-bold text-slate-500 uppercase">KM/H</span>
                  </div>
                  <div className="flex items-center justify-end gap-1 mt-0.5">
                    <Zap
                      className={`w-2.5 h-2.5 ${p.battery == null ? "text-slate-400" : p.battery < 20 ? "text-rose-500 animate-pulse" : "text-emerald-500"}`}
                    />
                    <span className="text-[10px] font-bold text-slate-500">
                      {p.battery != null ? `${p.battery}%` : "--%"}
                    </span>
                  </div>
                  <div className="mt-1">
                    <button
                      type="button"
                      className="px-2 py-0.5 bg-slate-200/80 hover:bg-slate-300 rounded text-[9px] font-bold text-slate-800 uppercase transition-colors"
                      onClick={(e) => {
                        e.stopPropagation();
                        const pInfo = participantsInfo.current.get(String(p.id));
                        setParticipantDetailModal({
                          ...p,
                          name: pInfo?.formattedName || p.name,
                          bibNumber: pInfo?.bibNumber || p.bibNumber,
                          user: {
                            healthInfo: pInfo?.healthInfo,
                            phone: pInfo?.phone,
                            email: pInfo?.email,
                          },
                        });
                      }}
                    >
                      Detail
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}

          {sortedParticipants.length === 0 && (
            <div className="flex flex-col items-center justify-center p-12 text-center opacity-50">
              <Radio className="w-12 h-12 text-slate-400 mb-4 animate-pulse" />
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                Listening for Telemetry...
              </p>
            </div>
          )}
        </div>
      </aside>

      {/* ── RIGHT FLOATING PANEL: ALERTS (Minimalist Compact) ── */}
      <aside
        className={`absolute right-2 sm:right-4 top-[80px] sm:top-[88px] w-[calc(100%-16px)] sm:w-64 flex flex-col rounded-2xl border border-slate-200/90 bg-white/95 backdrop-blur-2xl z-30 bottom-4 sm:bottom-6 transition-all duration-300 ease-out ${showAlerts ? "translate-x-0 opacity-100 shadow-xl shadow-rose-950/10" : "translate-x-[calc(100%+24px)] opacity-0 pointer-events-none"}`}
      >
        <div className="p-3 border-b border-slate-200 bg-slate-50/80 flex items-center justify-between rounded-t-2xl">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
            <h2 className="text-xs font-black uppercase tracking-wider text-slate-900">
              Incident Stream
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <div className="px-1.5 py-0.5 bg-rose-100 border border-rose-200 rounded-md text-rose-600 text-[9px] font-black">
              {anomalies.length}
            </div>
            <button
              onClick={() => setShowAlerts(false)}
              className="p-1 hover:bg-slate-200 rounded-lg text-slate-400 hover:text-slate-700 transition-colors"
            >
              <X size={13} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-2 custom-scrollbar">
          {anomalies.map((alert) => {
            const alertAny = alert as any;
            // CRITICAL: Use userId (users.id), not participantId (event_participants.id)
            const userIdStr = String(alertAny.userId || "");
            // Resolve name: first from participantsInfo (most reliable), then from alert payload, then from participants Map
            const pInfo = participantsInfo.current.get(userIdStr);
            const participantData = participants.get(userIdStr);
            const pName =
              pInfo?.formattedName ||
              alertAny.name ||
              participantData?.name ||
              `User ${userIdStr.substring(0, 4)}`;

            // Determine color based on alert type
            let colorAccent = "bg-rose-500";
            let textColorAccent = "text-rose-600";

            if (alert.type === "STOP") {
              colorAccent = "bg-amber-500";
              textColorAccent = "text-amber-600";
            } else if (alert.type === "OFF_ROUTE") {
              colorAccent = "bg-orange-500";
              textColorAccent = "text-orange-600";
            } else if (alert.type === "SOS_EMERGENCY") {
              colorAccent = "bg-rose-600";
              textColorAccent = "text-rose-600";
            }

            return (
              <div
                key={alert.id}
                onClick={() => goToParticipant(userIdStr)}
                className="relative overflow-hidden p-4 rounded-2xl bg-slate-50 border border-slate-200 shadow-sm hover:bg-rose-50/30 transition-all cursor-pointer group animate-in slide-in-from-right-10 duration-300"
              >
                <div className={`absolute top-0 left-0 w-1 h-full ${colorAccent}`}></div>
                <div className="flex justify-between items-start mb-2">
                  <span
                    className={`text-[10px] font-black uppercase tracking-widest ${textColorAccent}`}
                  >
                    {alert.type?.replace("_", " ") || "WARN"}
                  </span>
                  <span className="text-[9px] font-mono text-slate-600 bg-slate-200 px-1.5 py-0.5 rounded">
                    {new Date(alert.timestamp || Date.now()).toLocaleTimeString()}
                  </span>
                </div>
                <p className="text-[13px] font-bold text-slate-800 leading-snug mb-3">
                  {alertAny.message || alert.message || "Unusual telemetry patterns detected."}
                </p>
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[12px] font-black text-slate-900 uppercase tracking-tight">
                      {pName}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    {alert.type === "SOS_EMERGENCY" ||
                    participantData?.participantState === "FROZEN" ? (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          void handleUpdateParticipantState(userIdStr, "TRACKING", alert.id);
                        }}
                        className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded text-[9px] font-black uppercase transition-all"
                      >
                        🔓 Unfreeze
                      </button>
                    ) : (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          void handleDismissAnomaly(alert.id, userIdStr);
                        }}
                        className="px-2 py-1 bg-slate-200 hover:bg-slate-300 text-slate-700 border border-slate-300 rounded text-[9px] font-black uppercase transition-all"
                      >
                        Dismiss ✕
                      </button>
                    )}

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        goToParticipant(userIdStr);
                      }}
                      className="ml-auto text-[10px] font-black text-indigo-600 uppercase hover:text-indigo-800 transition-colors"
                    >
                      Inspect ➔
                    </button>
                  </div>
                </div>
              </div>
            );
          })}

          {anomalies.length === 0 && (
            <div className="flex flex-col items-center justify-center p-12 text-center opacity-40">
              <ShieldAlert className="w-12 h-12 text-emerald-600 mb-4" />
              <p className="text-[10px] font-bold text-emerald-700 uppercase tracking-widest">
                Normal Ops
              </p>
              <p className="text-[9px] text-slate-500 font-bold uppercase mt-1">No alerts found</p>
            </div>
          )}
        </div>
      </aside>

      {/* Alert Flash Overlay */}
      <div
        className={`absolute inset-0 pointer-events-none transition-all duration-300 z-40 ${isFlashing ? "bg-rose-500/10 opacity-100 shadow-[inset_0_0_150px_rgba(244,63,94,0.2)] border-[20px] border-rose-500/20" : "bg-transparent opacity-0"}`}
      ></div>

      </div>

      {/* ── DOCKED BOTTOM SECTION: ELEVATION PROFILE CHART (Light Mode Container) ── */}
      {showAltitudeChart && event?.altitudeProfile && (
        <div className="w-full h-[180px] sm:h-[200px] bg-slate-100/90 border-t border-slate-200 shadow-xl z-30 shrink-0 p-2 relative transition-all">
          <ElevationProfile
            altitudeProfile={event.altitudeProfile}
            participants={participants}
            onChartClick={(lat, lng) => {
              if (mapInstance.current) {
                mapInstance.current.flyTo({
                  center: [lng, lat],
                  zoom: 17,
                  duration: 1200,
                });
              }
            }}
            onChartHover={handleElevationHover}
          />
        </div>
      )}

      {/* Participant Detail Modal */}
      {participantDetailModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="bg-white border border-slate-200 rounded-3xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col">
            <div className="p-6 border-b border-slate-200 flex justify-between items-center bg-slate-50">
              <h2 className="text-lg font-black text-slate-900 tracking-widest uppercase">
                Participant Detail
              </h2>
              <button
                onClick={() => setParticipantDetailModal(null)}
                className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 flex flex-col gap-4">
              <div className="flex items-center gap-4 border-b border-slate-200 pb-4">
                <div className="w-16 h-16 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600 font-black text-2xl uppercase border border-indigo-200">
                  {participantDetailModal.name ? participantDetailModal.name.substring(0, 2) : "U"}
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-900">
                    {participantDetailModal.name ||
                      `User ${String(participantDetailModal.id).substring(0, 4)}`}
                  </h3>
                  <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">
                    BIB: #{participantDetailModal.bibNumber || "-"}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">
                    Blood Type
                  </p>
                  <p className="text-lg font-black text-rose-600">
                    {participantDetailModal.user?.healthInfo?.bloodType || "N/A"}
                  </p>
                </div>
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">
                    Phone
                  </p>
                  <p className="text-sm font-bold text-slate-800">
                    {participantDetailModal.user?.phone || "N/A"}
                  </p>
                </div>
              </div>

              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">
                  Medical Conditions
                </p>
                <p className="text-sm font-medium text-slate-800">
                  {participantDetailModal.user?.healthInfo?.medicalConditions?.join(", ") ||
                    "None reported"}
                </p>
              </div>

              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">
                  Emergency Contact
                </p>
                <p className="text-sm font-bold text-slate-800">
                  {participantDetailModal.user?.healthInfo?.emergencyContactName || "N/A"} -{" "}
                  {participantDetailModal.user?.healthInfo?.emergencyContactPhone || "N/A"}
                </p>
              </div>
            </div>
            <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-end">
              <button
                onClick={() => setParticipantDetailModal(null)}
                className="px-6 py-2.5 bg-slate-200 hover:bg-slate-300 rounded-xl text-xs font-bold text-slate-800 uppercase tracking-widest transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(0, 0, 0, 0.15);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(0, 0, 0, 0.25);
        }
        /* PILLAR 3: Keyframe for pulse animation in marker (replaces Tailwind animate-ping) */
        @keyframes ping {
          75%,
          100% {
            transform: scale(2);
            opacity: 0;
          }
        }
        /* Force MapLibre markers above all other layers */
        .maplibregl-marker {
          z-index: 9999 !important;
        }
      `}</style>
    </div>
  );
}

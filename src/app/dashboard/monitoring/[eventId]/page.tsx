"use client";

import React, { useEffect, useState, useRef, useMemo, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import maplibregl from "maplibre-gl";
const mapboxgl = maplibregl as unknown as typeof maplibregl;

// ── Helper to normalize boolean/string isOffline values ──
const isParticipantOffline = (val: any): boolean => {
  if (val === true || val === 'true') return true;
  if (val === false || val === 'false') return false;
  return false;
};

import "maplibre-gl/dist/maplibre-gl.css";
import Supercluster from 'supercluster';
import { io } from "socket.io-client";
import { useTheme } from "next-themes";
import {
  Activity, Users, MapPin, ShieldAlert, Navigation,
  Clock, ChevronLeft, Zap, AlertTriangle, Info,
  Trophy, Radio, Signal, LayoutTemplate, PanelLeft, PanelRight, X,
  Play, Square, Timer, Loader2, CheckCircle2, Hourglass, Bike, Footprints
} from "lucide-react";
import Link from "next/link";
import { useParticipantStore } from "@/store/useParticipantStore";
import { getRouteCoordinates, toRouteFeatureCollection } from "@/lib/utils/route-normalizer";

// ── Marker Styling (Inline CSS Only — Tailwind does NOT work inside MapLibre canvas) ─────────
// Helper to generate a random hex color from a predefined aesthetic palette
const generateRandomColor = (userId?: string) => {
  const colors = ['#f87171', '#fb923c', '#fbbf24', '#a3e635', '#4ade80', '#34d399', '#2dd4bf', '#38bdf8', '#60a5fa', '#818cf8', '#a78bfa', '#c084fc', '#e879f9', '#f472b6', '#fb7185'];
  if (userId) {
    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
      hash = userId.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  }
  return colors[Math.floor(Math.random() * colors.length)];
};

// Helper to inject HTML into an existing DOM element so we can update colors dynamically
const updateMarkerElement = (el: HTMLElement, name: string, status: string = 'moving', isStale: boolean = false, isAnomaly: boolean = false, userColor?: string) => {
  let coreColor = status === 'emergency'
    ? '#f43f5e'        // Rose — Emergency
    : status === 'off-route'
      ? '#f97316'      // Orange — Off Route
      : isAnomaly
        ? '#e11d48'        // Bright RED — Stationary Incident
        : status === 'stationary'
          ? '#f97316'        // Orange — Long stationary (not yet incident)
          : status === 'stopped'
            ? '#f59e0b'        // Amber — Stopped
            : userColor || '#10b981';       // Custom User Color or Emerald — Moving/Offline

  el.innerHTML = `
    <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);">
      <div style="
        width: 32px; height: 32px;
        border-radius: 50%;
        background: ${coreColor}30;
        animation: ${!isStale && status !== 'inactive' ? 'ping 1.5s cubic-bezier(0,0,0.2,1) infinite' : 'none'};
      "></div>
    </div>
    <div style="
      position: absolute;
      top: 50%; left: 50%;
      transform: translate(-50%, -50%);
      width: 20px; height: 20px;
      border-radius: 50%;
      background: ${coreColor};
      border: 3px solid white;
      box-shadow: 0 0 15px ${coreColor}80;
    "></div>
    <div class="marker-label" style="
      position: absolute;
      bottom: 100%;
      margin-bottom: 4px;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(15,23,42,0.9);
      color: white;
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 10px;
      font-weight: bold;
      white-space: nowrap;
      border: 1px solid rgba(255,255,255,0.1);
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.5);
      transition: opacity 0.2s ease, transform 0.2s ease;
    ">
      ${name}
    </div>
  `;
};

const createPulseMarker = (name: string, status: string = 'moving', isStale: boolean = false, isAnomaly: boolean = false, userColor?: string) => {
  const el = document.createElement("div");
  el.className = "dashly-marker";
  // PILLAR 3: Inline styles + z-index force
  el.style.cssText = `
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 36px;
    z-index: 9999;
    border-radius: 50%;
    cursor: pointer;
  `;
  updateMarkerElement(el, name, status, isStale, isAnomaly, userColor);
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
  }
};

export default function EventMonitoringPage() {
  const { eventId } = useParams();
  const router = useRouter();

  // ── States ──────────────────────────────────────────────────
  const [event, setEvent] = useState<any>(null);
  const [participants, setParticipants] = useState<Map<string, any>>(new Map());
  const anomalies = useParticipantStore((state) => state.anomalies);
  const removeAnomaly = useParticipantStore((state) => state.removeAnomaly);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isFlashing, setIsFlashing] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [isStatusUpdating, setIsStatusUpdating] = useState(false);
  const [statusError, setStatusError] = useState("");
  const [participantDetailModal, setParticipantDetailModal] = useState<any | null>(null);

  // HUD Visibility
  const [showLeaderboard, setShowLeaderboard] = useState(true);
  const [showAlerts, setShowAlerts] = useState(true);
  const [showPolylines, setShowPolylines] = useState(false);

  // Timer for monitoring window countdown
  const [now, setNow] = useState(new Date());

  // ── Refs ────────────────────────────────────────────────────
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<maplibregl.Map | null>(null);
  const [participantsCount, setParticipantsCount] = useState(0);
  // PILLAR 2: Map readiness state — triggers marker sync when map becomes ready
  const [mapIsReady, setMapIsReady] = useState(false);
  const [selectedDetailUserId, setSelectedDetailUserId] = useState<string | null>(null);
  // FORCE RENDER: Ref mirror so the socket closure always reads the LIVE value
  const mapIsReadyRef = useRef(false);
  // PILLAR 2: Queue for telemetry data that arrives before the map is loaded
  const pendingUpdates = useRef<any[]>([]);
  // FORCE RENDER: Ensure flyTo only fires once
  const hasFlownToFirst = useRef(false);
  // STORE STATIC USER INFO (bibNumber, name, etc.)
  const participantsInfo = useRef<Map<string, {name: string, firstName: string, bibNumber: string, formattedName: string, healthInfo?: any, email?: string, phone?: string, color?: string}>>(new Map());

  const { theme, systemTheme } = useTheme();
  const currentTheme = theme === "system" ? systemTheme : theme;
  const mqttClient = useRef<any>(null);
  const markers = useRef<Map<string, maplibregl.Marker>>(new Map());
  const clusterMarkers = useRef<Map<string, maplibregl.Marker>>(new Map());
  const superclusterRef = useRef<Supercluster | null>(null);

  useEffect(() => {
    superclusterRef.current = new Supercluster({
      radius: 40,
      maxZoom: 16,
    });
  }, []);

  const updateClusters = useCallback(() => {
    if (!mapInstance.current || !superclusterRef.current || !mapIsReadyRef.current) return;
    const map = mapInstance.current;
    
    const features: any[] = Array.from(participants.values())
      .filter(p => typeof p.lat === 'number' && typeof p.lng === 'number' && !isNaN(p.lat) && !isNaN(p.lng))
      .map(p => ({
        type: 'Feature',
        properties: { cluster: false, userId: String(p.id) },
        geometry: { type: 'Point', coordinates: [p.lng, p.lat] }
      }));
    
    superclusterRef.current.load(features);
    
    const zoom = Math.round(map.getZoom());
    const clusters = superclusterRef.current.getClusters([-180, -85, 180, 85], zoom);
    
    const nextKeys = new Set<string>();
    
    clusters.forEach((cluster: any) => {
      const [lng, lat] = cluster.geometry.coordinates;
      const isCluster = cluster.properties.cluster;
      
      if (isCluster) {
        const clusterId = cluster.properties.cluster_id;
        const pointCount = cluster.properties.point_count;
        const key = `cluster-${clusterId}`;
        nextKeys.add(key);
        
        let marker = clusterMarkers.current.get(key);
        if (!marker) {
          const wrapper = document.createElement('div');
          
          const el = document.createElement('div');
          el.className = 'dashly-cluster';
          el.style.cssText = `
            width: 36px; height: 36px;
            border-radius: 50%;
            background: rgba(79, 70, 229, 0.9);
            border: 3px solid white;
            color: white;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: bold;
            font-size: 14px;
            box-shadow: 0 0 15px rgba(79,70,229,0.5);
            cursor: pointer;
            z-index: 10000;
            transition: transform 0.2s;
          `;
          el.innerText = String(pointCount);
          wrapper.appendChild(el);
          
          wrapper.addEventListener('click', () => {
             const expansionZoom = superclusterRef.current!.getClusterExpansionZoom(clusterId);
             map.flyTo({ center: [lng, lat], zoom: expansionZoom });
          });
          wrapper.addEventListener('mouseenter', () => el.style.transform = 'scale(1.15)');
          wrapper.addEventListener('mouseleave', () => el.style.transform = 'scale(1)');
          
          marker = new maplibregl.Marker({ element: wrapper, anchor: 'center', pitchAlignment: 'viewport' })
            .setLngLat([lng, lat])
            .addTo(map);
          clusterMarkers.current.set(key, marker);
        } else {
          marker.setLngLat([lng, lat]);
          (marker.getElement().firstChild as HTMLDivElement).innerText = String(pointCount);
          marker.getElement().style.display = 'block';
        }
      } else {
        const userId = cluster.properties.userId;
        const key = `user-${userId}`;
        nextKeys.add(key);
        
        const marker = markers.current.get(userId);
        if (marker) {
          marker.getElement().style.display = 'flex';
        }
      }
    });
    
    clusterMarkers.current.forEach((marker, key) => {
      if (!nextKeys.has(key)) {
        marker.getElement().style.display = 'none';
      }
    });
    
    markers.current.forEach((marker, userId) => {
      if (!nextKeys.has(`user-${userId}`)) {
        marker.getElement().style.display = 'none';
      }
    });
    
  }, [participants]);

  useEffect(() => {
    updateClusters();
  }, [updateClusters]);

  useEffect(() => {
    if (!mapIsReady) return;
    const map = mapInstance.current;
    if (map) {
      map.on('zoom', updateClusters);
      return () => {
        map.off('zoom', updateClusters);
      };
    }
  }, [mapIsReady, updateClusters]);

  // ── Derived Data ────────────────────────────────────────────
  const sortedParticipants = useMemo(() => {
    return Array.from(participants.values()).sort((a, b) => {
      if (a.hasAlert && !b.hasAlert) return -1;
      if (!a.hasAlert && b.hasAlert) return 1;
      return (b.speed || 0) - (a.speed || 0);
    });
  }, [participants]);

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
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }, [event, now]);

  const getCookie = (name: string) => {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop()?.split(';').shift();
    return null;
  };

  // ── Timer tick (update `now` every second) ──────────────────
  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  // ── FORCE RENDER: Keep mapIsReadyRef in sync with state ─────
  useEffect(() => {
    mapIsReadyRef.current = mapIsReady;
    console.log('[ForceRender] mapIsReadyRef synced to', mapIsReady);

    // Drain any pending updates the socket queued before the map was ready
    if (mapIsReady && mapInstance.current && pendingUpdates.current.length > 0) {
      console.log('[ForceRender] 🔄 Draining', pendingUpdates.current.length, 'queued updates NOW.');
      const queued = [...pendingUpdates.current];
      pendingUpdates.current = [];

      setParticipants(prev => {
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
        mapInstance.current.flyTo({ center: [queued[0].lng, queued[0].lat], zoom: 16, essential: true });
      }
    }
  }, [mapIsReady]);



  const handleUpdateParticipantState = async (userIdStr: string, newState: string, alertId?: string) => {
    try {
      const token = getCookie("auth_token");
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";
      const res = await fetch(`${apiUrl}/events/${eventId}/participants/${userIdStr}/state`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ state: newState }),
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || "Failed to update participant state");
      }
      
      // Local state update
      setParticipants((prev) => {
        const next = new Map(prev);
        const current = next.get(userIdStr);
        if (current) {
          next.set(userIdStr, { ...current, status: "active", isAnomaly: false, hasAlert: false });
        }
        return next;
      });

      // Reset marker appearance
      let marker = markers.current.get(userIdStr);
      if (marker) {
        const pInfo = participantsInfo.current.get(userIdStr);
        updateMarkerElement(marker.getElement(), pInfo?.formattedName || `User ${userIdStr.substring(0, 4)}`, "active", false, false);
      }
      
      if (alertId) {
        removeAnomaly(alertId);
      }

      alert(`User has been unfrozen.`);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDismissAnomaly = async (userIdStr: string, alertId: string) => {
    try {
      const token = getCookie("auth_token");
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";
      
      const res = await fetch(`${apiUrl}/events/${eventId}/anomalies/${alertId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (!res.ok) {
        console.warn("Failed to delete anomaly on backend");
      }
      
      // Local state update
      setParticipants((prev) => {
        const next = new Map(prev);
        const current = next.get(userIdStr);
        if (current) {
          next.set(userIdStr, { ...current, status: "active", isAnomaly: false, hasAlert: false });
        }
        return next;
      });

      // Reset marker appearance
      let marker = markers.current.get(userIdStr);
      if (marker) {
        const pInfo = participantsInfo.current.get(userIdStr);
        updateMarkerElement(marker.getElement(), pInfo?.formattedName || `User ${userIdStr.substring(0, 4)}`, "active", false, false);
      }
      
      removeAnomaly(alertId);
    } catch (e) {
      console.warn("Error dismissing anomaly:", e);
      removeAnomaly(alertId); // Still remove from UI
    }
  };


  // ── 1. Initial Data Fetch ───────────────────────────────────
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const token = getCookie("auth_token");
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";
        const startTime = performance.now();
        const res = await fetch(`${apiUrl}/events/${eventId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });

        if (!res.ok) throw new Error(`Failed to fetch event data: ${res.status}`);

        const textResponse = await res.text();
        const payloadSizeMb = (new Blob([textResponse]).size / (1024 * 1024)).toFixed(2);
        const endTime = performance.now();
        console.log(`[INIT] ⏱️ Event fetch took ${(endTime - startTime).toFixed(0)}ms. Payload size: ${payloadSizeMb} MB`);

        const response = JSON.parse(textResponse);
        const eventData = response.success ? response.data : response;

        eventData.routeGeojson = toRouteFeatureCollection(eventData.routeGeojson);
        if (eventData.routeGeojson.features.length === 0) {
          console.warn("[INIT] ⚠️ No route geometry detected for this event. Using empty fallback.");
        }

        // Fetch participants for mapping
        try {
          const partsRes = await fetch(`${apiUrl}/events/${eventId}/participants`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          if (partsRes.ok) {
            const partsData = await partsRes.json();
            if (partsData.success && partsData.data) {
              partsData.data.forEach((p: any) => {
                const firstName = p.name ? p.name.split(' ')[0] : 'Runner';
                const bibNumber = p.bibNumber || '-';
                participantsInfo.current.set(String(p.id), {
                  name: p.name,
                  firstName: firstName,
                  bibNumber: bibNumber,
                  formattedName: `${bibNumber} - ${firstName}`,
                  healthInfo: p.healthInfo,
                  email: p.email,
                  phone: p.phone,
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
          const posRes = await fetch(`${apiUrl}/events/${eventId}/live`, {
            headers: { Authorization: `Bearer ${token}` }
          });

          if (posRes.ok) {
            const livePositions = await posRes.json();
            console.log("[INIT] 🟢 Loaded", livePositions.length, "live positions from Redis");
            
            if (livePositions.length > 0) {
              setParticipants(prev => {
                const next = new Map(prev);
                livePositions.forEach((p: any) => {
                  const uid = String(p.userId);
                  const isOfflineNormalized = isParticipantOffline(p.isOffline);
                  console.log(`[INIT Debug] User ${uid} raw isOffline:`, p.isOffline, '-> normalized:', isOfflineNormalized);
                  const pInfo = participantsInfo.current.get(uid);
                  next.set(uid, {
                    id: uid,
                    name: pInfo?.formattedName || p.name || `User ${String(uid).substring(0, 4)}`,
                    bibNumber: pInfo?.bibNumber || p.bibNumber || '-',
                    lat: parseFloat(p.lat),
                    lng: parseFloat(p.lng),
                    speed: parseFloat(p.speed) || 0,
                    battery: parseInt(p.battery) || 100,
                    status: isOfflineNormalized ? 'inactive' : 'active',
                    isOffline: isOfflineNormalized,
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
          const pathRes = await fetch(`${apiUrl}/events/${eventId}/path-history`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          if (pathRes.ok) {
            const historyMap = await pathRes.json();
            console.log("[INIT] 🗺️ Loaded path history for", Object.keys(historyMap).length, "participants");
            
            setParticipants(prev => {
              const next = new Map(prev);
              for (const [uidStr, path] of Object.entries(historyMap)) {
                 const current = next.get(uidStr) || { id: uidStr };
                 // Assign a consistent color if not already assigned
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

        // Fetch recent anomalies so the Incident Stream is populated on refresh
        try {
          const anomaliesRes = await fetch(`${apiUrl}/events/${eventId}/anomalies`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          if (anomaliesRes.ok) {
            const anomaliesData = await anomaliesRes.json();
            if (Array.isArray(anomaliesData)) {
              console.log("[INIT] 🚨 Loaded", anomaliesData.length, "recent anomalies");
              const uidsWithAnomaly = new Set<string>();
              anomaliesData.reverse().forEach((anomaly: any) => {
                const userIdStr = String(anomaly.userId);
                useParticipantStore.getState().addAnomaly({
                  id: anomaly.id,
                  eventId: anomaly.eventId,
                  userId: userIdStr,
                  type: anomaly.type,
                  message: anomaly.message,
                  timestamp: anomaly.timestamp,
                  severity: anomaly.type === 'SOS_EMERGENCY' ? 'CRITICAL' : 'HIGH',
                  name: anomaly.name,
                });
                uidsWithAnomaly.add(userIdStr);
              });
              
              if (uidsWithAnomaly.size > 0) {
                setParticipants(prev => {
                  const next = new Map(prev);
                  uidsWithAnomaly.forEach(uid => {
                    const current = next.get(uid);
                    if (current) {
                      const store = useParticipantStore.getState();
                      const hasSos = store.anomalies.some(a => String(a.userId) === uid && a.type === 'SOS_EMERGENCY');
                      const hasOffRoute = store.anomalies.some(a => String(a.userId) === uid && a.type === 'OFF_ROUTE');
                      const hasStop = store.anomalies.some(a => String(a.userId) === uid && a.type === 'STOP');
                      
                      let status = current.status;
                      if (hasSos) status = 'emergency';
                      else if (hasOffRoute) status = 'off-route';
                      else if (hasStop) status = 'stopped';
                      
                      next.set(uid, { ...current, status, isAnomaly: true, hasAlert: true });
                    }
                  });
                  return next;
                });
              }
            }
          }
        } catch (anomalyErr) {
          console.warn("[INIT] ⚠️ Anomalies fetch error:", anomalyErr);
        }

      } catch (err: any) {
        setError(err.message);
        setLoading(false);
      }
    };
    fetchInitialData();
  }, [eventId]);

  // ── 2. Initialize MapLibre ──────────────────────────────────
  useEffect(() => {
    if (!event || !mapContainer.current) return;

    // Reset ready state when map reinitialized
    setMapIsReady(false);

    const firstCoord = getRouteCoordinates(event.routeGeojson)[0];
    const startCoord: [number, number] = firstCoord ? [firstCoord[0], firstCoord[1]] : [106.8272, -6.1754];

    const isDark = currentTheme === "dark";
    const styleUrl = isDark
      ? "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json"
      : "https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json";

    const map = new maplibregl.Map({
      container: mapContainer.current,
      style: styleUrl,
      center: startCoord,
      zoom: 15,
      pitch: 45
    });

    // PILLAR 2: Store the map instance immediately (before load)
    // so the socket handler can check if the map object exists
    mapInstance.current = map;

    map.on("load", () => {
      map.addSource("route", { type: "geojson", data: event.routeGeojson });

      map.addLayer({
        id: "route-glow",
        type: "line",
        source: "route",
        layout: { "line-join": "round", "line-cap": "round" },
        paint: {
          "line-color": "#4f46e5",
          "line-width": 8,
          "line-opacity": 0.3,
          "line-blur": 5
        }
      });

      map.addLayer({
        id: "route-main",
        type: "line",
        source: "route",
        layout: { "line-join": "round", "line-cap": "round" },
        paint: {
          "line-color": "#4f46e5",
          "line-width": 4,
          "line-opacity": 0.9
        }
      });

      // PILLAR 2: Signal map is ready — triggers Marker Sync useEffect
      setMapIsReady(true);
      console.log('[Map] ✅ Map fully loaded. Draining', pendingUpdates.current.length, 'queued updates.');

      // Drain pending updates that arrived before load completed
      if (pendingUpdates.current.length > 0) {
        setParticipants(prev => {
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
              console.warn('[Debug] No participants found yet.');
            }
          }
        },
        listParticipants: () => {
          const pMap = (window as any).__dashlyParticipants as Map<string, any> | undefined;
          if (pMap) console.table(Array.from(pMap.values()).map(p => ({ id: p.id, lat: p.lat, lng: p.lng, name: p.name })));
        },
      };
      console.log('[Map] 🛠️ Debug utils ready. Use __dashlyMap.flyTo() or __dashlyMap.listParticipants() in the console.');
    });

    map.on('error', (e) => console.error('[Map] ❌ MapLibre error:', e));

    return () => {
      map.remove();
      setMapIsReady(false);
      delete (window as any).__dashlyMap;
    };
  }, [event, currentTheme]);

  useEffect(() => {
    const socket = io(process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000", {
      transports: ["polling", "websocket"], // Standard order: poll first then upgrade
      reconnectionDelay: 2000,
      withCredentials: true,
    });

    socket.on("connect", () => {
      console.log('🔌 Socket CONNECTED. SID:', socket.id);
      console.log('🔌 Socket joined room: event_' + eventId);
      socket.emit("joinEventRoom", { eventId: Number(eventId) });
    });

    socket.on("disconnect", (reason: string) => {
      console.warn('🔌 Socket DISCONNECTED. Reason:', reason);
    });

    socket.on("connect_error", (err: any) => {
      console.error('🔌 Socket CONNECT ERROR:', err.message);
    });

    // ── EMERGENCY DEBUG: Catch-ALL listener ──────────────────
    // This fires for EVERY event the server sends, regardless of name.
    // If you see events here but NOT in position_update, the event name is wrong.
    socket.onAny((eventName: string, ...args: any[]) => {
      console.log('📡 RAW WS EVENT:', eventName, args);
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

          if (!mapIsReadyRef.current || !mapInstance.current) {
            pendingUpdates.current.push({ userId, data, lat, lng });
            return;
          }

          // Only fly to the participant on the very first update
          if (!hasFlown && mapInstance.current) {
            hasFlown = true;
            mapInstance.current.flyTo({ center: [lng, lat], zoom: 16 });
            console.log(`[Map] 🚁 Initial lock-on to [${lng}, ${lat}]`);
          }

          // --- DIRECT MARKER MANIPULATION (Zero Latency) ---
          let marker = markers.current.get(userId);
          // If we don't have a color yet, generate one for the new participant
          if (!data.color) {
            let currentP = participantsInfo.current.get(userId) as any;
            if (!currentP) {
               currentP = { name: data.name, bibNumber: data.bibNumber };
               participantsInfo.current.set(userId, currentP);
            }
            if (!currentP.color) {
               currentP.color = generateRandomColor(userId);
            }
            data.color = currentP.color;
          }

          // Auto-resolve off-route if they returned
          if (data.offRoute === false) {
             useParticipantStore.getState().removeAnomalyByType(userId, 'OFF_ROUTE');
             
             // Auto-delete off-route from backend
             try {
               fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000"}/events/${eventId}/participants/${userId}/anomalies?type=OFF_ROUTE`, {
                 method: 'DELETE',
                 headers: { Authorization: `Bearer ${getCookie("auth_token")}` }
               });
             } catch(e) {
               console.warn("Auto-resolve delete failed", e);
             }

             // Also reflect in local data so next.set doesn't override it with true
             const store = useParticipantStore.getState();
             const hasOtherAnomalies = store.anomalies.some(a => String(a.userId) === userId && a.type !== 'OFF_ROUTE');
             data.isAnomaly = hasOtherAnomalies;
             data.hasAlert = hasOtherAnomalies;
             if (!hasOtherAnomalies && data.status !== 'inactive') {
               data.status = 'active'; // Reset to moving/active
             }
          } else if (data.offRoute === true) {
             data.status = 'off-route';
          }

          if (marker) {
            // Exists: Just slide it smoothly
            marker.setLngLat([lng, lat]);
            // Re-render HTML so color updates if status changes (e.g. inactive)
            updateMarkerElement(marker.getElement(), data.name || `User ${String(userId).substring(0, 4)}`, data.status, false, data.isAnomaly, data.color);
          } else {
            // Doesn't exist: Create instantly bypassing React
            console.log(`[Marker] ➕ Instant dumb-pipe creation for userId=${userId} at [lng=${lng}, lat=${lat}]`);
            const el = createPulseMarker(data.name || `User ${String(userId).substring(0, 4)}`, data.status, false, data.isAnomaly, data.color);
            marker = new maplibregl.Marker({ element: el, anchor: 'center', pitchAlignment: 'viewport' })
              .setLngLat([lng, lat])
              .addTo(mapInstance.current!);
            markers.current.set(userId, marker);
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
              
              // Preserve emergency/anomaly state
              // If data.isAnomaly is explicitly boolean, prefer it over current (allows resolution)
              const finalIsAnomaly = typeof data.isAnomaly === 'boolean' ? data.isAnomaly : (current.isAnomaly || false);
              
              let finalStatus = isOfflineNormalized ? 'inactive' : data.status;
              if (current.status === 'emergency' && finalStatus !== 'inactive' && finalIsAnomaly) {
                finalStatus = 'emergency';
              }
              
              const finalHasAlert = typeof data.hasAlert === 'boolean' ? data.hasAlert : current.hasAlert;

              next.set(userId, { 
                ...current, 
                ...data, 
                isAnomaly: finalIsAnomaly,
                hasAlert: finalHasAlert,
                isOffline: isOfflineNormalized, 
                status: finalStatus, 
                lat, 
                lng, 
                lastUpdate: Date.now(), 
                pathHistory: newHistory 
              });
            });
            return next;
          });
        }
      } catch (e) {
        console.error("Socket error mapping position_batch:", e);
      }
    });

    socket.on("anomaly_detected", (data: any) => {
      try {
        // CRITICAL: Always use data.userId (users.id), NOT data.participantId (event_participants.id)
        const userId = String(data.userId);
        if (!userId || userId === 'undefined') {
          console.warn('[Map] ⚠️ Anomaly with no userId, skipping:', data);
          return;
        }
        console.log(`[Map] 🚨 Anomaly detected for user ${userId}:`, data.type);
        
        const pInfo = participantsInfo.current.get(userId);
        if (pInfo) {
          data.name = pInfo.formattedName || pInfo.name;
          data.bibNumber = pInfo.bibNumber;
        }

        // Push to Incident Stream (Zustand Store)
        useParticipantStore.getState().addAnomaly({
          ...data,
          userId,
          message: data.message || data.reason || 'Unusual telemetry patterns detected.',
        });

        let marker = markers.current.get(userId);
        if (marker) {
          updateMarkerElement(marker.getElement(), data.name || `User ${userId.substring(0, 4)}`, "emergency", false, true);
        }

        setParticipants((prev) => {
          const next = new Map(prev);
          const current = next.get(userId);
          if (current) {
            next.set(userId, { ...current, isAnomaly: true, status: "emergency", lastUpdate: Date.now() });
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
        if (!userId || userId === 'undefined') {
          console.warn('[Map] ⚠️ SOS with no userId, skipping:', data);
          return;
        }
        console.log(`[Map] 🚨 SOS EMERGENCY triggered for user ${userId}`);
        
        const pInfo = participantsInfo.current.get(userId);
        if (pInfo) {
          data.name = pInfo.formattedName || pInfo.name;
          data.bibNumber = pInfo.bibNumber;
        }

        // Push to Incident Stream (Zustand Store)
        useParticipantStore.getState().addAnomaly({
          ...data,
          userId,
          type: 'SOS_EMERGENCY',
          severity: 'HIGH',
          message: 'Participant triggered manual SOS emergency.',
          timestamp: new Date().toISOString()
        });

        let marker = markers.current.get(userId);
        if (marker) {
          updateMarkerElement(marker.getElement(), data.name || `User ${userId.substring(0, 4)}`, "emergency", false, true);
        }

        setParticipants((prev) => {
          const next = new Map(prev);
          const current = next.get(userId);
          if (current) {
            next.set(userId, { ...current, isAnomaly: true, status: "emergency", lastUpdate: Date.now() });
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
        if (!userId || userId === 'undefined') return;
        const distance = data.distance ?? data.offRouteDistance ?? 0;
        console.log(`[Map] ⚠️ Off-route alert for user ${userId}:`, distance, 'm');

        const pInfo = participantsInfo.current.get(userId);
        const name = pInfo?.formattedName || pInfo?.name || `User ${userId.substring(0, 4)}`;

        useParticipantStore.getState().addAnomaly({
          ...data,
          userId,
          name,
          bibNumber: pInfo?.bibNumber,
          type: data.type || 'OFF_ROUTE',
          message: data.message || `Participant deviated ${Math.round(distance)} meters from the route.`,
          timestamp: data.timestamp || new Date().toISOString(),
        });

        // Mark participant as having alert in sidebar
        setParticipants((prev) => {
          const next = new Map(prev);
          const current = next.get(userId);
          if (current) {
            next.set(userId, { ...current, hasAlert: true, status: 'off-route', lastUpdate: Date.now() });
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
        if (!userId || userId === 'undefined') return;
        console.log(`[Map] 🛑 User stopped alert for user ${userId}:`, data.durationSec, 's');

        const pInfo = participantsInfo.current.get(userId);
        const name = pInfo?.formattedName || pInfo?.name || `User ${userId.substring(0, 4)}`;

        useParticipantStore.getState().addAnomaly({
          ...data,
          userId,
          name,
          bibNumber: pInfo?.bibNumber,
          type: data.type || 'STOP',
          message: data.message || `Participant stopped for ${data.durationSec || 0} seconds.`,
          timestamp: data.timestamp || new Date().toISOString(),
        });

        // Mark participant as having alert in sidebar
        setParticipants((prev) => {
          const next = new Map(prev);
          const current = next.get(userId);
          if (current) {
            next.set(userId, { ...current, hasAlert: true, status: 'stopped', lastUpdate: Date.now() });
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
        
        console.log(`[Map] 📦 Received offline sync batch for user ${userId}: ${data.points.length} points`);
        
        setParticipants((prev) => {
          const next = new Map(prev);
          const current = next.get(userId) || { id: userId, pathHistory: [] };
          
          const newCoords = data.points.map((p: any) => [parseFloat(p.lng ?? p.longitude), parseFloat(p.lat ?? p.latitude)]);
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
      if (!userId || userId === 'undefined') return;
      const marker = markers.current.get(userId);
      if (marker) updateMarkerElement(marker.getElement(), data.name || `User ${userId.substring(0, 4)}`, "active", false, false);
      setParticipants((prev) => {
        const next = new Map(prev);
        const current = next.get(userId);
        if (current) next.set(userId, { ...current, isAnomaly: false, hasAlert: false, status: "active", lastUpdate: Date.now() });
        return next;
      });
    });

    socket.on("participant_finished", (data: any) => {
      const userId = String(data.userId || data.participantId || data.id);
      if (!userId || userId === 'undefined') return;
      const marker = markers.current.get(userId);
      if (marker) updateMarkerElement(marker.getElement(), data.name || `User ${userId.substring(0, 4)}`, "FINISHED", false, false);
      setParticipants((prev) => {
        const next = new Map(prev);
        const current = next.get(userId);
        if (current) next.set(userId, { ...current, status: "finished", lastUpdate: Date.now() });
        return next;
      });
    });

    socket.on("EVENT_STATUS_CHANGED", (data: any) => {
      console.log(`[Map] 🚦 EVENT STATUS CHANGED:`, data.status);
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
        console.error('❌ addTestMarker: mapInstance.current is null!');
        return;
      }
      const center = mapInstance.current.getCenter();
      console.log('🧪 Adding test marker at map center:', center);
      const el = document.createElement('div');
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
      console.log('🧪 ✅ Test marker added! If you see a RED DOT, rendering works.');
    };
    console.log('🧪 Debug: window.addTestMarker() is ready. Call it in the console.');

    mqttClient.current = socket as any;
    return () => {
      console.log("Socket: Cleanup - Disconnecting...");
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

      let marker = markers.current.get(userId);
      const isStale = (Date.now() - data.lastUpdate) > 15000; // 15s Threshold

      if (!marker) {
        // PILLAR 5: Create marker ONCE, then only update position
        console.log(`[Marker] ➕ Creating new marker for userId=${userId} at [lng=${data.lng}, lat=${data.lat}]`);
        const el = createPulseMarker(
          data.name || `User ${String(userId).substring(0, 4)}`,
          data.status,
          isStale,
          data.isAnomaly
        );
        marker = new maplibregl.Marker({ element: el, anchor: 'center' })
          .setLngLat([data.lng, data.lat])
          .addTo(mapInstance.current!);
        markers.current.set(userId, marker);
      } else {
        // PILLAR 5: Efficient update — no new DOM elements
        console.log(`[Marker] 🔄 Updating existing marker for userId: ${userId} to [${data.lng}, ${data.lat}]`);
        marker.setLngLat([data.lng, data.lat]);
        const el = marker.getElement();
        const newEl = createPulseMarker(
          data.name || `User ${String(userId).substring(0, 4)}`,
          data.status,
          isStale,
          data.isAnomaly
        );
        el.innerHTML = newEl.innerHTML;
      }
    });

    // Stale cleanup — remove markers for participants gone >5min
    const currentTime = Date.now();
    markers.current.forEach((marker, userId) => {
      const p = participants.get(userId);
      if (!p || (currentTime - p.lastUpdate) > 300000) {
        console.log(`[Marker] 🧹 Removing stale marker for userId=${userId}`);
        marker.remove();
        markers.current.delete(userId);
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
            properties: { userId, color: data.color || '#10b981' },
            geometry: {
              type: "LineString",
              coordinates: data.pathHistory
            }
          });
        }
      });

      const geojsonData = {
        type: "FeatureCollection",
        features
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
            "visibility": showPolylines ? "visible" : "none"
          },
          paint: {
            "line-color": ["get", "color"], // Dynamic colored paths
            "line-width": 3,
            "line-opacity": 0.6,
            "line-dasharray": [2, 2] // Dashed line to differentiate from main route
          }
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
        showPolylines ? "visible" : "none"
      );
    }
  }, [showPolylines]);

  // ── Interaction ─────────────────────────────────────────────
  const goToParticipant = (userId: string) => {
    const p = participants.get(userId);
    if (p && mapInstance.current) {
      if (typeof p.lng !== 'number' || typeof p.lat !== 'number' || isNaN(p.lng) || isNaN(p.lat)) {
        console.warn('Cannot go to participant: Missing coordinates', p);
        return;
      }
      setSelectedUserId(userId);
      mapInstance.current.flyTo({
        center: [p.lng, p.lat],
        zoom: 17,
        pitch: 60,
        essential: true
      });
    }
  };

  if (loading) return (
    <div className="flex-1 flex flex-col items-center justify-center bg-slate-900 text-slate-400 gap-4">
      <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
      <p className="font-black uppercase tracking-[0.2em] text-xs">Initializing Telemetry Core...</p>
    </div>
  );

  if (error) return (
    <div className="flex-1 flex flex-col items-center justify-center bg-rose-950/20 text-rose-400 p-8 text-center">
      <ShieldAlert className="w-16 h-16 mb-4 opacity-50" />
      <h2 className="text-2xl font-black mb-2 uppercase tracking-tight">Stream Access Denied</h2>
      <p className="text-sm font-medium mb-8 max-w-xs">{error}</p>
      <Link href="/dashboard/events" className="px-6 py-3 bg-rose-500/20 border border-rose-500/30 rounded-xl font-bold uppercase text-xs tracking-widest hover:bg-rose-500/30 transition-all">
        Return to Directory
      </Link>
    </div>
  );

  const currentStatus = monitoringStatus ? STATUS_CONFIG[monitoringStatus as keyof typeof STATUS_CONFIG] : null;
  const StatusIcon = currentStatus?.icon || Activity;

  return (
    <div className="relative flex flex-1 h-full w-full overflow-hidden bg-[#0a0f1d] font-sans">

      {/* ── MAP INTERFACE (FULL SCREEN BASE) ── */}
      <div ref={mapContainer} className="absolute inset-0 w-full h-full z-0" />

      {/* Global HUD Header (Floating Top) */}
      <div className="absolute top-4 sm:top-6 left-4 sm:left-6 right-4 sm:right-6 z-40 flex flex-wrap sm:flex-nowrap items-center justify-between gap-4 pointer-events-none">
        {/* Left: Event Branding */}
        <div className="flex items-center gap-2 sm:gap-4 bg-slate-900/90 backdrop-blur-xl p-2 pr-4 sm:pr-6 rounded-3xl border border-white/10 shadow-2xl pointer-events-auto max-w-full overflow-hidden">
          <Link href={`/dashboard/events/${eventId}`} className="p-2 sm:p-3 bg-slate-800 hover:bg-slate-700 rounded-xl sm:rounded-2xl transition-colors shrink-0">
            <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
          </Link>
          <div className="flex flex-col min-w-0">
            <span className="text-[8px] sm:text-[9px] font-black text-indigo-400 uppercase tracking-widest leading-none mb-1">Telemetry Monitor</span>
            <h1 className="text-sm sm:text-lg font-black text-white uppercase tracking-tight truncate max-w-[120px] sm:max-w-[200px] leading-none">{event.name}</h1>
          </div>
          {/* Category Badge */}
          <div className={`hidden sm:flex px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest items-center gap-1 shrink-0 ${event.category === 'CYCLING' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
            }`}>
            {event.category === 'CYCLING' ? <Bike size={10} /> : <Footprints size={10} />}
            {event.category || 'RUNNING'}
          </div>
        </div>

        {/* Center: Status Indicator + Race Control */}
        <div className="hidden md:flex items-center gap-3 pointer-events-auto">
          {/* Status Indicator */}
          {currentStatus && (
            <div className={`flex items-center gap-3 px-5 py-3 rounded-2xl border backdrop-blur-md shadow-2xl ${currentStatus.bgColor}`}>
              <div className={`w-2.5 h-2.5 rounded-full ${currentStatus.dotColor} ${monitoringStatus === 'START' ? 'animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.8)]' : ''}`}></div>
              <div className="flex flex-col">
                <span className={`text-[10px] font-black uppercase tracking-widest ${currentStatus.color}`}>{currentStatus.label}</span>
                <span className="text-[8px] font-bold text-slate-500 uppercase tracking-tight">{currentStatus.description}</span>
              </div>
              {countdown && monitoringStatus === 'READY' && (
                <div className="ml-2 px-2 py-1 bg-slate-800 rounded-lg">
                  <span className="text-xs font-mono font-black text-white tracking-widest">{countdown}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* HUD Controls (Toggle Sidebars) */}
        <div className="flex items-center gap-2 pointer-events-auto ml-auto sm:ml-0">
          <button
            onClick={() => setShowLeaderboard(!showLeaderboard)}
            className={`p-3 rounded-2xl border transition-all ${showLeaderboard ? 'bg-indigo-600 text-white border-white/20' : 'bg-slate-900/90 text-slate-400 border-white/5 backdrop-blur-md'}`}
            title="Toggle Leaderboard"
          >
            <PanelLeft size={20} />
          </button>
          
          <button
            onClick={() => setShowPolylines(!showPolylines)}
            className={`p-3 rounded-2xl border transition-all ${showPolylines ? 'bg-emerald-600 text-white border-white/20' : 'bg-slate-900/90 text-slate-400 border-white/5 backdrop-blur-md'}`}
            title="Toggle Polylines"
          >
            <Navigation size={20} />
          </button>

          <div className="hidden md:flex items-center gap-4 bg-slate-900/90 backdrop-blur-md p-3 rounded-2xl border border-white/5 shadow-2xl px-6">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${monitoringStatus === 'START' ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.8)] animate-pulse' : 'bg-slate-600'}`}></div>
              <span className="text-[10px] font-black text-white uppercase tracking-widest">{monitoringStatus === 'START' ? 'Live Link' : (currentStatus?.label || 'Standby')}</span>
            </div>
            <div className="w-px h-4 bg-slate-800"></div>
            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{participants.size} Active Tracking(s)</div>
          </div>

          <button
            onClick={() => setShowAlerts(!showAlerts)}
            className={`p-3 rounded-2xl border transition-all ${showAlerts ? 'bg-rose-600 text-white border-white/20' : 'bg-slate-900/90 text-slate-400 border-white/5 backdrop-blur-md'}`}
            title="Toggle Alerts"
          >
            <PanelRight size={20} />
          </button>
        </div>
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

      {/* ── LEFT FLOATING PANEL: LEADERBOARD ── */}
      <aside className={`absolute left-2 sm:left-6 top-32 sm:top-24 bottom-20 sm:bottom-6 w-[calc(100%-16px)] sm:w-80 flex flex-col rounded-3xl border border-white/10 bg-slate-900/90 sm:bg-slate-900/70 backdrop-blur-2xl z-30 transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${showLeaderboard ? 'translate-x-0 opacity-100 shadow-2xl shadow-indigo-950/20' : '-translate-x-[calc(100%+24px)] opacity-0 pointer-events-none'}`}>
        <div className="p-5 border-b border-white/5 bg-white/5 flex items-center justify-between rounded-t-3xl">
          <div className="flex flex-col">
            <div className="flex items-center gap-3 mb-1">
              <Trophy className="w-4 h-4 text-amber-500" />
              <h2 className="text-sm font-black uppercase tracking-widest text-slate-100">Live Ranking</h2>
            </div>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">Sorted by performance</p>
          </div>
          <button onClick={() => setShowLeaderboard(false)} className="p-1.5 hover:bg-white/10 rounded-lg text-slate-400 transition-colors">
            <X size={14} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar">
          {sortedParticipants.map((p, idx) => (
            <div
              key={p.id}
              onClick={() => goToParticipant(p.id)}
              className={`p-3 rounded-2xl border transition-all cursor-pointer group relative overflow-hidden
                ${selectedUserId === p.id
                  ? 'bg-indigo-600/40 border-indigo-400/50 shadow-lg'
                  : 'bg-white/5 border-white/5 hover:bg-white/10'
                }
                ${p.hasAlert ? 'border-rose-500/50 bg-rose-500/10' : ''}
              `}
            >
              <div className="flex items-center justify-between relative z-10">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-[10px] font-black
                    ${idx === 0 ? 'bg-amber-500 text-amber-950' :
                      idx === 1 ? 'bg-slate-300 text-slate-900' :
                        idx === 2 ? 'bg-orange-400 text-orange-950' : 'bg-slate-800 text-white'}
                  `}>
                    {idx + 1}
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[13px] font-black text-white uppercase tracking-tight truncate w-32">
                      {p.name || `User ${String(p.id).substring(0, 4)}`}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className={`text-[9px] font-bold flex items-center gap-1 uppercase tracking-widest ${(p.isOffline || p.status === 'inactive') ? 'text-slate-500' : 'text-slate-400'}`}>
                        <Signal className={`w-2.5 h-2.5 ${(p.isOffline || p.status === 'inactive') ? 'text-slate-500' : 'text-emerald-500'}`} /> 
                        {(p.isOffline || p.status === 'inactive') ? 'Offline' : 'Connected'}
                      </span>
                      {p.hasAlert && <span className="text-[9px] font-black text-rose-400 animate-pulse uppercase">Incident!</span>}
                    </div>
                  </div>
                </div>

                <div className="text-right flex flex-col items-end">
                  <div className="text-[13px] font-black text-white">{(p.speed || 0).toFixed(1)} <span className="text-[8px] font-bold text-slate-400 uppercase">KM/H</span></div>
                  <div className="flex items-center justify-end gap-1 mt-0.5">
                    <Zap className={`w-2.5 h-2.5 ${p.battery < 20 ? 'text-rose-500 animate-pulse' : 'text-emerald-500'}`} />
                    <span className="text-[10px] font-bold text-slate-400">{(p.battery || 0)}%</span>
                  </div>
                  <div className="mt-1">
                    <button 
                      type="button"
                      className="px-2 py-0.5 bg-white/10 hover:bg-white/20 rounded text-[9px] font-bold text-white uppercase transition-colors" 
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
                            email: pInfo?.email
                          }
                        });
                      }}
                    >
                      Detail
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}

          {sortedParticipants.length === 0 && (
            <div className="flex flex-col items-center justify-center p-12 text-center opacity-50">
              <Radio className="w-12 h-12 text-slate-600 mb-4 animate-pulse" />
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Listening for Telemetry...</p>
            </div>
          )}
        </div>
      </aside>

      {/* ── RIGHT FLOATING PANEL: ALERTS ── */}
      <aside className={`absolute right-2 sm:right-6 top-32 sm:top-24 bottom-20 sm:bottom-6 w-[calc(100%-16px)] sm:w-80 flex flex-col rounded-3xl border border-white/10 bg-slate-900/90 sm:bg-slate-900/70 backdrop-blur-2xl z-30 transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${showAlerts ? 'translate-x-0 opacity-100 shadow-2xl shadow-rose-950/20' : 'translate-x-[calc(100%+24px)] opacity-0 pointer-events-none'}`}>
        <div className="p-5 border-b border-white/5 bg-white/5 flex items-center justify-between rounded-t-3xl">
          <div className="flex flex-col">
            <div className="flex items-center gap-3 mb-1">
              <AlertTriangle className="w-4 h-4 text-rose-500" />
              <h2 className="text-sm font-black uppercase tracking-widest text-slate-100">Incident Stream</h2>
            </div>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">Active Anomalies</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="px-2 py-0.5 bg-rose-500/20 border border-rose-500/30 rounded-md text-rose-500 text-[10px] font-black">{anomalies.length}</div>
            <button onClick={() => setShowAlerts(false)} className="p-1.5 hover:bg-white/10 rounded-lg text-slate-400 transition-colors">
              <X size={14} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
          {anomalies.map((alert) => {
            const alertAny = alert as any;
            // CRITICAL: Use userId (users.id), not participantId (event_participants.id)
            const userIdStr = String(alertAny.userId || "");
            // Resolve name: first from participantsInfo (most reliable), then from alert payload, then from participants Map
            const pInfo = participantsInfo.current.get(userIdStr);
            const participantData = participants.get(userIdStr);
            const pName = pInfo?.formattedName || alertAny.name || participantData?.name || `User ${userIdStr.substring(0, 4)}`;

            // Determine color based on alert type
            let colorAccent = "bg-rose-500";
            let textColorAccent = "text-rose-400";
            
            if (alert.type === "STOP") {
              colorAccent = "bg-amber-500";
              textColorAccent = "text-amber-400";
            } else if (alert.type === "OFF_ROUTE") {
              colorAccent = "bg-orange-500";
              textColorAccent = "text-orange-400";
            } else if (alert.type === "SOS_EMERGENCY") {
              colorAccent = "bg-rose-600";
              textColorAccent = "text-rose-500";
            }

            return (
            <div
              key={alert.id}
              onClick={() => goToParticipant(userIdStr)}
              className="relative overflow-hidden p-4 rounded-2xl bg-white/5 border border-white/5 shadow-sm hover:bg-white/10 transition-all cursor-pointer group animate-in slide-in-from-right-10 duration-300"
            >
              <div className={`absolute top-0 left-0 w-1 h-full ${colorAccent}`}></div>
              <div className="flex justify-between items-start mb-2">
                <span className={`text-[10px] font-black uppercase tracking-widest ${textColorAccent}`}>{alert.type?.replace("_", " ") || "WARN"}</span>
                <span className="text-[9px] font-mono text-slate-500 bg-black/40 px-1.5 py-0.5 rounded">{new Date(alert.timestamp || Date.now()).toLocaleTimeString()}</span>
              </div>
              <p className="text-[13px] font-bold text-slate-200 leading-snug mb-3">
                {alertAny.message || alert.message || "Unusual telemetry patterns detected."}
              </p>
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-[12px] font-black text-white uppercase tracking-tight">{pName}</span>
                </div>
                <div className="flex items-center gap-2 mt-2">
                  {(alert.type === "SOS_EMERGENCY" || participantData?.participantState === 'FROZEN') ? (
                    <button
                      onClick={(e) => { e.stopPropagation(); handleUpdateParticipantState(userIdStr, 'TRACKING', alert.id); }}
                      className="px-2 py-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 rounded text-[9px] font-black uppercase transition-all"
                    >
                      🔓 Unfreeze
                    </button>
                  ) : (
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDismissAnomaly(userIdStr, alert.id); }}
                      className="px-2 py-1 bg-white/5 hover:bg-white/10 text-slate-400 border border-white/10 rounded text-[9px] font-black uppercase transition-all"
                    >
                      Dismiss ✕
                    </button>
                  )}
                  <button
                    onClick={(e) => { e.stopPropagation(); goToParticipant(userIdStr); }}
                    className="ml-auto text-[10px] font-black text-indigo-400 uppercase hover:text-indigo-300 transition-colors"
                  >
                    Inspect ➔
                  </button>
                </div>
              </div>
            </div>
            );
          })}

          {anomalies.length === 0 && (
            <div className="flex flex-col items-center justify-center p-12 text-center opacity-30">
              <ShieldAlert className="w-12 h-12 text-emerald-500 mb-4" />
              <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest">Normal Ops</p>
              <p className="text-[9px] text-slate-600 font-bold uppercase mt-1">No alerts found</p>
            </div>
          )}
        </div>
      </aside>

      {/* Alert Flash Overlay */}
      <div className={`absolute inset-0 pointer-events-none transition-all duration-300 z-40 ${isFlashing ? 'bg-rose-500/10 opacity-100 shadow-[inset_0_0_150px_rgba(244,63,94,0.3)] border-[20px] border-rose-500/10' : 'bg-transparent opacity-0'}`}></div>

      {/* HUD Scanlines Look */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.04] bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_2px,3px_100%] z-50"></div>

      {/* Participant Detail Modal */}
      {participantDetailModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col">
            <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-800/50">
              <h2 className="text-lg font-black text-white tracking-widest uppercase">Participant Detail</h2>
              <button onClick={() => setParticipantDetailModal(null)} className="p-2 hover:bg-white/10 rounded-full transition-colors text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 flex flex-col gap-4">
              <div className="flex items-center gap-4 border-b border-slate-800 pb-4">
                <div className="w-16 h-16 rounded-2xl bg-indigo-500/20 flex items-center justify-center text-indigo-400 font-black text-2xl uppercase border border-indigo-500/30">
                  {participantDetailModal.name ? participantDetailModal.name.substring(0, 2) : "U"}
                </div>
                <div>
                  <h3 className="text-xl font-black text-white">{participantDetailModal.name || `User ${String(participantDetailModal.id).substring(0, 4)}`}</h3>
                  <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">BIB: #{participantDetailModal.bibNumber || '-'}</p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-800/50 p-4 rounded-2xl border border-slate-700/50">
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Blood Type</p>
                  <p className="text-lg font-black text-rose-400">{participantDetailModal.user?.healthInfo?.bloodType || 'N/A'}</p>
                </div>
                <div className="bg-slate-800/50 p-4 rounded-2xl border border-slate-700/50">
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Phone</p>
                  <p className="text-sm font-bold text-slate-300">{participantDetailModal.user?.phone || 'N/A'}</p>
                </div>
              </div>
              
              <div className="bg-slate-800/50 p-4 rounded-2xl border border-slate-700/50">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Medical Conditions</p>
                <p className="text-sm font-medium text-slate-300">{participantDetailModal.user?.healthInfo?.medicalConditions?.join(', ') || 'None reported'}</p>
              </div>

              <div className="bg-slate-800/50 p-4 rounded-2xl border border-slate-700/50">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Emergency Contact</p>
                <p className="text-sm font-bold text-slate-300">{participantDetailModal.user?.healthInfo?.emergencyContactName || 'N/A'} - {participantDetailModal.user?.healthInfo?.emergencyContactPhone || 'N/A'}</p>
              </div>
            </div>
            <div className="p-4 border-t border-slate-800 bg-slate-900 flex justify-end">
               <button onClick={() => setParticipantDetailModal(null)} className="px-6 py-2.5 bg-white/5 hover:bg-white/10 rounded-xl text-xs font-bold text-white uppercase tracking-widest transition-colors">Close</button>
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
          background: rgba(255, 255, 255, 0.1);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.2);
        }
        /* PILLAR 3: Keyframe for pulse animation in marker (replaces Tailwind animate-ping) */
        @keyframes ping {
          75%, 100% {
            transform: scale(2);
            opacity: 0;
          }
        }
        /* Marker Hover Visibility Logic */
        .maplibregl-marker {
          z-index: 9999;
        }
        .maplibregl-marker:hover {
          z-index: 10000 !important;
        }
        .marker-label {
          opacity: 0;
          transform: translateX(-50%) scale(0.8) translateY(10px) !important;
          pointer-events: none;
        }
        .dashly-marker:hover .marker-label {
          opacity: 1;
          transform: translateX(-50%) scale(1) translateY(0) !important;
        }
      `}</style>
    </div>
  );
}

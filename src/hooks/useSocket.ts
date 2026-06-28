"use client";

import { useEffect, useState } from "react";
import { io, Socket } from "socket.io-client";
import { useParticipantStore } from "@/store/useParticipantStore";

export function useSocket(eventId: string) {
  const [isConnected, setIsConnected] = useState(false);
  const [socket, setSocket] = useState<Socket | null>(null);

  // FIX: Use store.getState() inside handlers instead of selector subscriptions
  // to prevent useEffect dependency changes on every render (reconnect loop).
  const setSocketConnected = useParticipantStore((state) => state.setSocketConnected);

  useEffect(() => {
    if (!eventId) return;

    // Get JWT Token from cookies
    let token = "";
    if (typeof window !== "undefined") {
      const match = document.cookie.match(new RegExp('(^| )auth_token=([^;]+)'));
      if (match) token = match[2];
    }

    const defaultBackendUrl = typeof window !== 'undefined'
      ? `http://${window.location.hostname}:3001`
      : "http://localhost:3001";
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || defaultBackendUrl;

    const socketInstance = io(backendUrl, {
      auth: {
        token,
      },
    });

    setSocket(socketInstance);

    socketInstance.on("connect", () => {
      console.log(`[Socket] Connected: ${socketInstance.id}`);
      setIsConnected(true);
      setSocketConnected(true);

      // Join the specific event's room
      socketInstance.emit("joinEventRoom", { eventId: Number(eventId) });
    });

    socketInstance.on("disconnect", (reason) => {
      console.log(`[Socket] Disconnected: ${reason}`);
      setIsConnected(false);
      setSocketConnected(false);
    });

    socketInstance.on("connect_error", (error) => {
      console.error("[Socket] Connection error:", error);
      setIsConnected(false);
      setSocketConnected(false);
    });

    // Handle throttled batch position updates (emitted every 2 seconds)
    socketInstance.on("position_batch", (data) => {
      if (data && data.positions && Array.isArray(data.positions)) {
        const { updateParticipant } = useParticipantStore.getState();
        for (const pos of data.positions) {
          const pId = pos.userId || pos.participantId || pos.id;
          if (pId) {
            updateParticipant(String(pId), {
              lat: parseFloat(pos.lat),
              lng: parseFloat(pos.lng),
              speed: parseFloat(pos.speed) || 0,
              battery: parseInt(pos.battery) || 100,
              status: pos.isOffline ? "inactive" : "active",
            });
          }
        }
      }
    });

    // Keep legacy single-point handler for backward compatibility
    socketInstance.on("position_update", (data) => {
      const pId = data.userId || data.participantId || data.id;
      if (pId) {
        const { updateParticipant } = useParticipantStore.getState();
        updateParticipant(String(pId), {
          lat: parseFloat(data.lat),
          lng: parseFloat(data.lng),
          speed: parseFloat(data.speed) || 0,
          battery: parseInt(data.battery) || 100,
          status: "active",
        });
      }
    });

    socketInstance.on("anomaly_detected", (data) => {
      const pId = data.userId || data.participantId;
      if (data && pId && data.type) {
        const { addAnomaly } = useParticipantStore.getState();
        addAnomaly({ ...data, userId: String(pId) });
      }
    });

    socketInstance.on("off_route_alert", (data) => {
      const pId = data.userId || data.participantId;
      if (data && pId) {
        const { addAnomaly } = useParticipantStore.getState();
        addAnomaly({
          id: `off-route-${Date.now()}`,
          userId: String(pId),
          type: "OFF_ROUTE",
          message: `Participant went off route by ${Math.round(data.distance || 0)} meters.`,
          timestamp: data.timestamp || new Date().toISOString(),
          severity: "MEDIUM"
        });
      }
    });

    socketInstance.on("sos_triggered", (data) => {
      console.error(`\n\n🚨🚨🚨 [EMERGENCY] SOS RECEIVED ON DASHBOARD 🚨🚨🚨\nDATA:`, data, `\n\n`);
      const pId = data.userId || data.participantId || data.id;
      if (pId) {
        const { addAnomaly, updateParticipant } = useParticipantStore.getState();
        // Add to incident stream
        addAnomaly({
          id: `sos-${Date.now()}`,
          userId: String(pId),
          type: "SOS_EMERGENCY",
          message: "Participant triggered manual SOS from mobile app.",
          timestamp: data.timestamp || new Date().toISOString(),
          severity: "HIGH"
        });
        // Update user status and location
        updateParticipant(String(pId), {
          status: "emergency",
          lat: parseFloat(data.lat),
          lng: parseFloat(data.lng),
        });
      }
    });

    socketInstance.on("sync_batch", (data) => {
      if (data && data.userId && data.points) {
        const { addSyncBatch } = useParticipantStore.getState();
        addSyncBatch(data.userId, data.points);
      }
    });

    // Cleanup on unmount
    return () => {
      socketInstance.disconnect();
    };
  }, [eventId]); // FIX: Only eventId — no store functions that cause reconnect

  return { isConnected, socket };
}

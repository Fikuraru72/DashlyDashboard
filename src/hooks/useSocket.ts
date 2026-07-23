"use client";

import { useEffect, useState } from "react";
import { io, Socket } from "socket.io-client";
import { useParticipantStore } from "@/store/useParticipantStore";
import { AUTH_TOKENS_CHANGED_EVENT, getAccessToken, refreshAccessToken } from "@/lib/api";

export function useSocket(eventId: string) {
  const [isConnected, setIsConnected] = useState(false);
  const [socket, setSocket] = useState<Socket | null>(null);

  // FIX: Use store.getState() inside handlers instead of selector subscriptions
  // to prevent useEffect dependency changes on every render (reconnect loop).
  const setSocketConnected = useParticipantStore((state) => state.setSocketConnected);

  useEffect(() => {
    if (!eventId) return;

    const backendUrl =
      process.env.NEXT_PUBLIC_API_URL ||
      (typeof window !== "undefined"
        ? `http://${window.location.hostname}:3001`
        : "http://localhost:3001");

    const socketInstance = io(backendUrl, {
      autoConnect: false,
      transports: ["polling", "websocket"],
      withCredentials: true,
    });
    let cancelled = false;
    let refreshing = false;

    setSocket(socketInstance);

    void refreshAccessToken().then((token) => {
      if (cancelled || !token) return;
      socketInstance.auth = { token };
      socketInstance.connect();
    });

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

    socketInstance.on("auth_error", async () => {
      if (refreshing) return;
      refreshing = true;
      const token = await refreshAccessToken();
      refreshing = false;
      if (cancelled || !token) return;
      socketInstance.auth = { token };
      socketInstance.connect();
    });

    const reconnectWithCurrentToken = () => {
      socketInstance.auth = { token: getAccessToken() };
      if (socketInstance.connected) socketInstance.disconnect().connect();
    };
    window.addEventListener(AUTH_TOKENS_CHANGED_EVENT, reconnectWithCurrentToken);

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
              battery:
                pos.battery != null && !isNaN(parseInt(pos.battery))
                  ? parseInt(pos.battery)
                  : undefined,
              altitude:
                pos.altitude != null && !isNaN(parseFloat(pos.altitude))
                  ? parseFloat(pos.altitude)
                  : undefined,
              minAltitude:
                pos.minAltitude != null && !isNaN(parseFloat(pos.minAltitude))
                  ? parseFloat(pos.minAltitude)
                  : undefined,
              maxAltitude:
                pos.maxAltitude != null && !isNaN(parseFloat(pos.maxAltitude))
                  ? parseFloat(pos.maxAltitude)
                  : undefined,
              elevationGain:
                pos.elevationGain != null && !isNaN(parseFloat(pos.elevationGain))
                  ? parseFloat(pos.elevationGain)
                  : undefined,
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
          battery:
            data.battery != null && !isNaN(parseInt(data.battery))
              ? parseInt(data.battery)
              : undefined,
          altitude:
            data.altitude != null && !isNaN(parseFloat(data.altitude))
              ? parseFloat(data.altitude)
              : undefined,
          minAltitude:
            data.minAltitude != null && !isNaN(parseFloat(data.minAltitude))
              ? parseFloat(data.minAltitude)
              : undefined,
          maxAltitude:
            data.maxAltitude != null && !isNaN(parseFloat(data.maxAltitude))
              ? parseFloat(data.maxAltitude)
              : undefined,
          elevationGain:
            data.elevationGain != null && !isNaN(parseFloat(data.elevationGain))
              ? parseFloat(data.elevationGain)
              : undefined,
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
        const { addAnomaly, updateParticipant } = useParticipantStore.getState();
        const distance = data.distance ?? data.offRouteDistance ?? 0;
        addAnomaly({
          id: `off-route-${Date.now()}`,
          userId: String(pId),
          type: "OFF_ROUTE",
          message: `Participant went off route by ${Math.round(distance)} meters.`,
          timestamp: data.timestamp || new Date().toISOString(),
          severity: "MEDIUM",
        });
        updateParticipant(String(pId), { status: "off-route" });
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
          severity: "HIGH",
        });
        // Update user status and location
        updateParticipant(String(pId), {
          status: "emergency",
          lat: parseFloat(data.lat),
          lng: parseFloat(data.lng),
        });
      }
    });

    socketInstance.on("sos_recovered", (data) => {
      const pId = data.userId || data.participantId || data.id;
      if (pId) {
        const { updateParticipant } = useParticipantStore.getState();
        updateParticipant(String(pId), { status: "active", isAnomaly: false });
      }
    });

    socketInstance.on("user_stopped", (data) => {
      const pId = data.userId || data.participantId || data.id;
      if (pId) {
        const { addAnomaly, updateParticipant } = useParticipantStore.getState();
        addAnomaly({
          id: `stopped-${Date.now()}`,
          userId: String(pId),
          type: "STOP",
          message: data.message || `Participant stopped for ${data.durationSec || 0} seconds.`,
          timestamp: data.timestamp || new Date().toISOString(),
          severity: "MEDIUM",
        });
        updateParticipant(String(pId), { status: "stuck" });
      }
    });

    socketInstance.on("participant_finished", (data) => {
      const pId = data.userId || data.participantId || data.id;
      if (pId) {
        const { updateParticipant } = useParticipantStore.getState();
        updateParticipant(String(pId), { status: "inactive" });
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
      cancelled = true;
      window.removeEventListener(AUTH_TOKENS_CHANGED_EVENT, reconnectWithCurrentToken);
      socketInstance.disconnect();
    };
  }, [eventId]); // FIX: Only eventId — no store functions that cause reconnect

  return { isConnected, socket };
}

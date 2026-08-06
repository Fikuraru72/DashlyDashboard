"use client";

import { useRef, useEffect, useCallback } from "react";
import maplibregl from "maplibre-gl";

// ── Configuration ────────────────────────────────────────────────
const BUFFER_DELAY_MS = 1800; // 1.8 second playback buffer for smooth interpolation
const MAX_QUEUE_SIZE = 30;    // Max waypoints per participant before garbage collection
const MAX_EXTRAP_MS = 2500;   // Max dead reckoning extrapolation duration (2.5s)

// ── Types ────────────────────────────────────────────────────────
export interface TelemetryWaypoint {
  lng: number;
  lat: number;
  time: number;       // Arrival timestamp (ms) — used for virtual playback
  speed?: number;
  // Synchronized event state — delivered to callback when this waypoint is consumed
  status?: string;
  isAnomaly?: boolean;
  isStale?: boolean;
  color?: string;
  displayName?: string;
}

/**
 * Callback fired when the animation engine consumes a waypoint.
 * This allows the caller to synchronize UI updates (marker element style,
 * anomaly alerts, leaderboard status) with the exact moment the marker
 * visually arrives at that coordinate.
 */
export type OnWaypointConsumed = (
  userId: string,
  waypoint: TelemetryWaypoint,
) => void;

interface ParticipantPlaybackState {
  queue: TelemetryWaypoint[];
  displayLng: number;
  displayLat: number;
  // Velocity vectors for dead reckoning (degrees per millisecond)
  vLng: number;
  vLat: number;
  extrapolatedMs: number;
  // The last consumed waypoint (for event state reference)
  lastConsumed: TelemetryWaypoint | null;
  // Virtual clock offset: when the first waypoint was pushed
  clockOriginReal: number;     // Real wall-clock time of first push
  clockOriginVirtual: number;  // The timestamp of the first waypoint
  clockInitialized: boolean;
}

/**
 * useMapMarkerAnimation — Unified Telemetry & Event Sync Engine
 *
 * 60 FPS continuous motion engine with:
 * - FIFO timestamped waypoint queue per participant
 * - Virtual playback clock (t_render = t_now - BUFFER_DELAY_MS)
 * - Time-based linear interpolation between waypoints (constant velocity)
 * - Dead reckoning momentum extrapolation on buffer underflow
 * - Synchronized event callback when waypoints are consumed
 */
export function useMapMarkerAnimation(
  markersRef: React.MutableRefObject<Map<string, maplibregl.Marker>>,
  onWaypointConsumed?: OnWaypointConsumed,
) {
  const stateMapRef = useRef<Map<string, ParticipantPlaybackState>>(new Map());
  const rAfIdRef = useRef<number | null>(null);
  const isRunningRef = useRef(false);
  const onWaypointConsumedRef = useRef(onWaypointConsumed);

  // Keep callback ref fresh without triggering re-renders
  useEffect(() => {
    onWaypointConsumedRef.current = onWaypointConsumed;
  }, [onWaypointConsumed]);

  /**
   * Push a new GPS telemetry waypoint into a participant's buffer queue.
   * Include full telemetry state (status, isAnomaly, color, displayName) so
   * the animation engine can deliver synchronized event callbacks.
   */
  const pushWaypoint = useCallback(
    (
      userId: string,
      lng: number,
      lat: number,
      speed?: number,
      timestamp?: number,
      eventState?: {
        status?: string;
        isAnomaly?: boolean;
        isStale?: boolean;
        color?: string;
        displayName?: string;
      },
    ) => {
      if (isNaN(lng) || isNaN(lat)) return;

      const arrivalTime = timestamp || Date.now();
      const stateMap = stateMapRef.current;
      let state = stateMap.get(userId);

      const waypoint: TelemetryWaypoint = {
        lng,
        lat,
        time: arrivalTime,
        speed,
        ...eventState,
      };

      if (!state) {
        // First waypoint — initialize playback state, snap to position
        state = {
          queue: [waypoint],
          displayLng: lng,
          displayLat: lat,
          vLng: 0,
          vLat: 0,
          extrapolatedMs: 0,
          lastConsumed: null,
          clockOriginReal: Date.now(),
          clockOriginVirtual: arrivalTime,
          clockInitialized: true,
        };
        stateMap.set(userId, state);
      } else {
        // Skip exact duplicate coordinates at tail of queue
        const tail = state.queue[state.queue.length - 1];
        if (
          tail &&
          Math.abs(tail.lng - lng) < 0.0000005 &&
          Math.abs(tail.lat - lat) < 0.0000005
        ) {
          // Update event state on existing tail waypoint (status/anomaly may have changed)
          if (eventState) {
            Object.assign(tail, eventState);
          }
          return;
        }

        state.queue.push(waypoint);
        state.extrapolatedMs = 0; // Reset extrapolation timer

        // Garbage collect if queue grows too large
        if (state.queue.length > MAX_QUEUE_SIZE) {
          // Keep at least last 10 waypoints
          state.queue = state.queue.slice(-10);
        }
      }

      // Start the animation loop if not already running
      if (!isRunningRef.current) {
        isRunningRef.current = true;
        rAfIdRef.current = requestAnimationFrame(animate);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  /**
   * Backward compatibility alias
   */
  const updateTarget = useCallback(
    (userId: string, lng: number, lat: number, speed?: number, timestamp?: number) => {
      pushWaypoint(userId, lng, lat, speed, timestamp);
    },
    [pushWaypoint],
  );

  /**
   * Remove participant from animation loop
   */
  const removeTarget = useCallback((userId: string) => {
    stateMapRef.current.delete(userId);
  }, []);

  /**
   * Main 60 FPS animation loop — Time-Based Linear Interpolation Engine
   */
  const animate = useCallback(() => {
    const now = performance.now();
    const stateMap = stateMapRef.current;
    const markers = markersRef.current;
    let anyActive = false;

    for (const [userId, state] of stateMap.entries()) {
      const marker = markers.get(userId);
      if (!marker) continue;

      const queue = state.queue;

      // ── Phase 1: Determine virtual playback time ──────────────
      // Virtual playback time runs BUFFER_DELAY_MS behind real time
      // This creates a smooth buffer window for interpolation
      const realElapsed = now - (state.clockOriginReal * 1 || now);
      const tRender = state.clockOriginVirtual + realElapsed - BUFFER_DELAY_MS;

      // ── Phase 2: Find interpolation segment in queue ──────────
      // Find two adjacent waypoints W_A and W_B where W_A.time <= tRender <= W_B.time
      let segmentFound = false;

      // Consume past waypoints (where tRender has already passed)
      while (queue.length > 1 && queue[1].time <= tRender) {
        const consumed = queue.shift()!;
        state.lastConsumed = consumed;

        // Fire synchronized event callback
        if (onWaypointConsumedRef.current) {
          onWaypointConsumedRef.current(userId, consumed);
        }
      }

      if (queue.length >= 2) {
        // Interpolate between queue[0] (W_A) and queue[1] (W_B)
        const wA = queue[0];
        const wB = queue[1];
        const segDuration = wB.time - wA.time;

        if (segDuration > 0) {
          const alpha = Math.max(0, Math.min(1, (tRender - wA.time) / segDuration));

          const prevLng = state.displayLng;
          const prevLat = state.displayLat;

          state.displayLng = wA.lng + alpha * (wB.lng - wA.lng);
          state.displayLat = wA.lat + alpha * (wB.lat - wA.lat);
          segmentFound = true;
          anyActive = true;

          // Track velocity for dead reckoning
          const dtMs = 16.67; // Approximate frame time
          if (dtMs > 0) {
            const newVLng = (state.displayLng - prevLng) / dtMs;
            const newVLat = (state.displayLat - prevLat) / dtMs;
            state.vLng = state.vLng * 0.6 + newVLng * 0.4;
            state.vLat = state.vLat * 0.6 + newVLat * 0.4;
          }
        }
      }

      if (!segmentFound && queue.length === 1) {
        // Only one waypoint in queue — lerp towards it smoothly
        const target = queue[0];
        const dLng = target.lng - state.displayLng;
        const dLat = target.lat - state.displayLat;
        const distSq = dLng * dLng + dLat * dLat;

        if (distSq > 0.0000000001) {
          const step = 0.06; // Gentle approach
          const prevLng = state.displayLng;
          const prevLat = state.displayLat;

          state.displayLng += dLng * step;
          state.displayLat += dLat * step;
          anyActive = true;

          const dtMs = 16.67;
          state.vLng = state.vLng * 0.6 + ((state.displayLng - prevLng) / dtMs) * 0.4;
          state.vLat = state.vLat * 0.6 + ((state.displayLat - prevLat) / dtMs) * 0.4;
        }
      }

      if (!segmentFound && queue.length <= 1) {
        // ── Phase 3: Dead Reckoning Extrapolation ───────────────
        // Buffer underflow — no future waypoints available yet.
        // Continue moving along last velocity vector with ease-out dampening.
        if (
          state.extrapolatedMs < MAX_EXTRAP_MS &&
          (Math.abs(state.vLng) > 1e-10 || Math.abs(state.vLat) > 1e-10)
        ) {
          const dt = 16.67;
          state.extrapolatedMs += dt;
          const dampening = Math.max(0, 1 - state.extrapolatedMs / MAX_EXTRAP_MS);
          const dampenedSq = dampening * dampening; // Quadratic ease-out for natural deceleration

          state.displayLng += state.vLng * dt * dampenedSq;
          state.displayLat += state.vLat * dt * dampenedSq;
          anyActive = true;
        }
      }

      // ── Phase 4: Update MapLibre marker position (zero React re-renders) ──
      marker.setLngLat([state.displayLng, state.displayLat]);
    }

    if (anyActive || stateMap.size > 0) {
      // Keep loop alive as long as there are participants being tracked
      rAfIdRef.current = requestAnimationFrame(animate);
    } else {
      isRunningRef.current = false;
    }
  }, [markersRef]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (rAfIdRef.current) {
        cancelAnimationFrame(rAfIdRef.current);
        rAfIdRef.current = null;
      }
      isRunningRef.current = false;
    };
  }, []);

  return { updateTarget, pushWaypoint, removeTarget };
}

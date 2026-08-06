"use client";

import { useRef, useEffect, useCallback } from "react";
import maplibregl from "maplibre-gl";

// ── Configuration ────────────────────────────────────────────────
const BUFFER_DELAY_MS = 6000; // 6.0 second playback buffer for smooth 60fps interpolation
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
 * Synchronizes UI updates (marker style, anomaly badges) with exact marker arrival.
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
  // The last consumed waypoint
  lastConsumed: TelemetryWaypoint | null;
}

/**
 * useMapMarkerAnimation — Continuous Motion & Event Sync Engine
 *
 * 60 FPS continuous motion engine with:
 * - FIFO timestamped waypoint queue per participant
 * - Virtual playback clock (t_render = Date.now() - BUFFER_DELAY_MS)
 * - Time-based linear interpolation between waypoints
 * - Smooth dead reckoning extrapolation on network lag
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

      const now = Date.now();
      const stateMap = stateMapRef.current;
      let state = stateMap.get(userId);

      if (!state) {
        // Initial load: Set waypoint time relative to buffer so marker renders immediately
        const initialWaypoint: TelemetryWaypoint = {
          lng,
          lat,
          time: now - BUFFER_DELAY_MS,
          speed,
          ...eventState,
        };

        state = {
          queue: [initialWaypoint],
          displayLng: lng,
          displayLat: lat,
          vLng: 0,
          vLat: 0,
          extrapolatedMs: 0,
          lastConsumed: initialWaypoint,
        };
        stateMap.set(userId, state);
      } else {
        const tail = state.queue[state.queue.length - 1];

        // Skip duplicate coordinate noise
        if (
          tail &&
          Math.abs(tail.lng - lng) < 0.0000005 &&
          Math.abs(tail.lat - lat) < 0.0000005
        ) {
          if (eventState) {
            Object.assign(tail, eventState);
          }
          return;
        }

        const newWaypoint: TelemetryWaypoint = {
          lng,
          lat,
          time: now, // Real arrival time on client
          speed,
          ...eventState,
        };

        state.queue.push(newWaypoint);
        state.extrapolatedMs = 0; // Reset extrapolation timer

        // Garbage collection if queue grows too large
        if (state.queue.length > MAX_QUEUE_SIZE) {
          state.queue = state.queue.slice(-10);
        }
      }

      // Start loop if idle
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
   * Main 60 FPS animation loop — Time-Based Linear Interpolation
   */
  const animate = useCallback(() => {
    const now = Date.now();
    const tRender = now - BUFFER_DELAY_MS;
    const stateMap = stateMapRef.current;
    const markers = markersRef.current;
    let anyActive = false;

    for (const [userId, state] of stateMap.entries()) {
      const marker = markers.get(userId);
      if (!marker) continue;

      const queue = state.queue;

      // ── Phase 1: Consume past waypoints ──────────────────────
      while (queue.length > 1 && queue[1].time <= tRender) {
        const consumed = queue.shift()!;
        state.lastConsumed = consumed;

        if (onWaypointConsumedRef.current) {
          onWaypointConsumedRef.current(userId, consumed);
        }
      }

      let segmentFound = false;

      // ── Phase 2: Interpolate between queue[0] and queue[1] ────
      if (queue.length >= 2) {
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

          // Track velocity for dead reckoning (degrees per ms)
          const dtMs = 16.67;
          const newVLng = (state.displayLng - prevLng) / dtMs;
          const newVLat = (state.displayLat - prevLat) / dtMs;
          state.vLng = state.vLng * 0.7 + newVLng * 0.3;
          state.vLat = state.vLat * 0.7 + newVLat * 0.3;
        }
      }

      // ── Phase 3: Single item in queue (Lerp towards target) ───
      if (!segmentFound && queue.length === 1) {
        const target = queue[0];
        const dLng = target.lng - state.displayLng;
        const dLat = target.lat - state.displayLat;
        const distSq = dLng * dLng + dLat * dLat;

        if (distSq > 0.0000000001) {
          const step = 0.1; // Smooth catch-up step
          const prevLng = state.displayLng;
          const prevLat = state.displayLat;

          state.displayLng += dLng * step;
          state.displayLat += dLat * step;
          anyActive = true;

          const dtMs = 16.67;
          state.vLng = state.vLng * 0.7 + ((state.displayLng - prevLng) / dtMs) * 0.3;
          state.vLat = state.vLat * 0.7 + ((state.displayLat - prevLat) / dtMs) * 0.3;
        }
      }

      // ── Phase 4: Dead Reckoning (Queue empty / Lag buffer underflow) ──
      if (!segmentFound && queue.length <= 1) {
        if (
          state.extrapolatedMs < MAX_EXTRAP_MS &&
          (Math.abs(state.vLng) > 1e-10 || Math.abs(state.vLat) > 1e-10)
        ) {
          const dt = 16.67;
          state.extrapolatedMs += dt;
          const dampening = Math.max(0, 1 - state.extrapolatedMs / MAX_EXTRAP_MS);
          const dampenedSq = dampening * dampening;

          state.displayLng += state.vLng * dt * dampenedSq;
          state.displayLat += state.vLat * dt * dampenedSq;
          anyActive = true;
        }
      }

      // Update MapLibre DOM element (Zero React re-renders)
      marker.setLngLat([state.displayLng, state.displayLat]);
    }

    if (anyActive || stateMap.size > 0) {
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

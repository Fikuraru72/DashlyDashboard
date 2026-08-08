"use client";

import { useRef, useEffect, useCallback } from "react";
import maplibregl from "maplibre-gl";

// ── Configuration ────────────────────────────────────────────────
const BUFFER_DELAY_MS = 6000; // 6.0 second playback buffer for smooth 60fps interpolation
const MAX_QUEUE_SIZE = 500;   // Allow large batch sync queues without dropping points
const MAX_EXTRAP_MS = 2500;   // Max dead reckoning extrapolation duration (2.5s)

// ── Types ────────────────────────────────────────────────────────
export interface TelemetryWaypoint {
  lng: number;
  lat: number;
  time: number;       // Arrival timestamp (ms) — used for virtual playback
  speed?: number;
  routeDistance?: number;
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
  displayRouteDistance?: number;
  // Velocity vectors for dead reckoning (degrees per millisecond)
  vLng: number;
  vLat: number;
  extrapolatedMs: number;
  // Virtual clock playback offset per participant for smooth fast-replay
  playbackTime: number;
  // The last consumed waypoint
  lastConsumed: TelemetryWaypoint | null;
}

/**
 * useMapMarkerAnimation — Continuous Motion & Fast Replay Event Sync Engine
 *
 * 60 FPS continuous motion engine with:
 * - FIFO timestamped waypoint queue per participant
 * - Adaptive Fast-Replay for batch offline sync (2x-8x speedup when queue backs up)
 * - Time-based linear interpolation between waypoints
 * - Smooth dead reckoning extrapolation on network lag
 * - Synchronized event callback when waypoints are consumed
 */
export function useMapMarkerAnimation(
  markersRef: React.MutableRefObject<Map<string, maplibregl.Marker>>,
  onWaypointConsumed?: OnWaypointConsumed,
  onFrame?: (stateMap: Map<string, ParticipantPlaybackState>) => void,
) {
  const stateMapRef = useRef<Map<string, ParticipantPlaybackState>>(new Map());
  const rAfIdRef = useRef<number | null>(null);
  const isRunningRef = useRef(false);
  const onWaypointConsumedRef = useRef(onWaypointConsumed);
  const onFrameRef = useRef(onFrame);
  const lastFrameTimeRef = useRef<number>(Date.now());

  // Keep callback ref fresh without triggering re-renders
  useEffect(() => {
    onWaypointConsumedRef.current = onWaypointConsumed;
  }, [onWaypointConsumed]);

  useEffect(() => {
    onFrameRef.current = onFrame;
  }, [onFrame]);

  /**
   * Push a new GPS telemetry waypoint into a participant's buffer queue.
   * Supports both single real-time pings and batch arrays (from offline reconnection).
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
        routeDistance?: number;
      },
    ) => {
      if (isNaN(lng) || isNaN(lat)) return;

      const now = Date.now();
      const stateMap = stateMapRef.current;
      let state = stateMap.get(userId);

      if (!state) {
        // Initial load: Set initial playback time to now - BUFFER_DELAY_MS
        const initialWaypoint: TelemetryWaypoint = {
          lng,
          lat,
          time: now - BUFFER_DELAY_MS,
          speed,
          routeDistance: eventState?.routeDistance,
          ...eventState,
        };

        state = {
          queue: [initialWaypoint],
          displayLng: lng,
          displayLat: lat,
          displayRouteDistance: eventState?.routeDistance,
          vLng: 0,
          vLat: 0,
          extrapolatedMs: 0,
          playbackTime: now - BUFFER_DELAY_MS,
          lastConsumed: initialWaypoint,
        };
        stateMap.set(userId, state);
      } else {
        const wpTime = timestamp || now;

        // Reject obsolete waypoints from the past that arrived out-of-order
        if (wpTime <= state.playbackTime) {
          return;
        }

        const tail = state.queue[state.queue.length - 1];

        // Skip exact duplicate coordinate noise
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
          time: wpTime,
          speed,
          routeDistance: eventState?.routeDistance,
          ...eventState,
        };

        state.queue.push(newWaypoint);
        // Ensure queue is strictly sorted by timestamp chronologically
        state.queue.sort((a, b) => a.time - b.time);
        state.extrapolatedMs = 0; // Reset extrapolation timer

        // Safety cap if queue grows excessively large (>500)
        if (state.queue.length > MAX_QUEUE_SIZE) {
          state.queue = state.queue.slice(-100);
        }
      }

      // Start loop if idle
      if (!isRunningRef.current) {
        isRunningRef.current = true;
        lastFrameTimeRef.current = Date.now();
        rAfIdRef.current = requestAnimationFrame(animate);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  /**
   * Push a batch array of waypoints (e.g. from offline reconnection)
   */
  const pushWaypointBatch = useCallback(
    (
      userId: string,
      waypoints: Array<{
        lng: number;
        lat: number;
        speed?: number;
        timestamp?: number;
        eventState?: {
          status?: string;
          isAnomaly?: boolean;
          isStale?: boolean;
          color?: string;
          displayName?: string;
          routeDistance?: number;
        };
      }>,
    ) => {
      waypoints.forEach((wp) => {
        pushWaypoint(userId, wp.lng, wp.lat, wp.speed, wp.timestamp, wp.eventState);
      });
    },
    [pushWaypoint],
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
   * Main 60 FPS animation loop — Time-Based Linear Interpolation + Adaptive Fast Replay
   */
  const animate = useCallback(() => {
    const now = Date.now();
    const dtReal = Math.min(100, Math.max(1, now - lastFrameTimeRef.current));
    lastFrameTimeRef.current = now;

    const stateMap = stateMapRef.current;
    const markers = markersRef.current;
    let anyActive = false;

    for (const [userId, state] of stateMap.entries()) {
      const marker = markers.get(userId);
      const queue = state.queue;

      // ── Adaptive Fast-Replay Speed Calculation ────────────────
      // If queue has accumulated offline batch points (>3), accelerate playback
      // so the marker smoothly fast-forwards through offline points without teleporting.
      let speedMultiplier = 1.0;
      if (queue.length > 20) {
        speedMultiplier = 6.0; // Fast replay for 20+ offline points
      } else if (queue.length > 10) {
        speedMultiplier = 3.5;
      } else if (queue.length > 4) {
        speedMultiplier = 2.0;
      }

      // Advance virtual playback time for this participant
      state.playbackTime += dtReal * speedMultiplier;

      // Target virtual time (upper bound: now - 500ms to stay just behind real-time)
      const maxVirtualTime = now - 500;
      if (state.playbackTime > maxVirtualTime && queue.length <= 2) {
        state.playbackTime = maxVirtualTime;
      }

      const tRender = state.playbackTime;

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

          if (wA.routeDistance != null && wB.routeDistance != null) {
            state.displayRouteDistance = wA.routeDistance + alpha * (wB.routeDistance - wA.routeDistance);
          } else if (wB.routeDistance != null) {
            state.displayRouteDistance = wB.routeDistance;
          }

          segmentFound = true;
          anyActive = true;

          // Track velocity for dead reckoning (degrees per ms)
          const newVLng = (state.displayLng - prevLng) / dtReal;
          const newVLat = (state.displayLat - prevLat) / dtReal;
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
          const step = 0.08; // Smooth catch-up step
          const prevLng = state.displayLng;
          const prevLat = state.displayLat;

          state.displayLng += dLng * step;
          state.displayLat += dLat * step;
          if (target.routeDistance != null) {
            state.displayRouteDistance = target.routeDistance;
          }

          anyActive = true;
          state.vLng = state.vLng * 0.7 + ((state.displayLng - prevLng) / dtReal) * 0.3;
          state.vLat = state.vLat * 0.7 + ((state.displayLat - prevLat) / dtReal) * 0.3;
        }
      }

      // ── Phase 4: Dead Reckoning (Queue empty / Lag buffer underflow) ──
      if (!segmentFound && queue.length <= 1) {
        if (
          state.extrapolatedMs < MAX_EXTRAP_MS &&
          (Math.abs(state.vLng) > 1e-10 || Math.abs(state.vLat) > 1e-10)
        ) {
          state.extrapolatedMs += dtReal;
          const dampening = Math.max(0, 1 - state.extrapolatedMs / MAX_EXTRAP_MS);
          const dampenedSq = dampening * dampening;

          state.displayLng += state.vLng * dtReal * dampenedSq;
          state.displayLat += state.vLat * dtReal * dampenedSq;
          anyActive = true;
        }
      }

      // Update MapLibre DOM element if present
      if (marker) {
        marker.setLngLat([state.displayLng, state.displayLat]);
      }
    }

    if (onFrameRef.current) {
      onFrameRef.current(stateMapRef.current);
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

  return { updateTarget, pushWaypoint, pushWaypointBatch, removeTarget, stateMapRef };
}

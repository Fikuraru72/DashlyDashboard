"use client";

import { useRef, useEffect, useCallback } from "react";
import maplibregl from "maplibre-gl";

export interface Waypoint {
  lng: number;
  lat: number;
  time: number;
  speed?: number;
}

interface ParticipantAnimState {
  queue: Waypoint[];
  displayLng: number;
  displayLat: number;
  // Velocity components (deg per ms)
  vLng: number;
  vLat: number;
  lastUpdateTime: number;
  extrapolatedMs: number;
}

/**
 * useMapMarkerAnimation — 60 FPS Continuous Telemetry Motion Engine
 * 
 * Provides smooth, non-stop marker animation across intermittent GPS updates.
 * - Maintains a FIFO queue of timestamped waypoints per participant.
 * - Interpolates smoothly between waypoints with adaptive speed scaling.
 * - Applies Dead Reckoning (momentum extrapolation with ease-out dampening)
 *   when queue is temporarily empty to prevent abrupt pauses/stuttering.
 */
export function useMapMarkerAnimation(
  markersRef: React.MutableRefObject<Map<string, maplibregl.Marker>>,
  baseSpeedFactor: number = 0.08,
) {
  const stateMapRef = useRef<Map<string, ParticipantAnimState>>(new Map());
  const rAfIdRef = useRef<number | null>(null);
  const isRunningRef = useRef(false);
  const lastFrameTimeRef = useRef<number>(Date.now());

  /**
   * Push a new GPS waypoint into a participant's queue.
   */
  const pushWaypoint = useCallback(
    (userId: string, lng: number, lat: number, speed?: number, timestamp?: number) => {
      if (isNaN(lng) || isNaN(lat)) return;

      const now = timestamp || Date.now();
      const stateMap = stateMapRef.current;
      let state = stateMap.get(userId);

      if (!state) {
        // First position — snap instantly to position
        state = {
          queue: [{ lng, lat, time: now, speed }],
          displayLng: lng,
          displayLat: lat,
          vLng: 0,
          vLat: 0,
          lastUpdateTime: now,
          extrapolatedMs: 0,
        };
        stateMap.set(userId, state);
      } else {
        // Avoid inserting exact duplicate coordinates at the tail
        const lastInQueue = state.queue[state.queue.length - 1];
        if (
          !lastInQueue ||
          Math.abs(lastInQueue.lng - lng) > 0.000001 ||
          Math.abs(lastInQueue.lat - lat) > 0.000001
        ) {
          state.queue.push({ lng, lat, time: now, speed });
          // Limit queue max length to avoid memory leaks if rendering pauses
          if (state.queue.length > 20) {
            state.queue.shift();
          }
        }
        // Reset extrapolation timer when new waypoint arrives
        state.extrapolatedMs = 0;
      }

      // Start rAF loop if not running
      if (!isRunningRef.current) {
        isRunningRef.current = true;
        lastFrameTimeRef.current = performance.now();
        rAfIdRef.current = requestAnimationFrame(animate);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  /**
   * Alias for backward compatibility with previous updateTarget calls.
   */
  const updateTarget = useCallback(
    (userId: string, lng: number, lat: number, speed?: number, timestamp?: number) => {
      pushWaypoint(userId, lng, lat, speed, timestamp);
    },
    [pushWaypoint],
  );

  /**
   * Remove participant from animation loop (e.g. on disconnect / cleanup)
   */
  const removeTarget = useCallback((userId: string) => {
    stateMapRef.current.delete(userId);
  }, []);

  /**
   * Main 60 FPS animation loop.
   */
  const animate = useCallback(() => {
    const now = performance.now();
    const dt = Math.min(100, Math.max(1, now - lastFrameTimeRef.current)); // Clamp dt between 1ms and 100ms
    lastFrameTimeRef.current = now;

    const stateMap = stateMapRef.current;
    const markers = markersRef.current;
    let anyActive = false;

    for (const [userId, state] of stateMap.entries()) {
      const marker = markers.get(userId);
      if (!marker) continue;

      const queueLen = state.queue.length;

      if (queueLen > 0) {
        // Target is the next waypoint in queue
        const target = state.queue[0];
        const dLng = target.lng - state.displayLng;
        const dLat = target.lat - state.displayLat;
        const distSq = dLng * dLng + dLat * dLat;

        // Threshold ~0.000001 deg (approx 0.1 meter)
        if (distSq > 0.0000000001) {
          anyActive = true;
          // Dynamic catch-up factor: if queue is backing up (>2 items), speed up interpolation smoothly
          const catchUpMultiplier = queueLen > 3 ? 1.6 : queueLen > 1 ? 1.25 : 1.0;
          const step = Math.min(0.35, baseSpeedFactor * catchUpMultiplier * (dt / 16.67));

          const prevLng = state.displayLng;
          const prevLat = state.displayLat;

          state.displayLng += dLng * step;
          state.displayLat += dLat * step;

          // Track instantaneous velocity vector (degrees per millisecond)
          if (dt > 0) {
            const currentVLng = (state.displayLng - prevLng) / dt;
            const currentVLat = (state.displayLat - prevLat) / dt;
            // Smooth velocity vector blend (low-pass filter)
            state.vLng = state.vLng * 0.7 + currentVLng * 0.3;
            state.vLat = state.vLat * 0.7 + currentVLat * 0.3;
          }
        } else {
          // Reached target waypoint — snap to exact position and consume from queue if more remain
          state.displayLng = target.lng;
          state.displayLat = target.lat;

          if (queueLen > 1) {
            state.queue.shift();
            anyActive = true;
          }
        }
      } else {
        // Buffer underflow: Queue is empty. Perform Dead Reckoning (momentum extrapolation)
        // Keep moving along last known velocity vector for up to 2.5s with linear dampening
        if (state.extrapolatedMs < 2500 && (Math.abs(state.vLng) > 1e-9 || Math.abs(state.vLat) > 1e-9)) {
          state.extrapolatedMs += dt;
          const dampening = Math.max(0, 1 - state.extrapolatedMs / 2500);

          state.displayLng += state.vLng * dt * dampening;
          state.displayLat += state.vLat * dt * dampening;
          anyActive = true;
        } else {
          state.vLng = 0;
          state.vLat = 0;
        }
      }

      // Directly update MapLibre DOM marker without triggering React re-render
      marker.setLngLat([state.displayLng, state.displayLat]);
    }

    if (anyActive) {
      rAfIdRef.current = requestAnimationFrame(animate);
    } else {
      isRunningRef.current = false;
    }
  }, [baseSpeedFactor, markersRef]);

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

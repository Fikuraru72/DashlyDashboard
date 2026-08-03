"use client";

import { useRef, useEffect, useCallback } from "react";
import maplibregl from "maplibre-gl";

/**
 * Target state for a single marker animation.
 */
interface MarkerTarget {
  targetLng: number;
  targetLat: number;
  displayLng: number;
  displayLat: number;
}

/**
 * useMapMarkerAnimation — 60 FPS `requestAnimationFrame` lerp loop
 * for MapLibre GL markers. Smoothly interpolates marker positions
 * from current display coordinates to target coordinates using
 * exponential ease-out interpolation.
 *
 * Usage:
 *   const { updateTarget } = useMapMarkerAnimation(markersRef);
 *   // Call updateTarget(userId, lng, lat) whenever a new position arrives
 */
export function useMapMarkerAnimation(
  markersRef: React.MutableRefObject<Map<string, maplibregl.Marker>>,
  lerpFactor: number = 0.1,
) {
  const targetsRef = useRef<Map<string, MarkerTarget>>(new Map());
  const rAfIdRef = useRef<number | null>(null);
  const isRunningRef = useRef(false);

  /**
   * Update the target position for a given marker.
   * If no existing animation state, initializes display = target (instant snap).
   */
  const updateTarget = useCallback(
    (userId: string, lng: number, lat: number) => {
      const targets = targetsRef.current;
      const existing = targets.get(userId);

      if (!existing) {
        // First position — snap instantly, no lerp
        targets.set(userId, {
          targetLng: lng,
          targetLat: lat,
          displayLng: lng,
          displayLat: lat,
        });
      } else {
        existing.targetLng = lng;
        existing.targetLat = lat;
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
   * Remove a marker from the animation loop (e.g., when participant disconnects).
   */
  const removeTarget = useCallback((userId: string) => {
    targetsRef.current.delete(userId);
  }, []);

  /**
   * Main 60 FPS animation loop.
   * Lerps each marker's display position towards its target,
   * then calls marker.setLngLat() directly (no React re-renders).
   */
  const animate = useCallback(() => {
    const targets = targetsRef.current;
    const markers = markersRef.current;
    let anyActive = false;

    for (const [userId, t] of targets.entries()) {
      const dLng = t.targetLng - t.displayLng;
      const dLat = t.targetLat - t.displayLat;

      // Check if still lerping (threshold ~0.000001° ≈ 0.1m)
      if (Math.abs(dLng) > 0.000001 || Math.abs(dLat) > 0.000001) {
        t.displayLng += dLng * lerpFactor;
        t.displayLat += dLat * lerpFactor;
        anyActive = true;
      } else {
        t.displayLng = t.targetLng;
        t.displayLat = t.targetLat;
      }

      // Update the MapLibre marker position directly (no React state)
      const marker = markers.get(userId);
      if (marker) {
        marker.setLngLat([t.displayLng, t.displayLat]);
      }
    }

    if (anyActive) {
      rAfIdRef.current = requestAnimationFrame(animate);
    } else {
      isRunningRef.current = false;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lerpFactor]);

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

  return { updateTarget, removeTarget };
}

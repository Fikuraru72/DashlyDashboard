import { AltitudePoint } from '@/types/elevation';
import { binarySearchDistance } from './binary-search';

/**
 * Given a distance along route, interpolate latitude, longitude, and elevation
 * using binary search on the altitudeProfile array.
 */
export function interpolateAtDistance(
  altitudeProfile: AltitudePoint[],
  distance: number,
): { lat: number; lng: number; elevation: number; grade: number } | null {
  if (!altitudeProfile || altitudeProfile.length === 0) return null;

  if (distance <= 0) {
    const p = altitudeProfile[0];
    return { lat: p.lat, lng: p.lng, elevation: p.elevation, grade: 0 };
  }

  const last = altitudeProfile[altitudeProfile.length - 1];
  if (distance >= last.distance) {
    return { lat: last.lat, lng: last.lng, elevation: last.elevation, grade: 0 };
  }

  // Extract distance array for binary search
  const distances = altitudeProfile.map((p) => p.distance);
  const idx = binarySearchDistance(distances, distance);

  const p1 = altitudeProfile[idx];
  const p2 = altitudeProfile[idx + 1];

  const segLength = p2.distance - p1.distance;
  const fraction = segLength > 0 ? (distance - p1.distance) / segLength : 0;

  const lat = p1.lat + fraction * (p2.lat - p1.lat);
  const lng = p1.lng + fraction * (p2.lng - p1.lng);
  const elevation = p1.elevation + fraction * (p2.elevation - p1.elevation);

  const grade = segLength > 0 ? ((p2.elevation - p1.elevation) / segLength) * 100 : 0;

  return { lat, lng, elevation, grade };
}

/**
 * Fallback helper: find nearest route distance (in meters) for a given lat/lng
 * when pre-calculated routeDistance is missing.
 */
export function findNearestProfileDistance(
  altitudeProfile: AltitudePoint[],
  lat: number,
  lng: number,
): number {
  if (!altitudeProfile || altitudeProfile.length === 0) return 0;
  let minDist = Infinity;
  let bestRouteDistance = 0;

  for (const pt of altitudeProfile) {
    const dLat = pt.lat - lat;
    const dLng = pt.lng - lng;
    const distSq = dLat * dLat + dLng * dLng;
    if (distSq < minDist) {
      minDist = distSq;
      bestRouteDistance = pt.distance;
    }
  }

  return bestRouteDistance;
}

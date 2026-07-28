import { AltitudePoint, ChartDataPoint } from '@/types/elevation';

/**
 * Douglas-Peucker algorithm to reduce altitude profile point count
 * while preserving peaks, valleys, and slope changes.
 *
 * @param points Raw altitude profile points
 * @param targetCount Target point count (e.g. 2000)
 */
export function downsampleProfile(
  points: AltitudePoint[],
  targetCount: number = 2000,
): ChartDataPoint[] {
  if (!points || points.length === 0) return [];
  if (points.length <= targetCount) {
    return convertToChartPoints(points);
  }

  // Find appropriate epsilon via binary search on epsilon
  let minEps = 0.01;
  let maxEps = 100.0;
  let result = points;

  for (let iter = 0; iter < 10; iter++) {
    const midEps = (minEps + maxEps) / 2;
    const simplified = douglasPeucker(points, midEps);
    if (simplified.length > targetCount) {
      minEps = midEps;
    } else {
      maxEps = midEps;
      result = simplified;
    }
  }

  return convertToChartPoints(result);
}

function douglasPeucker(points: AltitudePoint[], epsilon: number): AltitudePoint[] {
  if (points.length <= 2) return points;

  let maxDist = 0;
  let index = 0;
  const end = points.length - 1;

  for (let i = 1; i < end; i++) {
    const d = perpendicularDistance(points[i], points[0], points[end]);
    if (d > maxDist) {
      maxDist = d;
      index = i;
    }
  }

  if (maxDist > epsilon) {
    const rec1 = douglasPeucker(points.slice(0, index + 1), epsilon);
    const rec2 = douglasPeucker(points.slice(index), epsilon);
    return rec1.slice(0, rec1.length - 1).concat(rec2);
  } else {
    return [points[0], points[end]];
  }
}

function perpendicularDistance(
  p: AltitudePoint,
  lineStart: AltitudePoint,
  lineEnd: AltitudePoint,
): number {
  const x = p.distance;
  const y = p.elevation;
  const x1 = lineStart.distance;
  const y1 = lineStart.elevation;
  const x2 = lineEnd.distance;
  const y2 = lineEnd.elevation;

  const dx = x2 - x1;
  const dy = y2 - y1;
  const lenSq = dx * dx + dy * dy;

  if (lenSq === 0) {
    return Math.sqrt((x - x1) * (x - x1) + (y - y1) * (y - y1));
  }

  const num = Math.abs(dy * x - dx * y + x2 * y1 - y2 * x1);
  return num / Math.sqrt(lenSq);
}

function convertToChartPoints(points: AltitudePoint[]): ChartDataPoint[] {
  return points.map((p, i) => {
    let grade = 0;
    if (i > 0) {
      const prev = points[i - 1];
      const run = p.distance - prev.distance;
      const rise = p.elevation - prev.elevation;
      grade = run > 0 ? (rise / run) * 100 : 0;
    }
    return {
      distance: p.distance,
      elevation: p.elevation,
      grade: Math.round(grade * 10) / 10,
      lat: p.lat,
      lng: p.lng,
    };
  });
}

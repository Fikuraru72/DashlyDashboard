/**
 * Fast binary search on a sorted Float64Array of cumulative distances.
 * Finds the index `i` such that `distances[i] <= target < distances[i+1]`.
 *
 * @param distances Sorted array of cumulative distances
 * @param target Target distance in meters
 * @returns Index `i` (clamped to 0..length-2)
 */
export function binarySearchDistance(distances: Float64Array | number[], target: number): number {
  if (!distances || distances.length === 0) return 0;
  if (target <= distances[0]) return 0;
  if (target >= distances[distances.length - 1]) return distances.length - 2;

  let low = 0;
  let high = distances.length - 2;

  while (low <= high) {
    const mid = (low + high) >> 1;
    if (distances[mid] <= target && target < distances[mid + 1]) {
      return mid;
    }
    if (distances[mid] > target) {
      high = mid - 1;
    } else {
      low = mid + 1;
    }
  }

  return Math.max(0, Math.min(distances.length - 2, low));
}

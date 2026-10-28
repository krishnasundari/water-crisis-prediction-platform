/**
 * Map Coordinate Validation and Filtering Utilities
 * ==================================================
 * Enforces strict geographic bounds, asset association, and missing data handling.
 * Geographic boundary bounds valid coordinates strictly within the Republic of India:
 *   Latitude:  [6.0° N, 38.5° N]
 *   Longitude: [68.0° E, 98.5° E]
 */

export interface CoordinateItem {
  latitude?: number | null;
  longitude?: number | null;
  [key: string]: any;
}

/**
 * Validates whether latitude and longitude represent a legitimate geographic point in India.
 * Rejects: null, undefined, NaN, (0,0) Null Island, inverted coords, and out-of-boundary values.
 */
export function isValidCoord(lat: any, lng: any): boolean {
  if (lat === null || lat === undefined || lng === null || lng === undefined) {
    return false;
  }
  const numLat = typeof lat === "number" ? lat : parseFloat(lat);
  const numLng = typeof lng === "number" ? lng : parseFloat(lng);

  if (isNaN(numLat) || isNaN(numLng)) {
    return false;
  }

  // Reject Null Island (0,0) and identical origin points
  if (Math.abs(numLat) < 0.0001 && Math.abs(numLng) < 0.0001) {
    return false;
  }

  // India sovereign territory & territorial waters bounding envelope:
  // Southernmost: Indira Point (~6.78° N) / Kanyakumari (~8.08° N)
  // Northernmost: Indira Col (~37.1° N)
  // Westernmost:  Ghuar Mota, Gujarat (~68.1° E)
  // Easternmost:  Kibithu, Arunachal Pradesh (~97.4° E)
  return numLat >= 6.0 && numLat <= 38.5 && numLng >= 68.0 && numLng <= 98.5;
}

export interface MapFilters {
  state?: string;
  district?: string;
  assetType?: "all" | "villages" | "reservoirs" | "rivers";
  riskLevel?: "all" | "critical" | "high" | "moderate" | "safe";
}

/**
 * Filters a collection of geographic assets by State, District, and valid coordinates.
 */
export function filterAssetsByLocation<T extends CoordinateItem>(
  items: T[],
  filters: { state?: string; district?: string }
): T[] {
  return items.filter((item) => {
    if (!isValidCoord(item.latitude, item.longitude)) {
      return false;
    }
    if (filters.state && filters.state !== "all") {
      const itemState = (item.state || "").toLowerCase().trim();
      const filterState = filters.state.toLowerCase().trim();
      if (itemState !== filterState) return false;
    }
    if (filters.district && filters.district !== "all") {
      const itemDist = (item.district || "").toLowerCase().trim();
      const filterDist = filters.district.toLowerCase().trim();
      if (itemDist !== filterDist) return false;
    }
    return true;
  });
}

/**
 * Calculates accurate centroid from a set of valid geographic items.
 * Returns null if no valid coordinates exist, preventing synthetic fallback coordinates.
 */
export function computeCentroid(items: CoordinateItem[]): [number, number] | null {
  const valid = items.filter((i) => isValidCoord(i.latitude, i.longitude));
  if (valid.length === 0) return null;

  const sumLat = valid.reduce((acc, curr) => acc + Number(curr.latitude), 0);
  const sumLng = valid.reduce((acc, curr) => acc + Number(curr.longitude), 0);
  return [Number((sumLat / valid.length).toFixed(4)), Number((sumLng / valid.length).toFixed(4))];
}

/**
 * Derives storage percentage without substituting synthetic 50% fallbacks.
 * Returns null if capacity is missing or zero.
 */
export function calculateStoragePercentage(level: number | null | undefined, capacity: number | null | undefined): number | null {
  if (level === null || level === undefined || capacity === null || capacity === undefined || capacity <= 0) {
    return null;
  }
  return Number(((level / capacity) * 100).toFixed(1));
}

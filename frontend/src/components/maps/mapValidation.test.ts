import { describe, it, expect } from "vitest";
import {
  isValidCoord,
  filterAssetsByLocation,
  computeCentroid,
  calculateStoragePercentage,
} from "../../utils/mapUtils";

describe("Map Coordinate Validation (isValidCoord)", () => {
  it("accepts valid Indian coordinates", () => {
    // New Delhi
    expect(isValidCoord(28.6139, 77.2090)).toBe(true);
    // Mandya (Krishnaraja Sagara reservoir)
    expect(isValidCoord(12.26, 76.57)).toBe(true);
    // Gaya, Bihar
    expect(isValidCoord(24.79, 85.00)).toBe(true);
    // Kochi, Kerala
    expect(isValidCoord(9.50, 76.30)).toBe(true);
    // Varanasi (Ganges river station)
    expect(isValidCoord(25.32, 82.97)).toBe(true);
  });

  it("rejects Null Island (0,0)", () => {
    expect(isValidCoord(0, 0)).toBe(false);
    expect(isValidCoord(0.0, 0.0)).toBe(false);
  });

  it("rejects null, undefined, and NaN coordinates", () => {
    expect(isValidCoord(null, null)).toBe(false);
    expect(isValidCoord(undefined, 77.20)).toBe(false);
    expect(isValidCoord(28.61, undefined)).toBe(false);
    expect(isValidCoord(NaN, 77.20)).toBe(false);
    expect(isValidCoord("invalid", "coords")).toBe(false);
  });

  it("rejects coordinates outside Indian sovereign bounding envelope", () => {
    // London, UK
    expect(isValidCoord(51.5074, -0.1278)).toBe(false);
    // New York, USA
    expect(isValidCoord(40.7128, -74.0060)).toBe(false);
    // Equator / Southern Ocean
    expect(isValidCoord(-15.0, 75.0)).toBe(false);
    // North Pole
    expect(isValidCoord(89.0, 75.0)).toBe(false);
    // East Pacific
    expect(isValidCoord(20.0, 140.0)).toBe(false);
  });
});

describe("Location and Asset Filtering (filterAssetsByLocation)", () => {
  const mockVillages = [
    { id: 1, name: "Gaya Village", district: "Gaya", state: "Bihar", latitude: 24.79, longitude: 85.00 },
    { id: 2, name: "Pongodu", district: "Kochi", state: "Kerala", latitude: 9.50, longitude: 76.30 },
    { id: 3, name: "Ponugodu", district: "Nalgonda", state: "Telangana", latitude: 16.85, longitude: 79.22 },
    { id: 4, name: "Invalid Loc", district: "Gaya", state: "Bihar", latitude: 0.0, longitude: 0.0 }, // Invalid
    { id: 5, name: "Missing Loc", district: "Gaya", state: "Bihar", latitude: null, longitude: null }, // Missing
  ];

  it("excludes records with missing or invalid coordinates automatically", () => {
    const result = filterAssetsByLocation(mockVillages, { state: "all", district: "all" });
    expect(result).toHaveLength(3);
    expect(result.map((v) => v.id)).toEqual([1, 2, 3]);
  });

  it("filters correctly by state", () => {
    const result = filterAssetsByLocation(mockVillages, { state: "Kerala", district: "all" });
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("Pongodu");
  });

  it("filters correctly by district", () => {
    const result = filterAssetsByLocation(mockVillages, { state: "Bihar", district: "Gaya" });
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("Gaya Village");
  });
});

describe("Centroid Calculation (computeCentroid)", () => {
  it("calculates accurate centroid from valid items", () => {
    const items = [
      { latitude: 10.0, longitude: 70.0 },
      { latitude: 20.0, longitude: 80.0 },
    ];
    const centroid = computeCentroid(items);
    expect(centroid).toEqual([15.0, 75.0]);
  });

  it("returns null when all items have missing coordinates, never inventing points", () => {
    const items = [
      { latitude: 0, longitude: 0 },
      { latitude: null, longitude: null },
    ];
    expect(computeCentroid(items)).toBeNull();
  });
});

describe("Storage Percentage (calculateStoragePercentage)", () => {
  it("calculates storage percentage accurately", () => {
    expect(calculateStoragePercentage(800, 1000)).toBe(80.0);
    expect(calculateStoragePercentage(350.5, 701.0)).toBe(50.0);
  });

  it("returns null when capacity or level is missing, never returning synthetic 50%", () => {
    expect(calculateStoragePercentage(null, 1000)).toBeNull();
    expect(calculateStoragePercentage(500, null)).toBeNull();
    expect(calculateStoragePercentage(500, 0)).toBeNull();
  });
});

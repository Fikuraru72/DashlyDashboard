import { getRouteCoordinates, getRouteLatLngs, toRouteFeatureCollection } from "@/lib/utils/route-normalizer";

const coords: [number, number][] = [
  [106.1, -6.1],
  [106.2, -6.2],
];

describe("route normalizer", () => {
  it("reads raw LineString", () => {
    const route = { type: "LineString", coordinates: coords };

    expect(getRouteCoordinates(route)).toEqual(coords);
    expect(getRouteLatLngs(route)).toEqual([
      [-6.1, 106.1],
      [-6.2, 106.2],
    ]);
  });

  it("reads GeoJSON Feature", () => {
    const route = {
      type: "Feature",
      properties: {},
      geometry: { type: "LineString", coordinates: coords },
    };

    expect(getRouteCoordinates(route)).toEqual(coords);
  });

  it("reads FeatureCollection and outputs one safe shape", () => {
    const route = {
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          properties: {},
          geometry: { type: "LineString", coordinates: coords },
        },
      ],
    };

    expect(toRouteFeatureCollection(route)).toEqual(route);
  });
});

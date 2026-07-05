type LngLat = [number, number] | [number, number, number];
type Line = LngLat[];

type UnknownRecord = Record<string, unknown>;

const isRecord = (value: unknown): value is UnknownRecord =>
  typeof value === "object" && value !== null;

const isLngLat = (value: unknown): value is LngLat =>
  Array.isArray(value) &&
  value.length >= 2 &&
  typeof value[0] === "number" &&
  typeof value[1] === "number";

const isLine = (value: unknown): value is Line =>
  Array.isArray(value) && value.length > 0 && value.every(isLngLat);

const collectLines = (geojson: unknown): Line[] => {
  if (!isRecord(geojson)) return [];

  if (geojson.type === "LineString" && isLine(geojson.coordinates)) {
    return [geojson.coordinates];
  }

  if (geojson.type === "MultiLineString" && Array.isArray(geojson.coordinates)) {
    return geojson.coordinates.filter(isLine);
  }

  if (geojson.type === "Feature") {
    return collectLines(geojson.geometry);
  }

  if (geojson.type === "FeatureCollection" && Array.isArray(geojson.features)) {
    return geojson.features.flatMap(collectLines);
  }

  return [];
};

export const getRouteCoordinates = (geojson: unknown): Line =>
  collectLines(geojson)[0] ?? [];

export const getRouteLatLngs = (geojson: unknown): [number, number][] =>
  getRouteCoordinates(geojson).map((coord) => [coord[1], coord[0]]);

export const toRouteFeatureCollection = (geojson: unknown) => ({
  type: "FeatureCollection" as const,
  features: collectLines(geojson).map((coordinates) => ({
    type: "Feature" as const,
    properties: {},
    geometry: {
      type: "LineString" as const,
      coordinates,
    },
  })),
});

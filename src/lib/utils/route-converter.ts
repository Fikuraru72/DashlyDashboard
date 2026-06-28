import * as togeojson from "@mapbox/togeojson";
import { DOMParser } from "xmldom";

/**
 * Converts GPX or KML file content to GeoJSON.
 * @param content String content of the file
 * @param type 'gpx' | 'kml'
 * @returns FeatureCollection GeoJSON
 */
export const convertFileToGeoJSON = (content: string, type: 'gpx' | 'kml'): any => {
  try {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(content, "text/xml");
    
    let geojson: any;
    if (type === 'gpx') {
      geojson = togeojson.gpx(xmlDoc);
    } else {
      geojson = togeojson.kml(xmlDoc);
    }
    
    return geojson;
  } catch (error) {
    console.error(`Error converting ${type.toUpperCase()}:`, error);
    throw new Error(`Failed to parse ${type.toUpperCase()} file.`);
  }
};

/**
 * Extracts the core route (LineString) from a converted GeoJSON.
 * Prioritizes LineString features which are standard for race routes.
 */
export const extractMainRoute = (geojson: any): any => {
  if (!geojson || !geojson.features) return null;
  
  // Filter for LineString or MultiLineString
  const routeFeatures = geojson.features.filter((f: any) => 
    f.geometry?.type === 'LineString' || f.geometry?.type === 'MultiLineString'
  );
  
  if (routeFeatures.length === 0) {
    throw new Error("No valid LineString or route found in the file.");
  }
  
  // If multiple, pick the one with most coordinates (longest)
  return routeFeatures.sort((a: any, b: any) => {
    const aLen = a.geometry.coordinates?.length || 0;
    const bLen = b.geometry.coordinates?.length || 0;
    return bLen - aLen;
  })[0];
};

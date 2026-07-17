declare module "@mapbox/togeojson" {
  export function gpx(doc: Document): any;
  export function kml(doc: Document): any;
}

declare module "xmldom" {
  export class DOMParser {
    parseFromString(xml: string, mimeType: string): Document;
  }
}

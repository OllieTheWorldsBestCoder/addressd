export interface MapboxTileCoordinates {
  x: number;
  y: number;
  z: number;
}

export interface BuildingFeature {
  properties: {
    'building:levels'?: string;
    'building:material'?: string;
    'roof:color'?: string;
    [key: string]: any;
  };
}

export interface BuildingFootprint {
  polygon: number[][];
  entrance: {
    lat: number;
    lng: number;
  };
  properties: BuildingFeature['properties'];
}

export interface MapboxGeocodingFeature {
  center: [number, number];
  place_name: string;
  context: Array<{
    id: string;
    text: string;
    [key: string]: any;
  }>;
} 
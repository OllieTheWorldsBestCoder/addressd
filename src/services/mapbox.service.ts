import axios from 'axios';
import { VectorTile } from '@mapbox/vector-tile';
import Protobuf from 'pbf';
import { MapboxTileCoordinates, BuildingFeature, BuildingFootprint } from '../types/mapbox';

const TILE_SIZE = 512;
const DEFAULT_ZOOM = 16;

export class MapboxService {
  private static instance: MapboxService;
  private clientToken: string;
  private serverToken: string;

  private constructor() {
    this.clientToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN || '';
    this.serverToken = process.env.MAPBOX_SERVER_TOKEN || '';
    
    if (!this.clientToken || !this.serverToken) {
      console.warn('Mapbox tokens not properly configured');
    }
  }

  public static getInstance(): MapboxService {
    if (!MapboxService.instance) {
      MapboxService.instance = new MapboxService();
    }
    return MapboxService.instance;
  }

  private getToken(isServerSide: boolean = true): string {
    return isServerSide ? this.serverToken : this.clientToken;
  }

  private async handleMapboxError(error: any): Promise<null> {
    if (axios.isAxiosError(error)) {
      if (error.response?.status === 401) {
        console.error('Mapbox authentication failed. Please check your API tokens.');
      } else {
        console.error('Mapbox API error:', error.response?.status, error.message);
      }
    } else {
      console.error('Unexpected error:', error);
    }
    return null;
  }

  private latLngToTileXY(lat: number, lng: number, zoom: number): MapboxTileCoordinates {
    const scale = Math.pow(2, zoom);
    
    const sin = Math.sin(lat * Math.PI / 180);
    const x = Math.floor(((lng + 180) / 360) * scale);
    const y = Math.floor(((0.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI)) * scale));
    
    return { x, y, z: zoom };
  }

  private tileToLatLng(x: number, y: number, zoom: number): { lat: number; lng: number } {
    const scale = Math.pow(2, zoom);
    const lng = (x / scale) * 360 - 180;
    
    const n = Math.PI - 2 * Math.PI * y / scale;
    const lat = (180 / Math.PI) * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)));
    
    return { lat, lng };
  }

  private async fetchVectorTile(tileCoords: MapboxTileCoordinates): Promise<VectorTile | null> {
    try {
      const { x, y, z } = tileCoords;
      const url = `https://api.mapbox.com/v4/mapbox.mapbox-streets-v8/${z}/${x}/${y}.vector.pbf?access_token=${this.getToken()}`;
      
      const response = await axios.get(url, {
        responseType: 'arraybuffer'
      });
      
      return new VectorTile(new Protobuf(response.data));
    } catch (error) {
      return this.handleMapboxError(error);
    }
  }

  private calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371e3; // Earth's radius in meters
    const phi1 = lat1 * Math.PI / 180;
    const phi2 = lat2 * Math.PI / 180;
    const deltaPhi = (lat2 - lat1) * Math.PI / 180;
    const deltaLambda = (lng2 - lng1) * Math.PI / 180;

    const a = Math.sin(deltaPhi/2) * Math.sin(deltaPhi/2) +
              Math.cos(phi1) * Math.cos(phi2) *
              Math.sin(deltaLambda/2) * Math.sin(deltaLambda/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c;
  }

  private estimateEntrance(polygon: number[][], streetLat: number, streetLng: number): { lat: number; lng: number } {
    let minDist = Infinity;
    let entrance = { lat: 0, lng: 0 };

    // Find the edge closest to the street
    for (let i = 0; i < polygon.length - 1; i++) {
      const midLat = (polygon[i][0] + polygon[i+1][0]) / 2;
      const midLng = (polygon[i][1] + polygon[i+1][1]) / 2;
      const dist = this.calculateDistance(midLat, midLng, streetLat, streetLng);
      
      if (dist < minDist) {
        minDist = dist;
        entrance = { lat: midLat, lng: midLng };
      }
    }

    return entrance;
  }

  public async findNearestBuilding(lat: number, lng: number): Promise<BuildingFootprint | null> {
    try {
      const tileCoords = this.latLngToTileXY(lat, lng, DEFAULT_ZOOM);
      const vectorTile = await this.fetchVectorTile(tileCoords);
      
      if (!vectorTile) {
        console.warn('No vector tile data available');
        return null;
      }

      const buildingLayer = vectorTile.layers['building'];
      if (!buildingLayer) {
        console.warn('No building layer found in vector tile');
        return null;
      }

      let nearestBuilding: BuildingFootprint | null = null;
      let minDistance = Infinity;

      for (let i = 0; i < buildingLayer.length; i++) {
        const feature = buildingLayer.feature(i);
        const geometry = feature.loadGeometry();
        
        if (!geometry || geometry.length === 0) continue;
        
        // Convert tile coordinates to lat/lng
        const polygon = geometry[0].map(point => {
          const { lat: tileLat, lng: tileLng } = this.tileToLatLng(
            tileCoords.x + point.x / TILE_SIZE,
            tileCoords.y + point.y / TILE_SIZE,
            tileCoords.z
          );
          return [tileLat, tileLng];
        });

        const distance = this.calculateDistance(
          lat,
          lng,
          polygon[0][0],
          polygon[0][1]
        );

        if (distance < minDistance) {
          minDistance = distance;
          const entrance = this.estimateEntrance(polygon, lat, lng);
          nearestBuilding = {
            polygon,
            entrance,
            properties: feature.properties
          };
        }
      }

      return nearestBuilding;
    } catch (error) {
      return this.handleMapboxError(error);
    }
  }

  public generateBuildingDescriptor(properties: BuildingFeature['properties']): string {
    const descriptors: string[] = [];

    if (properties['building:levels']) {
      descriptors.push(`${properties['building:levels']}-story`);
    }

    if (properties['building:material']) {
      descriptors.push(properties['building:material']);
    }

    if (properties['roof:color']) {
      descriptors.push(`with a ${properties['roof:color']} roof`);
    }

    if (descriptors.length === 0) {
      return 'building';
    }

    return `${descriptors.join(' ')} building`;
  }
} 
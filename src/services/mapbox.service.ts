import axios from 'axios';
import { VectorTile } from '@mapbox/vector-tile';
import Protobuf from 'pbf';
import { MapboxTileCoordinates, BuildingFeature, BuildingFootprint } from '../types/mapbox';

const TILE_SIZE = 512;
const DEFAULT_ZOOM = 16;

type Direction = 'north' | 'south' | 'east' | 'west' | 'northeast' | 'northwest' | 'southeast' | 'southwest';

export class MapboxService {
  private static instance: MapboxService;
  private accessToken: string;

  private constructor() {
    this.accessToken = process.env.MAPBOX_ACCESS_TOKEN || '';
  }

  public static getInstance(): MapboxService {
    if (!MapboxService.instance) {
      MapboxService.instance = new MapboxService();
    }
    return MapboxService.instance;
  }

  generateBuildingDescriptor(properties: BuildingFeature['properties']): string {
    const details: string[] = [];

    // Start with the building type and material
    if (properties['building:material']) {
      const material = properties['building:material'].toLowerCase();
      if (material === 'brick') {
        details.push("Look for a red brick building");
      } else if (material === 'stone') {
        details.push("Look for a stone building");
      } else if (material === 'glass') {
        details.push("Look for a modern glass-fronted building");
      } else {
        details.push(`Look for a ${material} building`);
      }
    }

    // Add distinctive features
    if (properties['building:colour'] || properties['building:color']) {
      const color = (properties['building:colour'] || properties['building:color']).toLowerCase();
      details.push(`with ${color} walls`);
    }

    // Add height information in a natural way
    if (properties['building:levels']) {
      const levels = parseInt(properties['building:levels']);
      if (levels === 1) {
        details.push("it's a single-story building");
      } else if (levels === 2) {
        details.push("it's a two-story building");
      } else if (levels === 3) {
        details.push("it's a three-story building");
      } else if (levels > 3) {
        details.push(`it's a ${levels}-story tall building`);
      }
    }

    // Add roof information if distinctive
    if (properties['roof:color'] || properties['roof:colour']) {
      const roofColor = (properties['roof:color'] || properties['roof:colour']).toLowerCase();
      details.push(`with a distinctive ${roofColor} roof`);
    }

    if (properties['roof:shape']) {
      const shape = properties['roof:shape'].toLowerCase();
      if (shape === 'flat') {
        details.push("with a flat roof");
      } else if (shape === 'pitched') {
        details.push("with a pitched roof");
      } else if (shape === 'dome') {
        details.push("with a domed roof");
      }
    }

    // Add any distinctive amenities or features
    if (properties['amenity']) {
      details.push(`You'll see ${this.getAmenityDescription(properties['amenity'])}`);
    }

    // Add entrance information if available
    if (properties['entrance']) {
      details.push(this.getEntranceTypeDescription(properties['entrance']));
    }

    // Combine all details with proper punctuation
    return details
      .filter(detail => detail) // Remove empty strings
      .map((detail, index) => {
        if (index === 0) {
          return detail.charAt(0).toUpperCase() + detail.slice(1);
        }
        return detail;
      })
      .join('. ') + '.';
  }

  private getAmenityDescription(amenity: string): string {
    const amenityDescriptions: Record<string, string> = {
      'restaurant': 'a restaurant at street level',
      'cafe': 'a café at the front',
      'shop': 'shops at street level',
      'bank': 'a bank branch at street level',
      'pharmacy': 'a pharmacy sign',
      'post_office': 'post office signs',
      'hotel': 'hotel signage at the entrance'
    };

    return amenityDescriptions[amenity] || `a ${amenity.replace('_', ' ')}`;
  }

  private getEntranceTypeDescription(entranceType: string): string {
    const entranceDescriptions: Record<string, string> = {
      'main': 'The main entrance is clearly marked',
      'service': 'Look for the service entrance',
      'garage': 'There\'s a garage entrance',
      'emergency': 'There\'s an emergency exit',
      'deliveries': 'The delivery entrance is marked with signs'
    };

    return entranceDescriptions[entranceType] || 'The entrance is marked';
  }

  getEntranceDescription(entrance: { lat: number; lng: number }, userLocation?: { lat: number; lng: number }): string {
    if (!userLocation) {
      // If we don't have user location, use relative terms based on building orientation
      const naturalDirections: Record<Direction, string> = {
        'north': 'at the back',
        'south': 'at the front',
        'east': 'on the right side',
        'west': 'on the left side',
        'northeast': 'on the right side towards the back',
        'northwest': 'on the left side towards the back',
        'southeast': 'on the right side towards the front',
        'southwest': 'on the left side towards the front'
      };

      // Get the direction based on the entrance coordinates
      const direction = this.getDirection(entrance);
      return `The entrance is ${naturalDirections[direction]} of the building`;
    } else {
      // If we have user location, give directions relative to their approach
      const bearing = this.calculateBearing(userLocation, entrance);
      
      if (bearing > 315 || bearing <= 45) {
        return "The entrance is straight ahead as you approach";
      } else if (bearing > 45 && bearing <= 135) {
        return "As you approach, you'll find the entrance on your right";
      } else if (bearing > 135 && bearing <= 225) {
        return "The entrance is on the opposite side of where you're approaching from";
      } else {
        return "As you approach, you'll find the entrance on your left";
      }
    }
  }

  private calculateBearing(from: { lat: number; lng: number }, to: { lat: number; lng: number }): number {
    const toRad = (deg: number) => (deg * Math.PI) / 180;
    const toDeg = (rad: number) => (rad * 180) / Math.PI;

    const lat1 = toRad(from.lat);
    const lat2 = toRad(to.lat);
    const dLon = toRad(to.lng - from.lng);

    const y = Math.sin(dLon) * Math.cos(lat2);
    const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
    const bearing = toDeg(Math.atan2(y, x));

    return (bearing + 360) % 360;
  }

  private getDirection(entrance: { lat: number; lng: number }): Direction {
    // Simple direction calculation based on coordinates
    // This is a simplified version - in reality, you'd want to use the building's orientation
    const bearing = this.calculateBearing(
      { lat: entrance.lat - 0.0001, lng: entrance.lng - 0.0001 }, // Reference point slightly southwest
      entrance
    );

    if (bearing > 337.5 || bearing <= 22.5) return 'north';
    if (bearing > 22.5 && bearing <= 67.5) return 'northeast';
    if (bearing > 67.5 && bearing <= 112.5) return 'east';
    if (bearing > 112.5 && bearing <= 157.5) return 'southeast';
    if (bearing > 157.5 && bearing <= 202.5) return 'south';
    if (bearing > 202.5 && bearing <= 247.5) return 'southwest';
    if (bearing > 247.5 && bearing <= 292.5) return 'west';
    return 'northwest';
  }

  async findNearestBuilding(lat: number, lng: number): Promise<BuildingFootprint | null> {
    try {
      // Implementation of finding nearest building using Mapbox API
      // This would involve querying the vector tiles or Mapbox's building footprints API
      return null;
    } catch (error) {
      console.error('Error finding nearest building:', error);
      return null;
    }
  }
} 
import { Client, GeocodeResult, AddressType } from "@googlemaps/google-maps-services-js";
import OpenAI from "openai";
import { db } from '../config/firebase';
import { collection, doc, setDoc, getDoc, query, where, getDocs } from 'firebase/firestore';
import { Address } from '../types/address';
import { LearningService } from './learning.service';
import { getVectorDistance } from '../utils/vector';
import crypto from 'crypto';
import { MapboxService } from './mapbox.service';

const mapboxService = MapboxService.getInstance();

export class AddressService {
  private googleMapsClient: Client;
  private openai: OpenAI;
  private addressCollection = 'addresses';
  private learningService: LearningService;

  constructor() {
    this.googleMapsClient = new Client({});
    
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
    this.learningService = new LearningService();
  }

  async createOrUpdateAddress(address: string): Promise<Address | null> {
    try {
      // Geocode the address
      const geocodeResponse = await this.googleMapsClient.geocode({
        params: {
          address,
          key: process.env.GOOGLE_MAPS_API_KEY!
        }
      });

      if (!geocodeResponse.data.results || geocodeResponse.data.results.length === 0) {
        return null;
      }

      const result = geocodeResponse.data.results[0];
      const { formatted_address, geometry } = result;

      // Check for existing address
      const existingAddress = await this.findExistingAddressInternal(
        formatted_address,
        {
          lat: geometry.location.lat,
          lng: geometry.location.lng
        }
      );
      
      if (existingAddress) {
        const updatedAddress = {
          ...existingAddress,
          matchedAddresses: [
            ...(existingAddress.matchedAddresses || []),
            {
              rawAddress: address,
              matchedAt: new Date()
            }
          ],
          updatedAt: new Date()
        };

        await setDoc(doc(db, this.addressCollection, existingAddress.id), updatedAddress);
        return updatedAddress;
      }

      // Create new address
      const newAddress: Address = {
        id: crypto.randomUUID(),
        rawAddress: address,
        formattedAddress: formatted_address,
        latitude: geometry.location.lat,
        longitude: geometry.location.lng,
        geohash: '',
        matchedAddresses: [{
          rawAddress: address,
          matchedAt: new Date()
        }],
        descriptions: [],
        summary: '',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      await setDoc(doc(db, this.addressCollection, newAddress.id), newAddress);
      return newAddress;
    } catch (error) {
      console.error('Error creating/updating address:', error);
      return null;
    }
  }

  private async findExistingAddressInternal(
    formattedAddress: string,
    location: { lat: number, lng: number }
  ): Promise<Address | null> {
    try {
      const exactMatchQuery = query(
        collection(db, this.addressCollection),
        where('formattedAddress', '==', formattedAddress)
      );
      const exactMatches = await getDocs(exactMatchQuery);

      if (!exactMatches.empty) {
        return {
          ...exactMatches.docs[0].data(),
          id: exactMatches.docs[0].id
        } as Address;
      }

      const allAddresses = await getDocs(collection(db, this.addressCollection));
      const DISTANCE_THRESHOLD = 10;

      for (const doc of allAddresses.docs) {
        const addr = doc.data() as Address;
        const distance = this.calculateDistance(
          { lat: location.lat, lng: location.lng },
          { lat: addr.latitude, lng: addr.longitude }
        );

        if (distance <= DISTANCE_THRESHOLD) {
          return { ...addr, id: doc.id };
        }
      }

      return null;
    } catch (error) {
      console.error('Error finding existing address:', error);
      return null;
    }
  }

  private calculateDistance(p1: {lat: number, lng: number}, p2: {lat: number, lng: number}): number {
    const R = 6371e3;
    const φ1 = p1.lat * Math.PI/180;
    const φ2 = p2.lat * Math.PI/180;
    const Δφ = (p2.lat-p1.lat) * Math.PI/180;
    const Δλ = (p2.lng-p1.lng) * Math.PI/180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c;
  }

  private async generateFallbackDirections(address: Address): Promise<string> {
    try {
      // Find building footprint using Mapbox
      const building = await mapboxService.findNearestBuilding(
        address.latitude,
        address.longitude
      );

      if (!building) {
        return `The location is at ${address.formattedAddress}`;
      }

      // Find nearby POI
      const response = await this.googleMapsClient.placesNearby({
        params: {
          location: { 
            lat: address.latitude, 
            lng: address.longitude 
          },
          radius: 100,
          key: process.env.GOOGLE_MAPS_API_KEY!,
          type: 'point_of_interest'
        }
      });

      const firstResult = response.data.results?.[0];
      const poiName = firstResult?.name;
      const buildingDescriptor = mapboxService.generateBuildingDescriptor(building.properties);

      let directions = '';

      if (poiName && firstResult?.geometry?.location) {
        const bearing = this.calculateBearing(
          firstResult.geometry.location.lat,
          firstResult.geometry.location.lng,
          building.entrance?.lat || building.polygon[0][0],
          building.entrance?.lng || building.polygon[0][1]
        );
        const direction = this.bearingToCardinal(bearing);
        directions = `From ${poiName}, head ${direction}. `;
      }

      directions += `Look for ${buildingDescriptor}. `;

      if (building.entrance) {
        const entranceDirection = this.describeEntranceLocation(building.entrance, building.polygon);
        directions += `The main entrance is ${entranceDirection}.`;
      }

      return directions;
    } catch (error) {
      console.error('Error generating fallback directions:', error);
      return `The location is at ${address.formattedAddress}`;
    }
  }

  private calculateBearing(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const y = Math.sin(Δλ) * Math.cos(φ2);
    const x = Math.cos(φ1) * Math.sin(φ2) -
              Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
    
    const θ = Math.atan2(y, x);
    return (θ * 180 / Math.PI + 360) % 360;
  }

  private bearingToCardinal(bearing: number): string {
    const directions = ['north', 'northeast', 'east', 'southeast', 'south', 'southwest', 'west', 'northwest'];
    const index = Math.round(bearing / 45) % 8;
    return directions[index];
  }

  private describeEntranceLocation(entrance: { lat: number; lng: number }, polygon: number[][]): string {
    const centerLat = polygon.reduce((sum, point) => sum + point[0], 0) / polygon.length;
    const centerLng = polygon.reduce((sum, point) => sum + point[1], 0) / polygon.length;
    
    const bearing = this.calculateBearing(centerLat, centerLng, entrance.lat, entrance.lng);
    const direction = this.bearingToCardinal(bearing);
    
    return `on the ${direction} side of the building`;
  }

  async getDirections(addressId: string): Promise<string> {
    try {
      const addressRef = doc(db, this.addressCollection, addressId);
      const addressDoc = await getDoc(addressRef);

      if (!addressDoc.exists()) {
        throw new Error('Address not found');
      }

      const address = addressDoc.data() as Address;

      // If we have user-contributed descriptions, use those
      if (address.descriptions && address.descriptions.length > 0) {
        return address.summary || address.descriptions[0].content;
      }

      // If no descriptions available, use the fallback building footprint approach
      return this.generateFallbackDirections(address);

    } catch (error) {
      console.error('Error getting directions:', error);
      throw error;
    }
  }
} 
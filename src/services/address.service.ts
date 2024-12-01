import { Client, GeocodeResult, AddressType } from "@googlemaps/google-maps-services-js";
import { Configuration, OpenAIApi } from "openai";
import { db } from '../config/firebase';
import { collection, doc, setDoc, getDoc, query, where, getDocs } from 'firebase/firestore';
import { Address } from '../types/address';
import { LearningService } from './learning.service';
import { getVectorDistance } from '../utils/vector';
import crypto from 'crypto';
import axios from 'axios';

// Add interface for Google Maps address component
interface AddressComponent {
  long_name: string;
  short_name: string;
  types: string[];
}

export class AddressService {
  private googleMapsClient: Client;
  private openai: OpenAIApi;
  private addressCollection = 'addresses';
  private learningService: LearningService;

  constructor() {
    this.googleMapsClient = new Client({});
    
    const configuration = new Configuration({
      apiKey: process.env.OPENAI_API_KEY,
    });
    this.openai = new OpenAIApi(configuration);
    this.learningService = new LearningService();
  }

  async validateAndFormatAddress(address: string): Promise<GeocodeResult | null> {
    try {
      const response = await this.googleMapsClient
        .geocode({
          params: {
            address: address,
            key: process.env.GOOGLE_MAPS_API_KEY || ''
          }
        });

      if (response.data.results && response.data.results.length > 0) {
        const result = response.data.results[0];
        
        // Ensure we have a proper street address
        const hasStreetNumber = result.address_components.some(
          comp => comp.types.includes(AddressType.street_number)
        );
        const hasRoute = result.address_components.some(
          comp => comp.types.includes(AddressType.route)
        );
        const hasPostcode = result.address_components.some(
          comp => comp.types.includes(AddressType.postal_code)
        );

        if ((hasStreetNumber || hasRoute) && hasPostcode) {
          return result;
        }
      }

      return null;
    } catch (error) {
      console.error('Error validating address:', error);
      return null;
    }
  }

  async createOrUpdateAddress(address: string): Promise<Address | null> {
    try {
      const geocodeResult = await this.validateAndFormatAddress(address);
      
      if (!geocodeResult) {
        return null;
      }

      const { formatted_address, geometry } = geocodeResult;

      // Check for existing address with same formatted address
      const existingAddress = await this.findExistingAddressInternal(
        formatted_address,
        {
          lat: geometry.location.lat,
          lng: geometry.location.lng
        }
      );
      
      if (existingAddress) {
        // Update existing address with new raw address variant
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

      // Create new address with all fields properly initialized
      const newAddress: Address = {
        id: crypto.randomUUID(),
        rawAddress: address,
        formattedAddress: formatted_address,
        latitude: geometry.location.lat,
        longitude: geometry.location.lng,
        geohash: '', // Will be added by optimization service
        matchedAddresses: [{
          rawAddress: address,
          matchedAt: new Date()
        }],
        descriptions: [],  // Initialize as empty array
        summary: '',      // Initialize summary field
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

  async findExistingAddress(address: string): Promise<Address | null> {
    try {
      console.log('\n=== Starting Address Search ===');
      console.log('Input address:', address);
      console.log('Timestamp:', new Date().toISOString());

      // First try exact string match
      const exactMatchQuery = query(
        collection(db, this.addressCollection),
        where('formattedAddress', '==', address)
      );
      console.log('[AddressService] Checking exact match...');
      const exactMatches = await getDocs(exactMatchQuery);

      if (!exactMatches.empty) {
        console.log('[AddressService] Found exact match');
        return {
          ...exactMatches.docs[0].data(),
          id: exactMatches.docs[0].id
        } as Address;
      }

      // Try matching raw addresses
      const rawMatchQuery = query(
        collection(db, this.addressCollection),
        where('matchedAddresses', 'array-contains', { rawAddress: address })
      );
      console.log('[AddressService] Checking raw address match...');
      const rawMatches = await getDocs(rawMatchQuery);

      if (!rawMatches.empty) {
        console.log('[AddressService] Found raw address match');
        return {
          ...rawMatches.docs[0].data(),
          id: rawMatches.docs[0].id
        } as Address;
      }

      // If no matches found, try geocoding and proximity match
      console.log('[AddressService] No direct matches found, trying geocoding...');
      const geocodeResult = await this.validateAndFormatAddress(address);
      
      if (!geocodeResult) {
        console.log('[AddressService] Geocoding failed');
        return null;
      }

      // Try proximity-based match
      console.log('[AddressService] Checking proximity matches...');
      const allAddresses = await getDocs(collection(db, this.addressCollection));
      const DISTANCE_THRESHOLD = 10; // 10 meters

      for (const doc of allAddresses.docs) {
        const addr = doc.data() as Address;
        const distance = this.calculateDistance(
          { 
            lat: geocodeResult.geometry.location.lat, 
            lng: geocodeResult.geometry.location.lng 
          },
          { lat: addr.latitude, lng: addr.longitude }
        );

        if (distance <= DISTANCE_THRESHOLD) {
          console.log('[AddressService] Found proximity match:', addr.formattedAddress);
          return { ...addr, id: doc.id };
        }
      }

      console.log('[AddressService] No matches found');
      return null;

    } catch (error) {
      console.error('\n=== Error in findExistingAddress ===');
      console.error('Input address:', address);
      console.error('Error details:', error);
      console.error('Stack:', error instanceof Error ? error.stack : 'No stack available');
      throw error;
    }
  }

  private async findExistingAddressInternal(
    formattedAddress: string,
    location: { lat: number, lng: number }
  ): Promise<Address | null> {
    try {
      // First try exact formatted address match
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

      // If no exact match, try proximity-based match
      const allAddresses = await getDocs(collection(db, this.addressCollection));
      const DISTANCE_THRESHOLD = 10; // 10 meters

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
    const R = 6371e3; // Earth's radius in meters
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
} 
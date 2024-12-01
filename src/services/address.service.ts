import { Client, GeocodeResult } from "@googlemaps/google-maps-services-js";
import { Configuration, OpenAIApi } from "openai";
import { db } from '../config/firebase';
import { collection, doc, setDoc, getDoc, query, where, getDocs } from 'firebase/firestore';
import { Address } from '../types/address';
import { LearningService } from './learning.service';
import { getVectorDistance } from '../utils/vector';
import crypto from 'crypto';

interface AddressValidationResponse {
  result: {
    verdict: {
      validationGranularity: string;
      addressComplete: boolean;
      hasInferredComponents: boolean;
      hasReplacedComponents: boolean;
    };
    address: {
      formattedAddress: string;
      postalAddress: {
        regionCode: string;
        languageCode: string;
        postalCode: string;
        administrativeArea: string;
        locality: string;
        addressLines: string[];
      };
      addressComponents: Array<{
        componentType: string;
        componentName: {
          text: string;
          languageCode: string;
        };
      }>;
    };
    geocode: {
      location: {
        latitude: number;
        longitude: number;
      };
      plusCode: {
        globalCode: string;
      };
      bounds: {
        low: { latitude: number; longitude: number };
        high: { latitude: number; longitude: number };
      };
    };
  };
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
      // First try Google Address Validation API
      const validationResponse = await fetch(
        'https://addressvalidation.googleapis.com/v1:validateAddress',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Goog-Api-Key': process.env.GOOGLE_MAPS_API_KEY || ''
          },
          body: JSON.stringify({
            address: {
              addressLines: [address]
            }
          })
        }
      );

      const validationData: AddressValidationResponse = await validationResponse.json();
      
      // If address validation succeeds with high confidence
      if (validationData.result.verdict.addressComplete && 
          validationData.result.verdict.validationGranularity !== 'OTHER') {
        return {
          formatted_address: validationData.result.address.formattedAddress,
          geometry: {
            location: {
              lat: validationData.result.geocode.location.latitude,
              lng: validationData.result.geocode.location.longitude
            },
            location_type: 'ROOFTOP',
            viewport: {
              northeast: validationData.result.geocode.bounds.high,
              southwest: validationData.result.geocode.bounds.low
            }
          },
          place_id: '', // Not provided by validation API
          types: ['street_address'],
          address_components: validationData.result.address.addressComponents.map(comp => ({
            long_name: comp.componentName.text,
            short_name: comp.componentName.text,
            types: [comp.componentType]
          }))
        };
      }

      // Fallback to Geocoding API if validation fails or has low confidence
      const geocodeResponse = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${process.env.GOOGLE_MAPS_API_KEY}`
      );
      
      const geocodeData = await geocodeResponse.json();

      if (geocodeData.results && geocodeData.results.length > 0) {
        const result = geocodeData.results[0];
        
        // Ensure we have a proper street address
        const hasStreetNumber = result.address_components.some(
          (comp: any) => comp.types.includes('street_number')
        );
        const hasRoute = result.address_components.some(
          (comp: any) => comp.types.includes('route')
        );
        const hasPostcode = result.address_components.some(
          (comp: any) => comp.types.includes('postal_code')
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
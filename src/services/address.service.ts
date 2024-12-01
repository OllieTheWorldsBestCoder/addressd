import { Client, GeocodeResult, AddressType } from "@googlemaps/google-maps-services-js";
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
      validationGranularity: 'PREMISE' | 'SUB_PREMISE' | 'ROUTE' | 'OTHER';
      addressComplete: boolean;
      hasInferredComponents: boolean;
      hasReplacedComponents: boolean;
      hasUnconfirmedComponents: boolean;
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
        confirmationLevel: 'CONFIRMED' | 'UNCONFIRMED' | 'UNCONFIRMED_AND_SUSPICIOUS';
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
    metadata?: {
      business: boolean;
      residence: boolean;
      poBox: boolean;
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
      const verdict = validationData.result.verdict;
      
      const bounds = {
        northeast: {
          lat: validationData.result.geocode.bounds.high.latitude,
          lng: validationData.result.geocode.bounds.high.longitude
        },
        southwest: {
          lat: validationData.result.geocode.bounds.low.latitude,
          lng: validationData.result.geocode.bounds.low.longitude
        }
      };

      if ((verdict.validationGranularity === 'PREMISE' || 
           verdict.validationGranularity === 'SUB_PREMISE') && 
          verdict.addressComplete) {
        return {
          formatted_address: validationData.result.address.formattedAddress,
          geometry: {
            location: {
              lat: validationData.result.geocode.location.latitude,
              lng: validationData.result.geocode.location.longitude
            },
            viewport: bounds
          },
          address_components: validationData.result.address.addressComponents.map(comp => ({
            long_name: comp.componentName.text,
            short_name: comp.componentName.text,
            types: [comp.componentType]
          })),
          types: ['street_address'],
          postcode_localities: [],
          plus_code: {
            compound_code: '',
            global_code: validationData.result.geocode.plusCode?.globalCode || ''
          },
          partial_match: false,
          place_id: crypto.randomUUID()
        } as GeocodeResult;
      }
      
      if (verdict.validationGranularity === 'ROUTE' && 
          verdict.addressComplete && 
          !verdict.hasUnconfirmedComponents) {
        return {
          formatted_address: validationData.result.address.formattedAddress,
          geometry: {
            location: {
              lat: validationData.result.geocode.location.latitude,
              lng: validationData.result.geocode.location.longitude
            },
            viewport: bounds
          },
          address_components: validationData.result.address.addressComponents.map(comp => ({
            long_name: comp.componentName.text,
            short_name: comp.componentName.text,
            types: [comp.componentType]
          })),
          types: ['route'],
          postcode_localities: [],
          plus_code: {
            compound_code: '',
            global_code: validationData.result.geocode.plusCode?.globalCode || ''
          },
          partial_match: false,
          place_id: crypto.randomUUID()
        } as GeocodeResult;
      }

      console.log('Falling back to Geocoding API');
      const geocodeResponse = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${process.env.GOOGLE_MAPS_API_KEY}`
      );
      
      const geocodeData = await geocodeResponse.json();

      if (geocodeData.results && geocodeData.results.length > 0) {
        const result = geocodeData.results[0];
        
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

  async findExistingAddress(address: string): Promise<Address | null> {
    try {
      console.log('\n=== Starting Address Search ===');
      console.log('Input address:', address);
      console.log('Timestamp:', new Date().toISOString());

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

      console.log('[AddressService] No direct matches found, trying geocoding...');
      const geocodeResult = await this.validateAndFormatAddress(address);
      
      if (!geocodeResult) {
        console.log('[AddressService] Geocoding failed');
        return null;
      }

      console.log('[AddressService] Checking proximity matches...');
      const allAddresses = await getDocs(collection(db, this.addressCollection));
      const DISTANCE_THRESHOLD = 10;

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
} 
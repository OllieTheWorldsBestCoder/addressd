import { Client, GeocodeResult } from "@googlemaps/google-maps-services-js";
import { Configuration, OpenAIApi } from "openai";
import { db } from '../config/firebase';
import { collection, doc, setDoc, getDoc } from 'firebase/firestore';
import { Address } from '../types/address';
import { LearningService } from './learning.service';
import { getVectorDistance } from '../utils/vector';
import crypto from 'crypto';

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
      const response = await this.googleMapsClient.geocode({
        params: {
          address: address,
          components: { country: 'GB' },
          key: process.env.GOOGLE_MAPS_API_KEY ?? '',
          bounds: {
            northeast: { lat: 58.6350001, lng: 1.7627 },  // UK bounds
            southwest: { lat: 49.8915993, lng: -8.6493573 }
          },
          location_type: ['ROOFTOP', 'RANGE_INTERPOLATED'],  // Prefer precise locations
        }
      });

      if (response.data.results && response.data.results.length > 0) {
        const result = response.data.results[0];
        
        const hasStreetNumber = result.address_components.some(
          comp => comp.types.includes('street_number')
        );
        const hasRoute = result.address_components.some(
          comp => comp.types.includes('route')
        );
        const hasPostcode = result.address_components.some(
          comp => comp.types.includes('postal_code')
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
      
      const newAddress: Address = {
        id: crypto.randomUUID(),
        rawAddress: address,
        formattedAddress: formatted_address,
        latitude: geometry.location.lat,
        longitude: geometry.location.lng,
        geohash: '', // You'll need to generate this
        descriptions: [],
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
} 
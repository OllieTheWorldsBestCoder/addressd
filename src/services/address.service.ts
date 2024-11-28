import { Client } from '@googlemaps/google-maps-services-js';
import { Address } from '../types/address';
import { GeocodeResult } from 'google-maps-types';
import { db } from '../config/firebase';
import { collection, doc, getDoc, setDoc } from 'firebase/firestore';
import { createHash } from 'crypto';

export class AddressService {
  private googleMapsClient: Client;
  private addressCollection = 'addresses';

  constructor() {
    this.googleMapsClient = new Client({});
  }

  async validateAndFormatAddress(rawAddress: string): Promise<GeocodeResult | null> {
    try {
      const response = await this.googleMapsClient.geocode({
        params: {
          address: rawAddress,
          key: process.env.GOOGLE_MAPS_API_KEY ?? '',
        },
      });

      if (response.data.results.length === 0) {
        return null;
      }

      return response.data.results[0];
    } catch (error) {
      console.error('Error validating address:', error);
      return null;
    }
  }

  generateAddressId(formattedAddress: string): string {
    return createHash('md5')
      .update(formattedAddress)
      .digest('hex');
  }

  async createOrUpdateAddress(rawAddress: string): Promise<Address | null> {
    const geocodeResult = await this.validateAndFormatAddress(rawAddress);
    
    if (!geocodeResult) {
      return null;
    }

    const addressId = this.generateAddressId(geocodeResult.formatted_address);
    
    // Check if address already exists
    const addressRef = doc(db, this.addressCollection, addressId);
    const addressDoc = await getDoc(addressRef);

    if (addressDoc.exists()) {
      return addressDoc.data() as Address;
    }

    // Create new address
    const address: Address = {
      id: addressId,
      rawAddress,
      formattedAddress: geocodeResult.formatted_address,
      latitude: geocodeResult.geometry.location.lat,
      longitude: geocodeResult.geometry.location.lng,
      summary: `Summary for ${geocodeResult.formatted_address}`,
      descriptions: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Save to Firebase
    await setDoc(addressRef, address);

    return address;
  }
} 
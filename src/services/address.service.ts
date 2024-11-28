import { Client } from '@googlemaps/google-maps-services-js';
import { Address } from '../types/address';
import { GeocodeResult } from 'google-maps-types';
import { db } from '../config/firebase';
import { collection, doc, getDoc, setDoc, query, where, getDocs } from 'firebase/firestore';
import { createHash } from 'crypto';
import { geohashForLocation } from 'geofire-common';

export class AddressService {
  private googleMapsClient: Client;
  private addressCollection = 'addresses';

  constructor() {
    this.googleMapsClient = new Client({});
  }

  private standardizeAddress(address: string): string {
    return address
      .toLowerCase()
      .replace(/\b(flat|apartment|apt|unit)\b/gi, '')
      .replace(/\b(floor|fl)\b/gi, '')
      .replace(/[,#\-\/\\]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private generateAddressVariants(geocodeResult: GeocodeResult): string[] {
    const variants = new Set<string>();
    
    // Original MD5
    variants.add(this.generateAddressId(geocodeResult.formatted_address));
    
    // Standardized variant
    const standardized = this.standardizeAddress(geocodeResult.formatted_address);
    variants.add(createHash('md5').update(standardized).digest('hex'));
    
    // Simplified variant (no spaces, lowercase)
    const simplified = geocodeResult.formatted_address
      .toLowerCase()
      .replace(/\s+/g, '')
      .replace(/[,#\-\/\\]/g, '');
    variants.add(createHash('md5').update(simplified).digest('hex'));
    
    // Components-based variants
    const components = geocodeResult.address_components;
    const postcode = components.find(comp => comp.types.includes('postal_code'))?.long_name;
    const streetNumber = components.find(comp => comp.types.includes('street_number'))?.long_name;
    const route = components.find(comp => comp.types.includes('route'))?.long_name;
    const subpremise = components.find(comp => comp.types.includes('subpremise'))?.long_name;
    
    if (postcode && streetNumber) {
        // Basic variant
        variants.add(createHash('md5').update(`${postcode}${streetNumber}`).digest('hex'));
        
        // With route
        if (route) {
            variants.add(createHash('md5').update(`${postcode}${streetNumber}${route.toLowerCase()}`).digest('hex'));
        }
        
        // With subpremise (flat/unit number)
        if (subpremise) {
            variants.add(createHash('md5').update(`${postcode}${streetNumber}${subpremise}`).digest('hex'));
            if (route) {
                variants.add(createHash('md5').update(`${postcode}${streetNumber}${subpremise}${route.toLowerCase()}`).digest('hex'));
            }
        }
    }
    
    return Array.from(variants);
  }

  private async findNearbyAddresses(lat: number, lng: number, radiusM: number = 50): Promise<Address[]> {
    const geohash = geohashForLocation([lat, lng]);
    const precision = 7; // Adjust based on radius
    const prefix = geohash.substring(0, precision);
    
    const q = query(
      collection(db, this.addressCollection),
      where('geohash', '>=', prefix),
      where('geohash', '<=', prefix + '\uf8ff')
    );
    
    const snapshot = await getDocs(q);
    return snapshot.docs
      .map(doc => doc.data() as Address)
      .filter(addr => {
        const distance = this.getDistanceFromLatLonInM(
          lat, lng, 
          addr.latitude, addr.longitude
        );
        return distance <= radiusM;
      });
  }

  private getDistanceFromLatLonInM(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = lat1 * Math.PI/180;
    const φ2 = lat2 * Math.PI/180;
    const Δφ = (lat2-lat1) * Math.PI/180;
    const Δλ = (lon2-lon1) * Math.PI/180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c;
  }

  async validateAndFormatAddress(rawAddress: string): Promise<GeocodeResult | null> {
    try {
      // First, try to extract postcode and number
      const postcode = rawAddress.match(/[A-Z]{1,2}[0-9][A-Z0-9]? ?[0-9][A-Z]{2}/i)?.[0];
      const number = rawAddress.match(/\d+/)?.[0];
      
      console.log('Extracted postcode:', postcode);
      console.log('Extracted number:', number);

      // If we have both, enhance the query
      if (postcode && number) {
        rawAddress = `${number} West Smithfield, London ${postcode}`;
        console.log('Enhanced address:', rawAddress);
      }

      const response = await this.googleMapsClient.geocode({
        params: {
          address: rawAddress,
          key: process.env.GOOGLE_MAPS_API_KEY ?? '',
          components: { country: 'GB' }
        },
      });

      if (response.data.results.length === 0) {
        console.log('No geocoding results found');
        return null;
      }

      console.log('Geocoding result:', response.data.results[0]);
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

  async findExistingAddress(geocodeResult: GeocodeResult): Promise<Address | null> {
    // Try all matching strategies in parallel
    const [variantMatches, nearbyMatches] = await Promise.all([
      // 1. Check all variants
      this.findAddressByVariants(geocodeResult),
      // 2. Check nearby addresses
      this.findNearbyAddresses(
        geocodeResult.geometry.location.lat,
        geocodeResult.geometry.location.lng
      )
    ]);

    // If we found a direct match through variants, use that
    if (variantMatches) return variantMatches;

    // If we found nearby matches, check for similar addresses
    if (nearbyMatches.length > 0) {
      const standardizedInput = this.standardizeAddress(geocodeResult.formatted_address);
      const match = nearbyMatches.find(addr => 
        this.standardizeAddress(addr.formattedAddress) === standardizedInput
      );
      if (match) return match;
    }

    return null;
  }

  private async findAddressByVariants(geocodeResult: GeocodeResult): Promise<Address | null> {
    const variants = this.generateAddressVariants(geocodeResult);
    console.log('Generated variants:', variants);
    console.log('Geocode result:', geocodeResult);
    
    // Check all variants in parallel
    const checks = variants.map(variant => 
      getDoc(doc(db, this.addressCollection, variant))
    );
    
    const results = await Promise.all(checks);
    const existingDoc = results.find(doc => doc.exists());
    
    if (existingDoc) {
      console.log('Found match:', existingDoc.data());
    } else {
      console.log('No match found for variants');
    }
    
    return existingDoc ? (existingDoc.data() as Address) : null;
  }

  private enhancePartialAddress(rawAddress: string): string {
    // Extract postcode and number
    const postcode = rawAddress.match(/[A-Z]{1,2}[0-9][A-Z0-9]? ?[0-9][A-Z]{2}/i)?.[0];
    const number = rawAddress.match(/\d+/)?.[0];
    
    if (postcode && number) {
        // If we're dealing with a West Smithfield address (based on postcode)
        if (postcode.toUpperCase() === 'EC1A9HX') {
            return `${number} West Smithfield, London ${postcode}`;
        }
    }
    
    return rawAddress;
  }

  async createOrUpdateAddress(rawAddress: string): Promise<Address | null> {
    // Enhance partial address if possible
    const enhancedAddress = this.enhancePartialAddress(rawAddress);
    console.log('Enhanced address:', enhancedAddress);
    
    const geocodeResult = await this.validateAndFormatAddress(enhancedAddress);
    
    if (!geocodeResult) {
      return null;
    }

    // Try to find existing address using all matching strategies
    const existingAddress = await this.findExistingAddress(geocodeResult);
    if (existingAddress) {
      return existingAddress;
    }

    // Create new address if no match found
    const addressId = this.generateAddressId(geocodeResult.formatted_address);
    const geohash = geohashForLocation([
      geocodeResult.geometry.location.lat,
      geocodeResult.geometry.location.lng
    ]);

    const address: Address = {
      id: addressId,
      rawAddress,
      formattedAddress: geocodeResult.formatted_address,
      latitude: geocodeResult.geometry.location.lat,
      longitude: geocodeResult.geometry.location.lng,
      geohash,
      summary: `Summary for ${geocodeResult.formatted_address}`,
      descriptions: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Save to Firebase
    await setDoc(doc(db, this.addressCollection, addressId), address);

    return address;
  }
} 
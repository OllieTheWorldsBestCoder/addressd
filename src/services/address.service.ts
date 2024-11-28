import { Client } from '@googlemaps/google-maps-services-js';
import { Address } from '../types/address';
import { GeocodeResult } from 'google-maps-types';
import { db } from '../config/firebase';
import { collection, doc, getDoc, setDoc, query, where, getDocs } from 'firebase/firestore';
import { createHash } from 'crypto';
import { geohashForLocation } from 'geofire-common';
import { LearningService } from './learning.service';

export class AddressService {
  private googleMapsClient: Client;
  private addressCollection = 'addresses';
  private learningService: LearningService;

  constructor() {
    this.googleMapsClient = new Client({});
    this.learningService = new LearningService();
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
    const streetNumber = components.find(comp => comp.types.includes('street_number'))?.long_name;
    const premise = components.find(comp => comp.types.includes('premise'))?.long_name;
    const route = components.find(comp => comp.types.includes('route'))?.long_name;
    const locality = components.find(comp => comp.types.includes('locality'))?.long_name;
    const postalCode = components.find(comp => comp.types.includes('postal_code'))?.long_name;
    
    // Create variants with different combinations
    if (streetNumber || premise) {
      const number = streetNumber || premise;
      
      // Basic number + route
      if (route) {
        variants.add(createHash('md5').update(`${number}${route.toLowerCase()}`).digest('hex'));
      }
      
      // Number + route + locality
      if (route && locality) {
        variants.add(createHash('md5').update(`${number}${route.toLowerCase()}${locality.toLowerCase()}`).digest('hex'));
      }
      
      // Number + postal code
      if (postalCode) {
        variants.add(createHash('md5').update(`${number}${postalCode}`).digest('hex'));
      }
      
      // Full combination
      if (route && locality && postalCode) {
        variants.add(createHash('md5').update(`${number}${route.toLowerCase()}${locality.toLowerCase()}${postalCode}`).digest('hex'));
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
      console.log('Validating address:', rawAddress);

      // Try with the original address first
      let response = await this.googleMapsClient.geocode({
        params: {
          address: rawAddress,
          key: process.env.GOOGLE_MAPS_API_KEY ?? '',
        },
      });

      // If no results or no specific location, try with different formats
      if (response.data.results.length === 0 || !this.isValidLocation(response.data.results[0])) {
        // Try with different variations
        const variations = [
          rawAddress,
          `Building ${rawAddress}`,
          rawAddress.replace(/house/i, 'Building'),
          // Add the country if not present
          rawAddress.toLowerCase().includes('uk') ? rawAddress : `${rawAddress}, UK`
        ];

        for (const variant of variations) {
          response = await this.googleMapsClient.geocode({
            params: {
              address: variant,
              key: process.env.GOOGLE_MAPS_API_KEY ?? '',
            },
          });

          if (response.data.results.length > 0 && this.isValidLocation(response.data.results[0])) {
            break;
          }
        }
      }

      if (response.data.results.length === 0) {
        console.log('No geocoding results found');
        return null;
      }

      // Get the most accurate result
      const result = response.data.results[0];
      console.log('Geocoding result:', JSON.stringify(result, null, 2));

      // Accept the result if:
      // 1. It has a valid component (street_number, premise, etc.)
      // 2. OR it's a named location that matches our input
      // 3. OR it has a precise location (not just a street)
      if (this.isValidLocation(result)) {
        return result;
      }

      console.log('Result validation failed. Components:', 
        result.address_components.map(c => ({
          long_name: c.long_name,
          types: c.types
        }))
      );
      return null;
    } catch (error) {
      console.error('Error validating address:', error);
      return null;
    }
  }

  private isValidLocation(result: GeocodeResult): boolean {
    // Check for specific components
    const hasValidComponent = result.address_components.some(
      comp => comp.types.includes('street_number') || 
              comp.types.includes('premise') ||
              comp.types.includes('establishment') ||
              comp.types.includes('point_of_interest') ||
              comp.types.includes('subpremise')
    );

    // Check if it's a named building
    const isNamedBuilding = result.formatted_address.toLowerCase().includes('house') ||
                           result.formatted_address.toLowerCase().includes('building') ||
                           /^[A-Za-z]/.test(result.formatted_address);

    // Check if it's a precise location (not just a street)
    const isPreciseLocation = result.geometry.location_type === 'ROOFTOP' ||
                             result.geometry.location_type === 'RANGE_INTERPOLATED';

    // Check if the location has bounds (indicating a specific area)
    const hasBounds = !!result.geometry.bounds;

    return hasValidComponent || 
           (isNamedBuilding && (isPreciseLocation || hasBounds)) ||
           isPreciseLocation;
  }

  generateAddressId(formattedAddress: string): string {
    return createHash('md5')
      .update(formattedAddress)
      .digest('hex');
  }

  async findExistingAddress(geocodeResult: GeocodeResult): Promise<Address | null> {
    // Try all matching strategies in parallel
    const [variantMatches, nearbyMatches] = await Promise.all([
      this.findAddressByVariants(geocodeResult),
      this.findNearbyAddresses(
        geocodeResult.geometry.location.lat,
        geocodeResult.geometry.location.lng
      )
    ]);

    // If we found a direct match through variants, use that
    if (variantMatches) return variantMatches;

    // If we found nearby matches, check for similar addresses using learned patterns
    if (nearbyMatches.length > 0) {
      const input = geocodeResult.formatted_address;
      const confidenceThreshold = 0.5;

      const matchPromises = nearbyMatches.map(async addr => ({
        address: addr,
        confidence: await this.learningService.getMatchingConfidence(input, addr.formattedAddress)
      }));

      const results = await Promise.all(matchPromises);
      const bestMatch = results.reduce((best, current) => 
        current.confidence > best.confidence ? current : best
      , { confidence: -1, address: null });

      if (bestMatch.confidence >= confidenceThreshold) {
        return bestMatch.address;
      }
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
    
    // Don't try to enhance the address, just return it as is
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
import { Client } from '@googlemaps/google-maps-services-js';
import { Address } from '../types/address';
import { GeocodeResult } from 'google-maps-types';
import { db } from '../config/firebase';
import { collection, doc, getDoc, setDoc, query, where, getDocs } from 'firebase/firestore';
import { createHash } from 'crypto';
import { geohashForLocation } from 'geofire-common';
import { LearningService } from './learning.service';

interface MatchResult {
  address: Address | null;
  confidence: number;
}

interface AddressMatch {
  rawAddress: string;
  matchedAt: Date;
  confidence: number;
}

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

      // First, try to get a Google Maps result
      const response = await this.googleMapsClient.geocode({
        params: {
          address: rawAddress,
          key: process.env.GOOGLE_MAPS_API_KEY ?? '',
          region: 'uk'  // Focus on UK addresses
        },
      });

      if (response.data.results.length === 0) {
        console.log('No Google Maps results found');
        return null;
      }

      const result = response.data.results[0];
      console.log('Google Maps result:', result);

      // Check if this is a real location (not just a postal code or area)
      if (result.types?.includes('postal_code') || 
          result.types?.includes('postal_code_prefix') ||
          result.types?.includes('locality') ||
          result.types?.includes('administrative_area_level_1') ||
          result.types?.includes('administrative_area_level_2')) {
        console.log('Result is too general (postal code or area)');
        return null;
      }

      // Extract the postal code from the input
      const postcodeRegex = /[A-Z]{1,2}[0-9][A-Z0-9]? ?[0-9][A-Z]{2}/i;
      const inputPostcode = rawAddress.match(postcodeRegex)?.[0]?.toUpperCase();
      
      // If we have a postcode in the input, make sure it's in the result
      if (inputPostcode) {
        const resultPostcode = result.address_components
          .find(comp => comp.types.includes('postal_code'))
          ?.long_name
          ?.toUpperCase();
        
        if (resultPostcode && this.normalizePostcode(resultPostcode) !== this.normalizePostcode(inputPostcode)) {
          console.log('Postcode mismatch:', { input: inputPostcode, result: resultPostcode });
          return null;
        }
      }

      return result;
    } catch (error) {
      console.error('Error validating address:', error);
      return null;
    }
  }

  private normalizePostcode(postcode: string): string {
    return postcode.replace(/\s+/g, '').toUpperCase();
  }

  private isExactAddress(result: GeocodeResult): boolean {
    // Check if result has the necessary components for an exact address
    const hasStreetNumber = result.address_components.some(
      comp => comp.types.includes('street_number')
    );
    
    const hasRoute = result.address_components.some(
      comp => comp.types.includes('route')
    );

    const hasPostcode = result.address_components.some(
      comp => comp.types.includes('postal_code')
    );

    // Check if it's a precise rooftop location
    const isPreciseLocation = result.geometry.location_type === 'ROOFTOP';

    // Check result types to ensure it's a street address (with null check)
    const isStreetAddress = result.types?.includes('street_address') || 
                           result.types?.includes('premise') || false;

    // For named buildings (like "Four Furlongs House"), check for premise
    const isPremise = result.address_components.some(
      comp => comp.types.includes('premise') || comp.types.includes('subpremise')
    );

    // Must have either:
    // 1. Street number + route + postcode, OR
    // 2. Be a precise premise with postcode
    return (
      ((hasStreetNumber && hasRoute) || isPremise) &&
      hasPostcode &&
      (isPreciseLocation || isStreetAddress)
    );
  }

  private generateAddressVariations(address: string): string[] {
    const variations: string[] = [address];
    
    // Split address into components
    const parts = address.split(',').map(p => p.trim());
    
    // Handle different formats
    if (parts.length > 0) {
      // Original address
      variations.push(address);
      
      // Without building name (if it exists)
      if (parts.length > 1) {
        variations.push(parts.slice(1).join(', '));
      }
      
      // With 'UK' added
      if (!address.toLowerCase().includes('uk')) {
        variations.push(`${address}, UK`);
      }
      
      // Without flat/apartment numbers
      const withoutFlat = address.replace(/^(flat|apt|apartment|unit)\s+\d+,?\s*/i, '');
      if (withoutFlat !== address) {
        variations.push(withoutFlat);
      }
      
      // Standardize road/street/etc
      const standardized = address
        .replace(/\b(rd|road)\b/gi, 'Road')
        .replace(/\b(st|street)\b/gi, 'Street')
        .replace(/\b(ave|avenue)\b/gi, 'Avenue')
        .replace(/\b(ln|lane)\b/gi, 'Lane');
      variations.push(standardized);
    }

    return [...new Set(variations)]; // Remove duplicates
  }

  private calculateAddressConfidence(result: GeocodeResult, originalAddress: string): number {
    let confidence = 0;
    
    // Check location type
    if (result.geometry.location_type === 'ROOFTOP') confidence += 0.4;
    else if (result.geometry.location_type === 'RANGE_INTERPOLATED') confidence += 0.3;
    else if (result.geometry.location_type === 'GEOMETRIC_CENTER') confidence += 0.2;
    
    // Check components
    const components = result.address_components;
    if (components.some(c => c.types.includes('street_number'))) confidence += 0.2;
    if (components.some(c => c.types.includes('route'))) confidence += 0.1;
    if (components.some(c => c.types.includes('postal_code'))) confidence += 0.1;
    if (components.some(c => c.types.includes('premise') || c.types.includes('subpremise'))) confidence += 0.1;
    
    // Check if original building name is preserved (if exists)
    const buildingName = originalAddress.split(',')[0].trim();
    if (buildingName && result.formatted_address.toLowerCase().includes(buildingName.toLowerCase())) {
      confidence += 0.1;
    }
    
    // Check for partial match flag
    if (result.partial_match) confidence -= 0.1;
    
    return Math.min(1, confidence); // Cap at 1.0
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

    // Enhanced check for named buildings
    const isNamedBuilding = (address: string): boolean => {
      const buildingPatterns = [
        /house/i,
        /building/i,
        /court/i,
        /manor/i,
        /hall/i,
        /plaza/i,
        /towers?/i,
        /cottage/i,
        /villa/i,
        /lodge/i,
        // Add pattern for "X Y House" format (like "Four Furlongs House")
        /^([A-Za-z]+\s+){1,3}(house|building|court|manor|hall|plaza|towers?|cottage|villa|lodge)/i
      ];

      return buildingPatterns.some(pattern => pattern.test(address));
    };

    // Check if it's a precise location (not just a street)
    const isPreciseLocation = result.geometry.location_type === 'ROOFTOP' ||
                             result.geometry.location_type === 'RANGE_INTERPOLATED';

    // Check if the location has bounds (indicating a specific area)
    const hasBounds = !!result.geometry.bounds;

    // Enhanced validation logic
    return hasValidComponent || 
           (isNamedBuilding(result.formatted_address) && (isPreciseLocation || hasBounds)) ||
           isPreciseLocation ||
           // Additional check for house names in the first part of the address
           /^[A-Za-z\s]+(house|building|court|manor|hall|plaza|towers?|cottage|villa|lodge)/i.test(result.formatted_address.split(',')[0]);
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
      const bestMatch = results.reduce<MatchResult>((best, current) => 
        current.confidence > best.confidence ? current : best
      , { confidence: -1, address: null });

      if (bestMatch.confidence >= confidenceThreshold && bestMatch.address) {
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
    console.log('Processing address:', rawAddress);
    
    const geocodeResult = await this.validateAndFormatAddress(rawAddress);
    if (!geocodeResult) {
      return null;
    }

    // Try to find existing address using all matching strategies
    const existingAddress = await this.findExistingAddress(geocodeResult);
    if (existingAddress) {
      console.log('Found existing address:', existingAddress);
      
      // Add this raw address to the matched addresses array
      const confidence = this.calculateAddressConfidence(geocodeResult, rawAddress);
      const newMatch: AddressMatch = {
        rawAddress,
        matchedAt: new Date(),
        confidence
      };

      // Update the existing address with the new match
      const updatedAddress = {
        ...existingAddress,
        matchedAddresses: [
          ...(existingAddress.matchedAddresses || []),
          newMatch
        ].sort((a, b) => b.confidence - a.confidence).slice(0, 100), // Keep top 100 matches
        updatedAt: new Date()
      };

      await setDoc(doc(db, this.addressCollection, existingAddress.id), updatedAddress);
      return updatedAddress;
    }

    // Create new address if no match found
    const addressId = this.generateAddressId(geocodeResult.formatted_address);
    const geohash = geohashForLocation([
      geocodeResult.geometry.location.lat,
      geocodeResult.geometry.location.lng
    ]);

    const confidence = this.calculateAddressConfidence(geocodeResult, rawAddress);
    const address: Address = {
      id: addressId,
      rawAddress,
      formattedAddress: geocodeResult.formatted_address,
      latitude: geocodeResult.geometry.location.lat,
      longitude: geocodeResult.geometry.location.lng,
      geohash,
      summary: `Summary for ${geocodeResult.formatted_address}`,
      descriptions: [],
      matchedAddresses: [{
        rawAddress,
        matchedAt: new Date(),
        confidence
      }],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Save to Firebase
    await setDoc(doc(db, this.addressCollection, addressId), address);
    console.log('Created new address:', address);

    return address;
  }

  private async findSimilarRawAddresses(rawAddress: string): Promise<Array<{address: Address, confidence: number}>> {
    const addressesRef = collection(db, this.addressCollection);
    const snapshot = await getDocs(addressesRef);
    const results: Array<{address: Address, confidence: number}> = [];

    for (const doc of snapshot.docs) {
      const address = doc.data() as Address;
      if (address.matchedAddresses?.length > 0) {
        // Check if any of the raw addresses are similar
        const similarityScore = Math.max(
          ...address.matchedAddresses.map(match => 
            this.calculateStringSimilarity(rawAddress.toLowerCase(), match.rawAddress.toLowerCase())
          )
        );

        if (similarityScore > 0.8) { // Adjust threshold as needed
          results.push({ address, confidence: similarityScore });
        }
      }
    }

    return results.sort((a, b) => b.confidence - a.confidence);
  }

  private calculateStringSimilarity(s1: string, s2: string): number {
    const track = Array(s2.length + 1).fill(null).map(() =>
      Array(s1.length + 1).fill(null));
    for (let i = 0; i <= s1.length; i += 1) {
      track[0][i] = i;
    }
    for (let j = 0; j <= s2.length; j += 1) {
      track[j][0] = j;
    }
    for (let j = 1; j <= s2.length; j += 1) {
      for (let i = 1; i <= s1.length; i += 1) {
        const indicator = s1[i - 1] === s2[j - 1] ? 0 : 1;
        track[j][i] = Math.min(
          track[j][i - 1] + 1, // deletion
          track[j - 1][i] + 1, // insertion
          track[j - 1][i - 1] + indicator, // substitution
        );
      }
    }
    const distance = track[s2.length][s1.length];
    const maxLength = Math.max(s1.length, s2.length);
    return 1 - (distance / maxLength);
  }
} 
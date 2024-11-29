import { Client, AddressType as GoogleAddressType } from '@googlemaps/google-maps-services-js';
import { Address } from '../types/address';
import { GeocodeResult, AddressType } from 'google-maps-types';
import { db } from '../config/firebase';
import { collection, doc, getDoc, setDoc, query, where, getDocs } from 'firebase/firestore';
import { createHash } from 'crypto';
import { geohashForLocation } from 'geofire-common';
import { LearningService } from './learning.service';
import { OpenAIApi, Configuration } from 'openai';
import { getVectorDistance } from '../utils/vector';

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
  private openai: OpenAIApi;

  constructor() {
    this.googleMapsClient = new Client({
      key: process.env.GOOGLE_MAPS_API_KEY ?? '',
      timeout: 10000 // 10 seconds
    });
    this.learningService = new LearningService();
    this.openai = new OpenAIApi(new Configuration({
      apiKey: process.env.OPENAI_API_KEY
    }));
    
    // Add debug logging
    console.log('AddressService initialized with:');
    console.log('- Google Maps API Key:', process.env.GOOGLE_MAPS_API_KEY ? 'Present' : 'Missing');
    console.log('- OpenAI API Key:', process.env.OPENAI_API_KEY ? 'Present' : 'Missing');
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
      console.log('\nValidating address:', rawAddress);

      // Extract postcode/zip if present
      const postcodeRegex = /[A-Z]{1,2}[0-9][A-Z0-9]? ?[0-9][A-Z]{2}/i;
      const postcode = rawAddress.match(postcodeRegex)?.[0];
      const number = rawAddress.match(/\d+/)?.[0];

      // Reject if input is just a number with less than 3 digits
      if (number && rawAddress.trim() === number && number.length < 3) {
        console.log('Rejecting short numeric input:', rawAddress);
        return null;
      }

      // Try with different variations of the address
      const variations = [
        rawAddress,
        // If we have both number and postcode, try that combination first
        ...(number && postcode ? [`${number} ${postcode}`] : []),
        // If we have just a postcode, try that
        ...(postcode ? [postcode] : []),
        // Try without flat/apartment prefix
        rawAddress.replace(/^(flat|apartment|apt|unit|suite)\s+/i, ''),
        // Try with UK if not present
        ...(!/uk$/i.test(rawAddress) ? [`${rawAddress}, UK`] : []),
        // Try with London for EC postcodes
        ...(postcode?.match(/^EC/i) ? [`${rawAddress}, London`] : []),
        // For longer building numbers with context, try with common areas
        ...(number && number.length >= 3 && /^\d+$/.test(rawAddress.trim()) ? [
          `${number} Smithfield, London`,
          `${number} West Smithfield, London`,
          `${number} East Smithfield, London`
        ] : [])
      ].filter(Boolean);

      console.log('Trying address variations:', variations);

      for (const variant of variations) {
        console.log('\nTrying variant:', variant);
        
        const response = await this.googleMapsClient.geocode({
          params: {
            address: variant,
            key: process.env.GOOGLE_MAPS_API_KEY ?? '',
            components: { country: 'GB' }  // Restrict to UK for better accuracy
          }
        });

        console.log('Google Maps response:', JSON.stringify(response.data, null, 2));

        if (response.data.results.length > 0) {
          const result = response.data.results[0];
          
          // If we have a postcode, verify it matches
          if (postcode) {
            const resultPostcode = result.address_components
              .find(comp => comp.types.includes(GoogleAddressType.postal_code))
              ?.long_name;
            
            if (resultPostcode && this.normalizePostcode(resultPostcode) !== this.normalizePostcode(postcode)) {
              console.log('Postcode mismatch, skipping result');
              continue;
            }
          }

          // Be more lenient with location validation for very basic inputs
          const isBasicInput = !!(number && number.length < 5 && !postcode);
          if (this.isValidLocation(result, !!postcode) || isBasicInput) {
            return result;
          } else {
            console.log('Location not specific enough, trying next variant...');
          }
        }
      }

      console.log('No valid results found');
      return null;
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
    
    // Location precision
    if (result.geometry.location_type === 'ROOFTOP') confidence += 0.4;
    else if (result.geometry.location_type === 'RANGE_INTERPOLATED') confidence += 0.3;
    else if (result.geometry.location_type === 'GEOMETRIC_CENTER') confidence += 0.2;
    
    // Component completeness
    const components = result.address_components;
    if (components.some(c => c.types.includes('street_number'))) confidence += 0.2;
    if (components.some(c => c.types.includes('route'))) confidence += 0.1;
    if (components.some(c => c.types.includes('postal_code'))) confidence += 0.1;
    if (components.some(c => c.types.includes('locality'))) confidence += 0.1;
    if (components.some(c => c.types.includes('country'))) confidence += 0.1;
    
    // Partial match penalty
    if (result.partial_match) confidence -= 0.2;
    
    return Math.min(1, confidence);
  }

  private isValidLocation(result: GeocodeResult, hasPostcode: boolean): boolean {
    console.log('Checking location validity:', {
      types: result.types,
      locationtype: result.geometry.location_type,
      components: result.address_components.map(c => ({ types: c.types, name: c.long_name }))
    });

    // For postcode-only searches, be very lenient
    if (hasPostcode && result.types?.includes('postal_code' as GoogleAddressType)) {
      return true;
    }

    // Check for minimum required components
    const components = result.address_components;
    const hasStreetNumber = components.some(c => c.types.includes('street_number' as GoogleAddressType));
    const hasRoute = components.some(c => c.types.includes('route' as GoogleAddressType));
    const hasPremise = components.some(c => c.types.includes('premise' as GoogleAddressType));
    const hasPostalCode = components.some(c => c.types.includes('postal_code' as GoogleAddressType));

    // Accept if we have either:
    // 1. A street number and route
    // 2. A premise (building name)
    // 3. A postal code with some other component
    return (
      (hasStreetNumber && hasRoute) ||
      hasPremise ||
      (hasPostalCode && (hasStreetNumber || hasRoute || hasPremise))
    );
  }

  generateAddressId(formattedAddress: string): string {
    return createHash('md5')
      .update(formattedAddress)
      .digest('hex');
  }

  private async findExistingAddress(
    geocodeResult: GeocodeResult, 
    inputEmbedding: number[]
  ): Promise<Address | null> {
    // Run all matching strategies in parallel
    const [variantMatches, nearbyMatches, embeddingMatches] = await Promise.all([
      this.findAddressByVariants(geocodeResult),
      this.findNearbyAddresses(
        geocodeResult.geometry.location.lat,
        geocodeResult.geometry.location.lng
      ),
      this.findSimilarEmbeddings(inputEmbedding)
    ]);

    // Combine and score all potential matches
    const allMatches = [...new Set([
      ...(variantMatches ? [variantMatches] : []),
      ...nearbyMatches,
      ...embeddingMatches
    ])];

    if (allMatches.length === 0) return null;

    // Score each match using multiple criteria
    const scoredMatches = await Promise.all(
      allMatches.map(async match => ({
        address: match,
        score: await this.calculateMatchScore(match, {
          geocodeResult,
          inputEmbedding,
          isVariantMatch: match.id === variantMatches?.id,
          isNearbyMatch: nearbyMatches.includes(match),
          isEmbeddingMatch: embeddingMatches.includes(match)
        })
      }))
    );

    // Return the best match if it exceeds our confidence threshold
    const bestMatch = scoredMatches.reduce((best, current) => 
      current.score > best.score ? current : best
    , { score: 0, address: null });

    return bestMatch.score > 0.8 ? bestMatch.address : null;
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
    try {
      const geocodeResult = await this.validateAndFormatAddress(rawAddress);
      if (!geocodeResult) return null;

      const addressId = this.generateAddressId(geocodeResult.formatted_address);
      const addressRef = doc(db, this.addressCollection, addressId);
      const existingDoc = await getDoc(addressRef);

      if (existingDoc.exists()) {
        // Update existing address
        const existingAddress = existingDoc.data() as Address;
        const updatedAddress = {
          ...existingAddress,
          matchedAddresses: [
            ...(existingAddress.matchedAddresses || []),
            {
              rawAddress,
              matchedAt: new Date(),
            }
          ],
          updatedAt: new Date()
        };

        await setDoc(addressRef, updatedAddress);
        return updatedAddress;
      } else {
        // Create new address with embedding
        const embedding = await this.generateEmbedding(geocodeResult.formatted_address);
        const newAddress: Address = {
          id: addressId,
          rawAddress,
          formattedAddress: geocodeResult.formatted_address,
          latitude: geocodeResult.geometry.location.lat,
          longitude: geocodeResult.geometry.location.lng,
          geohash: geohashForLocation([
            geocodeResult.geometry.location.lat,
            geocodeResult.geometry.location.lng
          ]),
          embedding, // Store embedding for new addresses
          matchedAddresses: [{
            rawAddress,
            matchedAt: new Date(),
          }],
          createdAt: new Date(),
          updatedAt: new Date()
        };

        await setDoc(addressRef, newAddress);
        return newAddress;
      }
    } catch (error) {
      console.error('Error in createOrUpdateAddress:', error);
      return null;
    }
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

  async findBestMatch(normalizedInput: string): Promise<Address | null> {
    // 1. Try exact match first (fastest)
    const exactMatch = await this.findExactMatch(normalizedInput);
    if (exactMatch) {
      console.log('Found exact match');
      return exactMatch;
    }

    // 2. Try Google Maps geocoding
    const geocodeResult = await this.validateAndFormatAddress(normalizedInput);
    if (!geocodeResult) {
      console.log('No geocode result found');
      return null;
    }

    // 3. Try pattern matching and nearby addresses in parallel
    const [patternMatches, nearbyMatches] = await Promise.all([
      this.findPatternMatches(normalizedInput),
      this.findNearbyAddresses(
        geocodeResult.geometry.location.lat,
        geocodeResult.geometry.location.lng
      )
    ]);

    // 4. Score and rank matches from traditional methods
    const traditionalMatches = [...patternMatches, ...nearbyMatches].map(match => ({
      address: match,
      score: this.calculateTraditionalMatchScore(
        normalizedInput,
        match,
        geocodeResult
      )
    }));

    const bestTraditionalMatch = traditionalMatches.reduce(
      (best, current) => current.score > best.score ? current : best,
      { score: 0, address: null }
    );

    if (bestTraditionalMatch.score > 0.8) {
      console.log('Found good traditional match');
      return bestTraditionalMatch.address;
    }

    // 5. As a last resort, try embedding-based matching
    console.log('Trying embedding-based matching as fallback');
    try {
      const inputEmbedding = await this.generateEmbedding(normalizedInput);
      if (inputEmbedding.length > 0) {
        const similarAddresses = await this.findSimilarEmbeddings(inputEmbedding, 0.85);
        if (similarAddresses.length > 0) {
          console.log('Found match using embeddings');
          return similarAddresses[0];
        }
      }
    } catch (error) {
      console.error('Error in embedding-based matching:', error);
    }

    console.log('No matches found');
    return null;
  }

  private calculateTraditionalMatchScore(
    input: string,
    candidate: Address,
    geocodeResult: GeocodeResult
  ): number {
    let score = 0;

    // Text similarity (40%)
    score += this.calculateStringSimilarity(input, candidate.formattedAddress) * 0.4;

    // Pattern matching (30%)
    const patternScore = this.learningService.getMatchingConfidence(
      input, 
      candidate.formattedAddress
    );
    score += patternScore * 0.3;

    // Geographic proximity (30%)
    if (geocodeResult) {
      const distance = this.calculateDistance(
        geocodeResult.geometry.location,
        { lat: candidate.latitude, lng: candidate.longitude }
      );
      score += (1 - Math.min(distance / 1000, 1)) * 0.3;
    }

    return score;
  }

  private normalizeAddress(address: string): string {
    return address
      .toLowerCase()
      .replace(/\b(flat|apartment|apt|unit|floor|fl)\b/gi, '')
      .replace(/[,#\-\/\\]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private async calculateMatchScore(
    input: string,
    candidate: Address,
    geocodeResult: GeocodeResult | null
  ): Promise<number> {
    let score = 0;

    // Text similarity (30%)
    score += this.calculateStringSimilarity(input, candidate.formattedAddress) * 0.3;

    // Pattern matching (20%)
    score += await this.learningService.getMatchingConfidence(input, candidate.formattedAddress) * 0.2;

    // Geographic proximity if geocoded (30%)
    if (geocodeResult) {
      const distance = this.calculateDistance(
        geocodeResult.geometry.location,
        { lat: candidate.latitude, lng: candidate.longitude }
      );
      score += (1 - Math.min(distance / 1000, 1)) * 0.3;
    }

    // Historical match success (20%)
    score += this.calculateHistoricalConfidence(candidate) * 0.2;

    return score;
  }

  private async generateEmbedding(text: string): Promise<number[]> {
    try {
      const response = await this.openai.createEmbedding({
        model: "text-embedding-ada-002",
        input: text.toLowerCase().trim()
      });
      return response.data.data[0].embedding;
    } catch (error) {
      console.error('Error generating embedding:', error);
      return [];
    }
  }

  private async findSimilarEmbeddings(
    embedding: number[], 
    threshold = 0.8
  ): Promise<Address[]> {
    const addressesRef = collection(db, this.addressCollection);
    const snapshot = await getDocs(addressesRef);
    const matches: Address[] = [];

    for (const doc of snapshot.docs) {
      const address = doc.data() as Address;
      
      // Only check addresses that have embeddings stored
      if (address.embedding) {
        const similarity = 1 - getVectorDistance(embedding, address.embedding);
        if (similarity >= threshold) {
          matches.push(address);
        }
      }
    }

    return matches;
  }

  private async calculateMatchScore(
    address: Address,
    context: {
      geocodeResult: GeocodeResult;
      inputEmbedding: number[];
      isVariantMatch: boolean;
      isNearbyMatch: boolean;
      isEmbeddingMatch: boolean;
    }
  ): Promise<number> {
    let score = 0;

    // Direct matches (30%)
    if (context.isVariantMatch) score += 0.3;
    
    // Geographic proximity (20%)
    if (context.isNearbyMatch) score += 0.2;
    
    // Embedding similarity (30%)
    if (address.embedding) {
      const similarity = 1 - getVectorDistance(context.inputEmbedding, address.embedding);
      score += similarity * 0.3;
    }
    
    // Historical confidence (20%)
    score += this.calculateHistoricalConfidence(address) * 0.2;

    return score;
  }
} 
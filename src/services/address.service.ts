import { Client, GeocodeResult, AddressType } from "@googlemaps/google-maps-services-js";
import type { GeocodingAddressComponentType } from "@googlemaps/google-maps-services-js";
import OpenAI from "openai";
import { db } from '../config/firebase';
import { collection, doc, setDoc, getDoc, query, where, getDocs, updateDoc } from 'firebase/firestore';
import { Address } from '../types/address';
import { LearningService } from './learning.service';
import { getVectorDistance } from '../utils/vector';
import crypto from 'crypto';
import { MapboxService } from './mapbox.service';

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
  };
}

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
      const location = {
        lat: validationData.result.geocode.location.latitude,
        lng: validationData.result.geocode.location.longitude
      };
      
      // Look up nearest building using Mapbox
      let buildingDescription = '';
      let buildingEntrance = null;
      
      try {
        const nearestBuilding = await mapboxService.findNearestBuilding(location.lat, location.lng);
        if (nearestBuilding) {
          buildingDescription = mapboxService.generateBuildingDescriptor(nearestBuilding.properties);
          buildingEntrance = nearestBuilding.entrance;
        }
      } catch (error) {
        console.warn('Unable to fetch building data:', error);
        // Continue without building data
      }
      
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
            location,
            viewport: bounds
          },
          address_components: validationData.result.address.addressComponents.map(comp => ({
            long_name: comp.componentName.text,
            short_name: comp.componentName.text,
            types: [comp.componentType as GeocodingAddressComponentType]
          })),
          types: ['street_address'],
          postcode_localities: [],
          plus_code: {
            compound_code: '',
            global_code: validationData.result.geocode.plusCode?.globalCode || ''
          },
          partial_match: false,
          place_id: crypto.randomUUID(),
          building_description: buildingDescription || '',
          building_entrance: buildingEntrance
        } as GeocodeResult;
      }

      if (verdict.validationGranularity === 'ROUTE' && 
          verdict.addressComplete && 
          !verdict.hasUnconfirmedComponents) {
        return {
          formatted_address: validationData.result.address.formattedAddress,
          geometry: {
            location,
            viewport: bounds
          },
          address_components: validationData.result.address.addressComponents.map(comp => ({
            long_name: comp.componentName.text,
            short_name: comp.componentName.text,
            types: [comp.componentType as GeocodingAddressComponentType]
          })),
          types: ['route'],
          postcode_localities: [],
          plus_code: {
            compound_code: '',
            global_code: validationData.result.geocode.plusCode?.globalCode || ''
          },
          partial_match: false,
          place_id: crypto.randomUUID(),
          building_description: buildingDescription || '',
          building_entrance: buildingEntrance
        } as GeocodeResult;
      }

      // Fallback to Geocoding API
      console.log('Falling back to Geocoding API');
      const geocodeResponse = await this.googleMapsClient.geocode({
        params: {
          address,
          key: process.env.GOOGLE_MAPS_API_KEY!
        }
      });

      if (geocodeResponse.data.results && geocodeResponse.data.results.length > 0) {
        const result = geocodeResponse.data.results[0];
        
        // Look up nearest building for geocoded result
        const geocodedLocation = result.geometry.location;
        const nearestBuildingGeocoded = await mapboxService.findNearestBuilding(
          geocodedLocation.lat,
          geocodedLocation.lng
        );
        let buildingDescriptionGeocoded = '';
        
        if (nearestBuildingGeocoded) {
          buildingDescriptionGeocoded = mapboxService.generateBuildingDescriptor(nearestBuildingGeocoded.properties);
        }
        
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
          return {
            ...result,
            building_description: buildingDescriptionGeocoded || '',
            building_entrance: nearestBuildingGeocoded?.entrance || null
          };
        }
      }

      return null;
    } catch (error) {
      console.error('Error validating address:', error);
      return null;
    }
  }

  async createOrUpdateAddress(rawAddress: string): Promise<Address | null> {
    try {
      console.log('[AddressService] Starting address validation...');
      const validatedAddress = await this.validateAndFormatAddress(rawAddress);
      if (!validatedAddress) {
        console.log('[AddressService] Address validation failed');
        return null;
      }

      const addressId = crypto.randomUUID();
      const now = new Date();

      // Start Street View image fetch early
      console.log('[AddressService] Getting Street View image...');
      const streetViewResult = await this.getStreetViewImage(validatedAddress.geometry.location);

      console.log('[AddressService] Creating initial address data...');
      const addressData: Address = {
        id: addressId,
        formattedAddress: validatedAddress.formatted_address,
        location: validatedAddress.geometry.location,
        components: validatedAddress.address_components,
        matchedAddresses: [{ 
          rawAddress, 
          timestamp: now.toISOString() 
        }],
        createdAt: now,
        updatedAt: now,
        views: 0,
        summary: validatedAddress.building_description || 'No description available yet.',
        buildingEntrance: validatedAddress.building_entrance,
        streetViewUrl: streetViewResult?.imageUrl || undefined
      };

      // Generate full description before saving
      console.log('[AddressService] Generating full description...');
      const fullDescription = await this.generateDescription(addressData, streetViewResult?.description);
      
      if (fullDescription) {
        console.log('[AddressService] Full description generated:', fullDescription.substring(0, 50) + '...');
        addressData.summary = fullDescription;
      } else {
        console.log('[AddressService] Failed to generate full description');
      }

      // Save address with full description and Street View URL
      console.log('[AddressService] Saving address to database...');
      const addressRef = doc(db, this.addressCollection, addressId);
      await setDoc(addressRef, addressData);

      console.log('[AddressService] Address creation complete');
      return addressData;
    } catch (error) {
      console.error('[AddressService] Error creating/updating address:', error);
      throw error;
    }
  }

  async findExistingAddress(address: string): Promise<Address | null> {
    try {
      console.log('\n=== Starting Address Search ===');
      console.log('Input address:', address);
      console.log('Timestamp:', new Date().toISOString());

      // First, try exact match on formatted address
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

      // Then, try matching raw address in matchedAddresses array
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

      // If no direct matches, try geocoding and proximity search
      console.log('[AddressService] No direct matches found, trying geocoding...');
      const geocodeResponse = await this.googleMapsClient.geocode({
        params: {
          address,
          key: process.env.GOOGLE_MAPS_API_KEY!
        }
      });

      if (!geocodeResponse.data.results || geocodeResponse.data.results.length === 0) {
        console.log('[AddressService] Geocoding failed');
        return null;
      }

      const result = geocodeResponse.data.results[0];
      console.log('[AddressService] Checking proximity matches...');
      
      // Check all addresses for proximity match
      const allAddressesQuery = query(collection(db, this.addressCollection));
      const allAddresses = await getDocs(allAddressesQuery);
      const DISTANCE_THRESHOLD = 10; // meters

      for (const doc of allAddresses.docs) {
        const addr = doc.data() as Address;
        
        // Skip if address doesn't have location data
        if (!addr.location?.lat || !addr.location?.lng) {
          console.log('[AddressService] Skipping address without location data');
          continue;
        }

        const distance = getVectorDistance(
          {
            lat: result.geometry.location.lat,
            lng: result.geometry.location.lng
          },
          addr.location
        );

        if (distance <= DISTANCE_THRESHOLD) {
          console.log('[AddressService] Found proximity match');
          return {
            ...addr,
            id: doc.id
          };
        }
      }

      console.log('[AddressService] No matches found');
      return null;
    } catch (error) {
      console.error('Error finding existing address:', error);
      return null;
    }
  }

  private async getStreetViewImage(location: { lat: number; lng: number }): Promise<{ imageUrl: string; description: string } | null> {
    try {
      console.log('[AddressService] Getting Street View image for location:', location);
      
      // First check if Street View is available at this location
      const metadataUrl = `https://maps.googleapis.com/maps/api/streetview/metadata?location=${location.lat},${location.lng}&source=outdoor&radius=50&key=${process.env.GOOGLE_MAPS_API_KEY}`;
      console.log('[AddressService] Checking Street View metadata URL:', metadataUrl);
      
      const metadataResponse = await fetch(metadataUrl);
      const metadata = await metadataResponse.json();
      console.log('[AddressService] Street View metadata response:', metadata);
      
      if (metadata.status !== 'OK') {
        console.log('[AddressService] No Street View available for this location');
        return null;
      }

      // Get the Street View image using the exact pano_id from metadata to ensure consistency
      const imageUrl = `https://maps.googleapis.com/maps/api/streetview?size=600x300&pano=${metadata.pano_id}&source=outdoor&key=${process.env.GOOGLE_MAPS_API_KEY}`;
      console.log('[AddressService] Generated Street View image URL');

      // Use OpenAI Vision to describe the image
      console.log('[AddressService] Calling OpenAI Vision API...');
      const imageDescription = await this.openai.chat.completions.create({
        model: "gpt-4-vision-preview",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "As a delivery driver, what are the key identifying features of this building? Focus on color, building number visibility, entrance location, and any obvious landmarks. Be brief and practical."
              },
              {
                type: "image_url",
                image_url: {
                  url: imageUrl,
                  detail: "auto"
                }
              }
            ]
          }
        ],
        max_tokens: 300
      });

      console.log('[AddressService] OpenAI Vision response:', imageDescription.choices[0]?.message?.content);

      return {
        imageUrl,
        description: imageDescription.choices[0]?.message?.content || ''
      };
    } catch (error) {
      console.error('[AddressService] Error getting street view image:', error);
      return null;
    }
  }

  private async generateDescription(address: Address, streetViewDescription?: string | null): Promise<string> {
    try {
      console.log('[AddressService] Finding nearest building...');
      
      // Find building footprint using Mapbox
      const building = await mapboxService.findNearestBuilding(
        address.location.lat,
        address.location.lng
      );

      console.log('[AddressService] Getting nearby places...');
      // Get nearby places
      const placesResponse = await this.googleMapsClient.placesNearby({
        params: {
          location: { 
            lat: address.location.lat, 
            lng: address.location.lng 
          },
          radius: 200,
          key: process.env.GOOGLE_MAPS_API_KEY!,
          type: 'point_of_interest'
        }
      });

      // Process nearby places
      console.log('[AddressService] Processing nearby places...');
      const validPlaces = await Promise.all(
        placesResponse.data.results.slice(0, 5).map(async place => {
          if (!place.geometry?.location) return null;
          
          const distance = this.calculateDistance(
            address.location.lat,
            address.location.lng,
            place.geometry.location.lat,
            place.geometry.location.lng
          );
          const bearing = this.calculateBearing(
            place.geometry.location.lat,
            place.geometry.location.lng,
            address.location.lat,
            address.location.lng
          );
          const direction = this.bearingToCardinal(bearing);
          return {
            name: place.name || 'Unknown place',
            type: place.types?.[0] || 'location',
            distance: Math.round(distance),
            direction
          };
        })
      ).then(places => places.filter((place): place is NonNullable<typeof place> => place !== null));

      const nearbyPlacesText = validPlaces
        .map(place => `${place.name} (${place.distance}m ${place.direction})`)
        .join(', ');

      console.log('[AddressService] Found nearby places:', nearbyPlacesText);

      // Generate the final description
      console.log('[AddressService] Generating OpenAI description...');
      const prompt = `Create a brief, practical description for delivery drivers to find this location. Include:
      ${streetViewDescription ? `- Building appearance: ${streetViewDescription}` : ''}
      - Nearby landmarks: ${nearbyPlacesText || 'none found'}
      
      Format as 1-2 short sentences.
      - Start with the nearest business/landmark
      - Include exact distance in meters
      - Mention building numbers if visible
      - Focus on permanent features (avoid temporary or seasonal elements)
      - Use cardinal directions only when essential`;

      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          { 
            role: 'system',
            content: 'You are a delivery driver giving precise, practical directions. Focus on permanent features and building numbers. Be brief and clear.'
          },
          { 
            role: 'user',
            content: prompt 
          }
        ],
        temperature: 0.3,  // Lower temperature for more consistent, practical responses
        max_tokens: 150
      });

      const description = completion.choices[0]?.message?.content;
      if (!description) {
        console.log('[AddressService] OpenAI returned no description');
        return this.generateFallbackDirections(address);
      }

      console.log('[AddressService] Successfully generated description');
      return description;
    } catch (error) {
      console.error('[AddressService] Error generating description:', error);
      return this.generateFallbackDirections(address);
    }
  }

  private async generateFallbackDirections(address: Address): Promise<string> {
    try {
      // Find building footprint using Mapbox
      const building = await mapboxService.findNearestBuilding(
        address.location.lat,
        address.location.lng
      );

      // Find nearby POIs
      const response = await this.googleMapsClient.placesNearby({
        params: {
          location: { 
            lat: address.location.lat, 
            lng: address.location.lng 
          },
          radius: 200, // Increased radius to find more landmarks
          key: process.env.GOOGLE_MAPS_API_KEY!,
          type: 'point_of_interest' // Single type as required by API
        }
      });

      let directions = '';
      const buildingDescriptor = building 
        ? mapboxService.generateBuildingDescriptor(building.properties)
        : 'building';

      // Process up to 3 nearest landmarks
      const landmarks = response.data.results
        .filter(place => place.geometry?.location)
        .slice(0, 3)
        .map(place => {
          if (!place.geometry?.location) return null;
          
          const distance = this.calculateDistance(
            address.location.lat,
            address.location.lng,
            place.geometry.location.lat,
            place.geometry.location.lng
          );
          const bearing = this.calculateBearing(
            place.geometry.location.lat,
            place.geometry.location.lng,
            address.location.lat,
            address.location.lng
          );
          return {
            name: place.name || 'Unknown place',
            distance: Math.round(distance),
            direction: this.bearingToCardinal(bearing)
          };
        })
        .filter((landmark): landmark is NonNullable<typeof landmark> => landmark !== null)
        .sort((a, b) => a.distance - b.distance);

      if (landmarks.length > 0) {
        const nearest = landmarks[0];
        directions = `From ${nearest.name}, head ${nearest.direction} for ${nearest.distance} meters. `;
        
        if (landmarks.length > 1) {
          const second = landmarks[1];
          directions += `You'll pass ${second.name} on your ${this.getRelativeDirection(second.direction)}. `;
        }
      }

      directions += `Look for ${buildingDescriptor}. `;

      if (building?.entrance) {
        const entranceDirection = this.describeEntranceLocation(building.entrance, building.polygon);
        directions += `The main entrance is ${entranceDirection}.`;
      }

      return directions || `The location is at ${address.formattedAddress}`;
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

  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Earth's radius in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c * 1000; // Convert to meters
  }

  private getRelativeDirection(cardinalDirection: string): string {
    const directions: { [key: string]: string } = {
      'north': 'left',
      'northeast': 'left',
      'east': 'left',
      'southeast': 'left',
      'south': 'right',
      'southwest': 'right',
      'west': 'right',
      'northwest': 'right'
    };
    return directions[cardinalDirection] || 'side';
  }
} 
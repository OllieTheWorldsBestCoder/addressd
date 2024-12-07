import { Timestamp } from 'firebase/firestore';

export interface Contribution {
  content: string;
  createdAt: Date | Timestamp;
  userId?: string | null;
}

export interface Address {
  id: string;
  formattedAddress: string;
  location: {
    lat: number;
    lng: number;
  };
  components: Array<{
    long_name: string;
    short_name: string;
    types: string[];
  }>;
  matchedAddresses: Array<{
    rawAddress: string;
    timestamp: string;
  }>;
  summary: string;
  descriptions?: Contribution[];
  createdAt: Date | Timestamp;
  updatedAt: Date | Timestamp;
  views: number;
  buildingEntrance?: {
    lat: number;
    lng: number;
  } | null;
}

export interface AddressResponse {
  summary: string;
  uploadLink: string;
  addressId: string;
  formattedAddress: string;
}

export interface AddressFeedback {
  id: string;
  addressId: string;
  isPositive: boolean;
  comment?: string;
  inputAddress: string;
  matchedAddress: string;
  createdAt: Date;
}

export interface MatchingPattern {
  id: string;
  pattern: string;
  successCount: number;
  failureCount: number;
  confidence: number;
  lastUsed: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface MatchingResult {
  patternId: string;
  matched: boolean;
  addressId: string;
}

// Extend GeocodeResult type to include our custom fields
declare module '@googlemaps/google-maps-services-js' {
  interface GeocodeResult {
    building_description?: string;
    building_entrance?: {
      lat: number;
      lng: number;
    } | null;
  }
} 
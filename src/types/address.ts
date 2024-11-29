import { Timestamp } from 'firebase/firestore';

export interface Contribution {
  content: string;
  createdAt: Date | Timestamp;
  userId?: string | null;
}

export interface Address {
  id: string;
  rawAddress: string;
  formattedAddress: string;
  latitude: number;
  longitude: number;
  geohash: string;
  embedding?: number[];
  matchedAddresses?: Array<{
    rawAddress: string;
    matchedAt: Date;
  }>;
  summary?: string;
  descriptions?: Contribution[];
  createdAt: Date | Timestamp;
  updatedAt: Date | Timestamp;
}

export interface AddressResponse {
  summary: string;
  uploadLink: string;
  addressId: string;
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
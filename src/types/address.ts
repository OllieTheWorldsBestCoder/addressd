import { Timestamp } from 'firebase/firestore';

export interface Contribution {
  content: string;
  createdAt: Date | Timestamp;
}

export interface Address {
  id: string;
  rawAddress: string;
  formattedAddress: string;
  latitude: number;
  longitude: number;
  geohash: string;
  summary: string;
  descriptions: Contribution[];
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
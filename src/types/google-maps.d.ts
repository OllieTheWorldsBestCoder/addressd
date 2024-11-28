declare module 'google-maps-types' {
  export type AddressType = GoogleAddressType;

  export interface GeocodeResult {
    formatted_address: string;
    geometry: {
      location: {
        lat: number;
        lng: number;
      };
      location_type?: 'ROOFTOP' | 'RANGE_INTERPOLATED' | 'GEOMETRIC_CENTER' | 'APPROXIMATE';
      viewport?: {
        northeast: {
          lat: number;
          lng: number;
        };
        southwest: {
          lat: number;
          lng: number;
        };
      };
      bounds?: {
        northeast: {
          lat: number;
          lng: number;
        };
        southwest: {
          lat: number;
          lng: number;
        };
      };
    };
    place_id: string;
    address_components: Array<{
      long_name: string;
      short_name: string;
      types: AddressType[];
    }>;
    types?: AddressType[];
    partial_match?: boolean;
  }
} 
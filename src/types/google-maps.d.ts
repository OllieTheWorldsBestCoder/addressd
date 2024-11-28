declare module 'google-maps-types' {
  export type AddressType = 
    | 'street_number'
    | 'route'
    | 'premise'
    | 'subpremise'
    | 'postal_code'
    | 'postal_code_prefix'
    | 'locality'
    | 'administrative_area_level_1'
    | 'administrative_area_level_2'
    | 'country'
    | 'street_address'
    | 'point_of_interest'
    | 'establishment'
    | 'political'
    | 'postal_town';

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
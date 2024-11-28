declare module 'google-maps-types' {
  export interface GeocodeResult {
    formatted_address: string;
    geometry: {
      location: {
        lat: number;
        lng: number;
      };
    };
    place_id: string;
    address_components: Array<{
      long_name: string;
      short_name: string;
      types: string[];
    }>;
  }
} 
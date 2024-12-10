declare namespace google.maps {
  class Autocomplete {
    constructor(inputField: HTMLInputElement, opts?: AutocompleteOptions);
    addListener(eventName: string, handler: Function): void;
    getPlace(): PlaceResult;
  }

  class Geocoder {
    constructor();
    geocode(
      request: GeocoderRequest,
      callback: (results: GeocoderResult[], status: GeocoderStatus) => void
    ): void;
  }

  interface GeocoderRequest {
    address?: string;
    location?: { lat: number; lng: number };
    placeId?: string;
    bounds?: LatLngBounds;
    componentRestrictions?: GeocoderComponentRestrictions;
    region?: string;
  }

  interface GeocoderComponentRestrictions {
    country: string | string[];
    postalCode?: string;
    administrativeArea?: string;
    locality?: string;
  }

  interface GeocoderResult {
    address_components: AddressComponent[];
    formatted_address: string;
    geometry: {
      location: LatLng;
      location_type: LocationType;
      viewport: LatLngBounds;
      bounds?: LatLngBounds;
    };
    place_id: string;
    types: string[];
    partial_match?: boolean;
  }

  interface AddressComponent {
    long_name: string;
    short_name: string;
    types: string[];
  }

  interface LatLng {
    lat(): number;
    lng(): number;
  }

  interface LatLngBounds {
    northeast: LatLng;
    southwest: LatLng;
  }

  enum LocationType {
    ROOFTOP = 'ROOFTOP',
    RANGE_INTERPOLATED = 'RANGE_INTERPOLATED',
    GEOMETRIC_CENTER = 'GEOMETRIC_CENTER',
    APPROXIMATE = 'APPROXIMATE'
  }

  enum GeocoderStatus {
    OK = 'OK',
    ZERO_RESULTS = 'ZERO_RESULTS',
    OVER_DAILY_LIMIT = 'OVER_DAILY_LIMIT',
    OVER_QUERY_LIMIT = 'OVER_QUERY_LIMIT',
    REQUEST_DENIED = 'REQUEST_DENIED',
    INVALID_REQUEST = 'INVALID_REQUEST',
    UNKNOWN_ERROR = 'UNKNOWN_ERROR'
  }

  interface AutocompleteOptions {
    componentRestrictions?: {
      country: string | string[];
    };
    fields?: string[];
    types?: string[];
  }

  interface PlaceResult {
    formatted_address?: string;
    geometry?: {
      location: {
        lat(): number;
        lng(): number;
      };
    };
    place_id?: string;
    address_components?: Array<{
      long_name: string;
      short_name: string;
      types: string[];
    }>;
  }

  namespace places {
    class Autocomplete extends google.maps.Autocomplete {}
    interface PlaceResult extends google.maps.PlaceResult {}
  }

  namespace event {
    function clearInstanceListeners(instance: any): void;
  }
} 
declare namespace google.maps {
  class Autocomplete {
    constructor(inputField: HTMLInputElement, opts?: AutocompleteOptions);
    addListener(eventName: string, handler: Function): void;
    getPlace(): PlaceResult;
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
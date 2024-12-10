import { useEffect, useRef, useCallback } from 'react';

interface Props {
  value: string;
  onChange: (value: string) => void;
  onSelect: (place: google.maps.places.PlaceResult) => void;
  disabled?: boolean;
  className?: string;
  placeholder?: string;
}

export default function AddressAutocomplete({ value, onChange, onSelect, disabled, className, placeholder }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const isInitializedRef = useRef(false);

  // Create a stable reference to the place_changed handler
  const handlePlaceChanged = useCallback(() => {
    if (!autocompleteRef.current) return;

    console.log('[AddressAutocomplete] Place changed event fired');
    const place = autocompleteRef.current.getPlace();
    console.log('[AddressAutocomplete] Selected place:', place);
    
    if (place && place.formatted_address) {
      // First update the input value
      onChange(place.formatted_address);
      // Then notify parent about the selection
      onSelect(place);
      // Force a sync update of the input value
      if (inputRef.current) {
        inputRef.current.value = place.formatted_address;
      }
    }
  }, [onChange, onSelect]);

  // Initialize Google Places Autocomplete
  useEffect(() => {
    const initializeAutocomplete = () => {
      if (!inputRef.current || !window.google || isInitializedRef.current) return;

      console.log('[AddressAutocomplete] Initializing autocomplete');
      const autocomplete = new window.google.maps.places.Autocomplete(inputRef.current, {
        types: ['address'],
        fields: [
          'formatted_address',
          'address_components',
          'geometry',
          'place_id',
          'types'
        ],
      });

      // Use the stable callback reference
      autocomplete.addListener('place_changed', handlePlaceChanged);
      autocompleteRef.current = autocomplete;
      isInitializedRef.current = true;
    };

    // Try to initialize immediately if Google Maps is already loaded
    if (window.google) {
      initializeAutocomplete();
    }

    // Also listen for the Google Maps script to load
    const checkGoogleMapsLoaded = setInterval(() => {
      if (window.google && !isInitializedRef.current) {
        initializeAutocomplete();
        clearInterval(checkGoogleMapsLoaded);
      }
    }, 100);

    return () => {
      clearInterval(checkGoogleMapsLoaded);
      if (autocompleteRef.current) {
        google.maps.event.clearInstanceListeners(autocompleteRef.current);
        autocompleteRef.current = null;
        isInitializedRef.current = false;
      }
    };
  }, [handlePlaceChanged]); // Include the stable callback in dependencies

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    console.log('[AddressAutocomplete] Input changed:', newValue);
    onChange(newValue);
  }, [onChange]);

  return (
    <input
      ref={inputRef}
      type="text"
      value={value}
      onChange={handleInputChange}
      disabled={disabled}
      className={className}
      placeholder={placeholder}
      autoComplete="off"
    />
  );
} 
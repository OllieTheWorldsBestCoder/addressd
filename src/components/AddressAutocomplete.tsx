import { useEffect, useRef } from 'react';

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

  // Initialize Google Places Autocomplete
  useEffect(() => {
    if (!inputRef.current || !window.google) return;

    // Clean up previous instance if it exists
    if (autocompleteRef.current) {
      google.maps.event.clearInstanceListeners(autocompleteRef.current);
      autocompleteRef.current = null;
    }

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

    autocomplete.addListener('place_changed', () => {
      console.log('[AddressAutocomplete] Place changed event fired');
      const place = autocomplete.getPlace();
      console.log('[AddressAutocomplete] Selected place:', place);
      
      if (place && place.formatted_address) {
        onChange(place.formatted_address);
        onSelect(place);
      }
    });

    autocompleteRef.current = autocomplete;

    return () => {
      if (autocompleteRef.current) {
        google.maps.event.clearInstanceListeners(autocompleteRef.current);
        autocompleteRef.current = null;
      }
    };
  }, [onSelect, onChange]); // Re-initialize when callbacks change

  return (
    <input
      ref={inputRef}
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      className={className}
      placeholder={placeholder}
      autoComplete="off"
    />
  );
} 
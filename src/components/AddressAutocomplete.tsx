import { useEffect, useRef, useState } from 'react';

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

  useEffect(() => {
    if (!inputRef.current || !window.google) return;

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
        // Update the input value with the full address
        onChange(place.formatted_address);
        // Notify parent component about the selection
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
  }, [onChange, onSelect]);

  // Handle manual input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    console.log('[AddressAutocomplete] Input changed:', newValue);
    onChange(newValue);
  };

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
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

  useEffect(() => {
    if (!inputRef.current || !window.google) return;

    console.log('[AddressAutocomplete] Initializing autocomplete');
    autocompleteRef.current = new window.google.maps.places.Autocomplete(inputRef.current, {
      types: ['address'],
      fields: [
        'formatted_address',
        'address_components',
        'geometry',
        'place_id',
        'types'
      ],
    });

    const placeChangedListener = () => {
      console.log('[AddressAutocomplete] Place changed event fired');
      const place = autocompleteRef.current?.getPlace();
      console.log('[AddressAutocomplete] Selected place:', place);
      if (place) {
        onSelect(place);
      }
    };

    autocompleteRef.current.addListener('place_changed', placeChangedListener);

    return () => {
      if (autocompleteRef.current) {
        console.log('[AddressAutocomplete] Cleaning up listeners');
        google.maps.event.clearInstanceListeners(autocompleteRef.current);
      }
    };
  }, [onSelect]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    console.log('[AddressAutocomplete] Input changed:', e.target.value);
    onChange(e.target.value);
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
      autoComplete="off" // Prevent browser autocomplete from interfering
    />
  );
} 
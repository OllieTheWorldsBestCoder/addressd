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
  const onSelectRef = useRef(onSelect);
  const onChangeRef = useRef(onChange);

  // Keep refs updated with latest callback values
  useEffect(() => {
    onSelectRef.current = onSelect;
    onChangeRef.current = onChange;
  }, [onSelect, onChange]);

  useEffect(() => {
    if (!inputRef.current || !window.google || autocompleteRef.current) return;

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
        // Use refs to access latest callbacks
        onChangeRef.current(place.formatted_address);
        onSelectRef.current(place);
      }
    });

    autocompleteRef.current = autocomplete;

    return () => {
      if (autocompleteRef.current) {
        google.maps.event.clearInstanceListeners(autocompleteRef.current);
        autocompleteRef.current = null;
      }
    };
  }, []); // Empty dependency array since we're using refs

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
import { useState, useEffect, useRef } from 'react';
import styles from '../styles/AddressAutocomplete.module.css';

interface Props {
  value: string;
  onChange: (value: string) => void;
  onSelect: (address: google.maps.places.PlaceResult) => void;
  disabled?: boolean;
}

export default function AddressAutocomplete({ value, onChange, onSelect, disabled }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);

  useEffect(() => {
    if (!inputRef.current) return;

    // Initialize Google Places Autocomplete
    const autocomplete = new google.maps.places.Autocomplete(inputRef.current, {
      componentRestrictions: { country: 'gb' },
      fields: ['formatted_address', 'geometry', 'address_components'],
      types: ['address']
    });

    // Store reference
    autocompleteRef.current = autocomplete;

    // Add place_changed event listener
    autocomplete.addListener('place_changed', () => {
      const place = autocomplete.getPlace();
      if (place.formatted_address) {
        onChange(place.formatted_address);
        onSelect(place);
      }
    });

    return () => {
      google.maps.event.clearInstanceListeners(autocomplete);
    };
  }, [onChange, onSelect]);

  return (
    <div className={styles.container}>
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Enter an address..."
        className={styles.input}
        disabled={disabled}
      />
    </div>
  );
} 
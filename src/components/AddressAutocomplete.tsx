import { useEffect, useRef, useState } from 'react';
import styles from '../styles/AddressAutocomplete.module.css';

interface Props {
  value: string;
  onChange: (value: string) => void;
  onSelect: (place: google.maps.places.PlaceResult) => void;
  disabled?: boolean;
}

export default function AddressAutocomplete({ value, onChange, onSelect, disabled }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isGoogleLoaded, setIsGoogleLoaded] = useState(false);

  useEffect(() => {
    const checkGoogleMapsLoaded = () => {
      if (window.google && window.google.maps) {
        setIsGoogleLoaded(true);
        initAutocomplete();
      } else {
        setTimeout(checkGoogleMapsLoaded, 100);
      }
    };

    checkGoogleMapsLoaded();
  }, []);

  const initAutocomplete = () => {
    if (!inputRef.current) return;

    const autocomplete = new google.maps.places.Autocomplete(inputRef.current, {
      componentRestrictions: { country: 'gb' },
      fields: ['formatted_address', 'geometry', 'name'],
    });

    autocomplete.addListener('place_changed', () => {
      const place = autocomplete.getPlace();
      if (place.formatted_address) {
        onChange(place.formatted_address);
        onSelect(place);
      }
    });
  };

  return (
    <input
      ref={inputRef}
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled || !isGoogleLoaded}
      placeholder={isGoogleLoaded ? "Enter an address..." : "Loading..."}
      className={styles.input}
    />
  );
} 
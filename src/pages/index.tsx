import { useState, FormEvent } from 'react';
import styles from '../styles/Home.module.css';
import AddressAutocomplete from '../components/AddressAutocomplete';
import AddressFeedback from '../components/AddressFeedback';
import { AddressResponse } from '../types/address';

export default function Home() {
  const [address, setAddress] = useState('');
  const [result, setResult] = useState<AddressResponse | null>(null);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedPlace, setSelectedPlace] = useState<google.maps.places.PlaceResult | null>(null);

  const handleAddressSelect = (place: google.maps.places.PlaceResult) => {
    if (!place.formatted_address) return;
    setAddress(place.formatted_address);
    setSelectedPlace(place);
    setError('');
    setResult(null);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!address.trim()) {
      setError('Please enter an address');
      return;
    }

    setIsLoading(true);
    setError('');
    setResult(null);

    try {
      const response = await fetch('/api/address/validate-frontend', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          address: selectedPlace?.formatted_address || address,
          ...(selectedPlace && {
            placeId: selectedPlace.place_id,
            coordinates: {
              lat: selectedPlace.geometry?.location?.lat(),
              lng: selectedPlace.geometry?.location?.lng()
            }
          })
        }),
      });

      const data = await response.json();
      
      if (response.ok) {
        setResult(data);
      } else {
        setError(data.error || 'Something went wrong');
      }
    } catch (err) {
      setError('Failed to process address');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <main className={styles.main}>
        <h1 className={styles.title}>addressd</h1>
        
        <p className={styles.description}>
          Enter an address to validate and contribute information
        </p>
        
        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.inputWrapper}>
            <AddressAutocomplete
              value={address}
              onChange={(val) => {
                setAddress(val);
                if (!selectedPlace?.formatted_address || val !== selectedPlace.formatted_address) {
                  setSelectedPlace(null);
                }
              }}
              onSelect={handleAddressSelect}
              disabled={isLoading}
            />
          </div>
          <button 
            type="submit"
            disabled={isLoading || !address.trim()}
            className={styles.button}
          >
            {isLoading ? 'Validating...' : 'Validate'}
          </button>
        </form>

        {error && <p className={styles.error}>{error}</p>}
        
        {result && (
          <div className={styles.result}>
            <h2>Address Validated</h2>
            <p><strong>Summary:</strong> {result.summary}</p>
            <a 
              href={result.uploadLink} 
              target="_blank" 
              rel="noopener noreferrer"
              className={styles.link}
            >
              Add Description →
            </a>
            <AddressFeedback
              addressId={result.addressId}
              inputAddress={address}
              matchedAddress={selectedPlace?.formatted_address || address}
            />
          </div>
        )}
      </main>
    </div>
  );
} 
import { useState } from 'react';
import styles from '../styles/Home.module.css';
import AddressAutocomplete from '../components/AddressAutocomplete';

export default function Home() {
  const [address, setAddress] = useState('');
  const [result, setResult] = useState<{summary: string; uploadLink: string} | null>(null);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleAddressSelect = async (place: google.maps.places.PlaceResult) => {
    if (!place.formatted_address) return;
    
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
          address: place.formatted_address,
          placeId: place.place_id,
          coordinates: {
            lat: place.geometry?.location?.lat(),
            lng: place.geometry?.location?.lng()
          }
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
        <div className={styles.header}>
          <h1 className={styles.title}>addressd</h1>
          <a href="/signup" className={styles.signupLink}>
            Get API Access →
          </a>
        </div>
        
        <p className={styles.description}>
          Enter an address to validate and contribute information
        </p>
        
        <div className={styles.form}>
          <AddressAutocomplete
            value={address}
            onChange={setAddress}
            onSelect={handleAddressSelect}
            disabled={isLoading}
          />
        </div>

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
          </div>
        )}
      </main>
    </div>
  );
} 
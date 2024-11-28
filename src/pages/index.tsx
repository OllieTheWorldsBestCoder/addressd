import { useState, FormEvent } from 'react';
import styles from '../styles/Home.module.css';
import AddressAutocomplete from '../components/AddressAutocomplete';

export default function Home() {
  const [address, setAddress] = useState('');
  const [result, setResult] = useState<{summary: string; uploadLink: string} | null>(null);
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

  const handleValidate = async (e?: FormEvent) => {
    console.log('handleValidate called');
    e?.preventDefault();
    
    if (!selectedPlace?.formatted_address) {
      console.log('No selected place');
      setError('Please select an address from the suggestions');
      return;
    }
    
    console.log('Validating address:', selectedPlace.formatted_address);
    setIsLoading(true);
    setError('');
    setResult(null);

    try {
      console.log('Making request to /api/address/validate-frontend');
      const response = await fetch('/api/address/validate-frontend', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          address: selectedPlace.formatted_address,
          placeId: selectedPlace.place_id,
          coordinates: {
            lat: selectedPlace.geometry?.location?.lat(),
            lng: selectedPlace.geometry?.location?.lng()
          }
        }),
      });

      console.log('Response status:', response.status);
      const data = await response.json();
      console.log('Response data:', data);

      if (response.ok) {
        setResult(data);
      } else {
        setError(data.error || 'Something went wrong');
      }
    } catch (err) {
      console.error('Error:', err);
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
        
        <form 
          onSubmit={(e) => {
            console.log('Form submitted');
            handleValidate(e);
          }} 
          className={styles.formContainer}
        >
          <div className={styles.inputWrapper}>
            <AddressAutocomplete
              value={address}
              onChange={(val) => {
                console.log('Address changed:', val);
                setAddress(val);
              }}
              onSelect={(place) => {
                console.log('Place selected:', place);
                handleAddressSelect(place);
              }}
              disabled={isLoading}
            />
          </div>
          <button 
            type="submit"
            disabled={isLoading || !selectedPlace}
            className={styles.validateButton}
            onClick={() => console.log('Button clicked')}
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
          </div>
        )}
      </main>
    </div>
  );
} 
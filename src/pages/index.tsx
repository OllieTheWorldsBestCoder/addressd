import { useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import styles from '../styles/Home.module.css';
import AddressAutocomplete from '../components/AddressAutocomplete';
import AddressFeedback from '../components/AddressFeedback';

interface AddressResult {
  summary: string;
  uploadLink: string;
  addressId: string;
}

export default function Home() {
  const [address, setAddress] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<AddressResult | null>(null);
  const [selectedPlace, setSelectedPlace] = useState<google.maps.places.PlaceResult | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!address.trim()) return;

    setIsLoading(true);
    setError('');
    setResult(null);

    try {
      const response = await fetch('/api/address/validate-frontend', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ address }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to validate address');
      }

      setResult(data);
    } catch (err) {
      console.error('Error validating address:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddressSelect = (place: google.maps.places.PlaceResult) => {
    setSelectedPlace(place);
    if (place.formatted_address) {
      setAddress(place.formatted_address);
    }
  };

  return (
    <div className={styles.container}>
      <Head>
        <title>addressd - Address Validation</title>
        <meta name="description" content="Validate and contribute to address information" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

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

        <Link href="/signup" className={styles.apiLink}>
          Get API Access →
        </Link>

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
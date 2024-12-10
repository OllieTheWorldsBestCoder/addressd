import { useState, useEffect } from 'react';
import { FiArrowRight } from 'react-icons/fi';
import AddressAutocomplete from './AddressAutocomplete';

interface AddressResult {
  summary: string;
  uploadLink: string;
  addressId: string;
}

const loadingMessages = [
  "Finding the location...",
  "Looking up nearby landmarks...",
  "Generating natural directions...",
  "Making the description helpful...",
  "Almost there..."
];

export default function AddressSearch() {
  const [address, setAddress] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<AddressResult | null>(null);
  const [selectedPlace, setSelectedPlace] = useState<google.maps.places.PlaceResult | null>(null);
  const [loadingMessageIndex, setLoadingMessageIndex] = useState(0);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isLoading) {
      interval = setInterval(() => {
        setLoadingMessageIndex((current) => 
          current === loadingMessages.length - 1 ? current : current + 1
        );
      }, 2000);
    } else {
      setLoadingMessageIndex(0);
    }
    return () => clearInterval(interval);
  }, [isLoading]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!address.trim()) return;

    const addressToSubmit = selectedPlace?.formatted_address || address;
    console.log('[AddressSearch] Submitting address:', {
      typed: address,
      selected: selectedPlace?.formatted_address,
      final: addressToSubmit
    });

    setIsLoading(true);
    setError('');
    setResult(null);

    try {
      const response = await fetch('/api/address/validate-frontend', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ address: addressToSubmit }),
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
    console.log('[AddressSearch] Place selected:', place);
    if (place.formatted_address) {
      setSelectedPlace(place);
      setAddress(place.formatted_address);
      // Remove auto-submit for now to debug the issue
      // const syntheticEvent = {
      //   preventDefault: () => {},
      // } as React.FormEvent;
      // handleSubmit(syntheticEvent);
    }
  };

  const handleAddressChange = (val: string) => {
    console.log('[AddressSearch] Address changed:', val);
    setAddress(val);
    // Only clear selected place if the user is actively changing the input
    if (selectedPlace?.formatted_address && val !== selectedPlace.formatted_address) {
      console.log('[AddressSearch] Clearing selected place');
      setSelectedPlace(null);
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      <form onSubmit={handleSubmit} className="relative">
        <div className="flex gap-3">
          <AddressAutocomplete
            value={address}
            onChange={handleAddressChange}
            onSelect={handleAddressSelect}
            disabled={isLoading}
            className="flex-1 px-6 py-4 text-lg border-2 border-gray-200 rounded-lg focus:border-secondary focus:ring-2 focus:ring-secondary focus:ring-opacity-20 transition-all"
            placeholder="Enter an address ..."
          />
          <button
            type="submit"
            disabled={isLoading || !address.trim()}
            className="w-14 h-14 bg-primary text-white rounded-lg hover:bg-primary-dark transition-all flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label={isLoading ? "Finding..." : "Get Directions"}
          >
            <FiArrowRight className="w-6 h-6" />
          </button>
        </div>
      </form>

      {isLoading && (
        <div className="mt-4 flex items-center justify-center gap-3 text-gray-500">
          <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <span className="min-w-[200px] text-center transition-all duration-300">
            {loadingMessages[loadingMessageIndex]}
          </span>
        </div>
      )}

      {error && (
        <div className="mt-4 bg-red-50 text-red-600 p-4 rounded-lg">
          {error}
        </div>
      )}

      {result && (
        <div className="mt-6 bg-white p-6 rounded-lg shadow-lg">
          <h2 className="text-2xl font-semibold mb-4">Found your address</h2>
          <p className="text-gray-700 mb-4">
            <strong>Summary:</strong> {result.summary}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href={result.uploadLink}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors"
            >
              Add Description
            </a>
          </div>
        </div>
      )}
    </div>
  );
} 
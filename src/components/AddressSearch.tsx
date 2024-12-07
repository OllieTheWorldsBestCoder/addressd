import { useState } from 'react';
import { FiArrowRight } from 'react-icons/fi';
import AddressAutocomplete from './AddressAutocomplete';

interface AddressResult {
  summary: string;
  uploadLink: string;
  addressId: string;
}

export default function AddressSearch() {
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
    <div className="max-w-3xl mx-auto">
      <form onSubmit={handleSubmit} className="relative">
        <div className="flex">
          <AddressAutocomplete
            value={address}
            onChange={(val: string) => {
              setAddress(val);
              if (!selectedPlace?.formatted_address || val !== selectedPlace.formatted_address) {
                setSelectedPlace(null);
              }
            }}
            onSelect={handleAddressSelect}
            disabled={isLoading}
            className="flex-1 px-6 py-4 text-lg border-2 border-gray-200 rounded-l-lg focus:border-secondary focus:ring-2 focus:ring-secondary focus:ring-opacity-20 transition-all"
            placeholder="Enter an address to add directions..."
          />
          <button
            type="submit"
            disabled={isLoading || !address.trim()}
            className="px-6 py-4 bg-primary text-white rounded-r-lg hover:bg-primary-dark transition-all flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed min-w-[160px]"
          >
            <span>{isLoading ? 'Finding...' : 'Get Directions'}</span>
            <FiArrowRight className="ml-2" />
          </button>
        </div>
      </form>

      {error && (
        <div className="mt-4 bg-red-50 text-red-600 p-4 rounded-lg">
          {error}
        </div>
      )}

      {result && (
        <div className="mt-6 bg-white p-6 rounded-lg shadow-lg">
          <h2 className="text-2xl font-semibold mb-4">Address Validated</h2>
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
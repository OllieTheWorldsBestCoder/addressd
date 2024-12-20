import { useState, useEffect, useCallback } from 'react';
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

    // Check if address is too short
    if (address.length < 5) {
      setError('Please enter more details about the address');
      return;
    }

    console.log('[AddressSearch] Validating address:', address);

    // Use Google Geocoding API to validate address components
    try {
      const geocoder = new google.maps.Geocoder();
      const result = await new Promise<google.maps.GeocoderResult[]>((resolve, reject) => {
        geocoder.geocode({ address }, (results: google.maps.GeocoderResult[], status: google.maps.GeocoderStatus) => {
          if (status === 'OK' && results) {
            resolve(results);
          } else {
            reject(status);
          }
        });
      });

      if (result.length === 0) {
        setError('Address not found. Please check the address and try again.');
        return;
      }

      const addressComponents = result[0].address_components;
      const hasStreetNumber = addressComponents.some(component => 
        component.types.includes('street_number')
      );
      const hasRoute = addressComponents.some(component => 
        component.types.includes('route')
      );
      const hasPostalCode = addressComponents.some(component => 
        component.types.includes('postal_code')
      );

      // Check if we only have a postal code without street information
      if (hasPostalCode && (!hasStreetNumber || !hasRoute)) {
        setError('Please enter a complete address including street name and number, not just a postcode');
        return;
      }

      // Check if we're missing essential address components
      if (!hasStreetNumber || !hasRoute) {
        setError('Please provide more details like street number and street name');
        return;
      }

      console.log('[AddressSearch] Submitting validated address:', address);

      setIsLoading(true);
      setError('');
      setResult(null);

      const response = await fetch('/api/address/validate-frontend', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          address,
          geocoded: result[0].formatted_address 
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to validate address');
      }

      setResult(data);
    } catch (err) {
      console.error('Error validating address:', err);
      if (err === 'ZERO_RESULTS') {
        setError('Address not found. Please check the address and try again.');
      } else {
        setError('Please provide a valid address with street number and name');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddressSelect = useCallback((place: google.maps.places.PlaceResult) => {
    console.log('[AddressSearch] Place selected:', place);
    if (place.formatted_address) {
      setAddress(place.formatted_address);
      console.log('[AddressSearch] Address state updated to:', place.formatted_address);
    }
  }, []);

  const handleAddressChange = useCallback((val: string) => {
    console.log('[AddressSearch] Address changed:', val);
    setAddress(val);
  }, []);

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
            placeholder="Enter a delivery address to get clear directions..."
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
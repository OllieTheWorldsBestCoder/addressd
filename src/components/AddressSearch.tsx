import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiSearch, FiMapPin, FiImage, FiCpu } from 'react-icons/fi';

interface LoadingState {
  message: string;
  icon: JSX.Element;
}

const loadingStates: LoadingState[] = [
  { message: "Finding your location...", icon: <FiMapPin className="w-6 h-6" /> },
  { message: "Gathering visual landmarks...", icon: <FiImage className="w-6 h-6" /> },
  { message: "Generating AI description...", icon: <FiCpu className="w-6 h-6" /> }
];

export default function AddressSearch() {
  const [address, setAddress] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStateIndex, setLoadingStateIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    setLoadingStateIndex(0);

    // Start cycling through loading states
    const interval = setInterval(() => {
      setLoadingStateIndex((prev) => (prev + 1) % loadingStates.length);
    }, 2000);

    try {
      const response = await fetch('/api/address/validate-frontend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to process address');
      }

      // Redirect to the upload page
      window.location.href = data.uploadLink;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      clearInterval(interval);
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="relative">
          <input
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Enter your business address..."
            className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary focus:border-primary pl-12"
            disabled={isLoading}
          />
          <FiSearch className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
        </div>

        <button
          type="submit"
          disabled={isLoading || !address.trim()}
          className={`w-full py-3 px-6 rounded-lg bg-primary text-white font-medium transition-all
            ${isLoading ? 'opacity-75 cursor-not-allowed' : 'hover:bg-primary-dark'}
          `}
        >
          {isLoading ? 'Processing...' : 'Get Directions'}
        </button>
      </form>

      <AnimatePresence mode="wait">
        {isLoading && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="mt-8 text-center"
          >
            <motion.div
              key={loadingStateIndex}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="flex items-center justify-center space-x-3"
            >
              {loadingStates[loadingStateIndex].icon}
              <span className="text-lg text-gray-700">
                {loadingStates[loadingStateIndex].message}
              </span>
            </motion.div>
            <div className="mt-4 flex justify-center">
              <div className="w-2 h-2 bg-primary rounded-full mx-1 animate-bounce" style={{ animationDelay: '0ms' }} />
              <div className="w-2 h-2 bg-primary rounded-full mx-1 animate-bounce" style={{ animationDelay: '300ms' }} />
              <div className="w-2 h-2 bg-primary rounded-full mx-1 animate-bounce" style={{ animationDelay: '600ms' }} />
            </div>
          </motion.div>
        )}

        {error && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="mt-4 p-3 rounded-lg bg-red-50 text-red-600 text-center"
          >
            {error}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
} 
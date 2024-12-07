import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiSearch, FiMapPin, FiImage, FiCpu, FiArrowRight } from 'react-icons/fi';

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
      <form onSubmit={handleSubmit} className="relative">
        <div className="flex">
          <div className="flex-1 relative">
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Enter your business address..."
              className="w-full h-14 px-4 rounded-l-lg border border-gray-300 focus:ring-2 focus:ring-primary focus:border-primary pl-12"
              disabled={isLoading}
            />
            <FiSearch className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          </div>
          
          <button
            type="submit"
            disabled={isLoading || !address.trim()}
            className={`h-14 w-14 flex items-center justify-center rounded-r-lg transition-all
              ${address.trim() 
                ? 'bg-primary text-white hover:bg-primary-dark' 
                : 'bg-gray-100 text-gray-400 cursor-not-allowed'}`}
          >
            <FiArrowRight className={`w-6 h-6 transition-transform ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        <AnimatePresence mode="wait">
          {isLoading && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="absolute left-0 right-0 top-16 text-center"
            >
              <motion.div
                key={loadingStateIndex}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="flex items-center justify-center space-x-3 bg-white/80 backdrop-blur-sm rounded-lg py-2 px-4 shadow-sm"
              >
                {loadingStates[loadingStateIndex].icon}
                <span className="text-sm text-gray-700">
                  {loadingStates[loadingStateIndex].message}
                </span>
              </motion.div>
            </motion.div>
          )}

          {error && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="absolute left-0 right-0 top-16 p-3 rounded-lg bg-red-50 text-red-600 text-center text-sm"
            >
              {error}
            </motion.div>
          )}
        </AnimatePresence>
      </form>
    </div>
  );
} 
</```
rewritten_file>
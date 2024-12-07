import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { 
  FiSearch, 
  FiArrowRight, 
  FiCheck, 
  FiShield, 
  FiZap, 
  FiCpu, 
  FiAperture, 
  FiTrendingUp, 
  FiMapPin, 
  FiGift 
} from 'react-icons/fi';
import Layout from '../components/Layout';
import AddressAutocomplete from '../components/AddressAutocomplete';
import AddressFeedback from '../components/AddressFeedback';
import { auth } from '../config/firebase';
import { User } from 'firebase/auth';
import AddressSearch from '../components/AddressSearch';

// Declare the google namespace to ensure PlaceResult type is available
declare global {
  interface Window {
    google: {
      maps: {
        places: {
          PlaceResult: any;
        };
      };
    };
  }
}

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
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setUser(user);
    });
    return () => unsubscribe();
  }, []);

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
    <Layout>
      <Head>
        <title>addressd - Natural Language Directions for Better Deliveries</title>
        <meta name="description" content="Help delivery drivers and customers find exact locations with natural language directions. Save time and improve delivery success rates." />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
        {/* Hero Section */}
        <div className="container mx-auto px-4 pt-20 pb-32">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center max-w-7xl mx-auto"
          >
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
              <h1 className="text-4xl sm:text-5xl font-bold text-center mb-8">
                Enhance Deliveries with Natural Language Directions
              </h1>
              <p className="text-xl text-gray-600 text-center mb-12">
                Reduce failed deliveries by up to 20% with clear, accurate location guidance
              </p>
              <AddressSearch />
            </div>

            {/* Feature Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-24 max-w-7xl mx-auto">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="card"
              >
                <div className="flex items-center mb-4">
                  <div className="p-2 bg-violet-100 rounded-lg">
                    <FiAperture className="text-2xl text-violet-600" />
                  </div>
                  <h3 className="text-xl font-semibold ml-3">AI-Powered</h3>
                </div>
                <p className="text-gray-600">
                  Advanced AI that understands context and generates natural, human-friendly directions
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="card"
              >
                <div className="flex items-center mb-4">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <FiMapPin className="text-2xl text-primary" />
                  </div>
                  <h3 className="text-xl font-semibold ml-3">Smart Context</h3>
                </div>
                <p className="text-gray-600">
                  Identifies key landmarks and reference points for easier navigation
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="card"
              >
                <div className="flex items-center mb-4">
                  <div className="p-2 bg-accent/10 rounded-lg">
                    <FiGift className="text-2xl text-accent" />
                  </div>
                  <h3 className="text-xl font-semibold ml-3">Earn Credits</h3>
                </div>
                <p className="text-gray-600">
                  Contribute descriptions to earn free API credits and reduce your costs
                </p>
              </motion.div>
            </div>

            {/* AI Technology Section */}
            <div className="mt-32 max-w-7xl mx-auto">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="text-center mb-16"
              >
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-violet-100 text-violet-800 mb-4">
                  <FiZap className="mr-1" />
                  Powered by Advanced AI
                </span>
                <h2 className="text-4xl font-bold text-gray-900 mb-6">
                  Smart Location Understanding
                </h2>
                <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                  Our AI analyzes building layouts, landmarks, and user feedback to generate the most helpful directions
                </p>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </main>
    </Layout>
  );
}

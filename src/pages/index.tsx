import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { FiSearch, FiArrowRight, FiCheck, FiShield } from 'react-icons/fi';
import Layout from '../components/Layout';
import AddressAutocomplete from '../components/AddressAutocomplete';
import AddressFeedback from '../components/AddressFeedback';
import { auth } from '../config/firebase';
import { User } from 'firebase/auth';

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
        <title>Addressd - Natural Language Directions for Better Deliveries</title>
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
            className="text-center max-w-3xl mx-auto"
          >
            <h1 className="text-5xl font-bold text-primary mb-6">
              Beyond Just Addresses
            </h1>
            <p className="text-xl text-gray-600 mb-12">
              Help delivery drivers and customers find your exact location with natural language directions.
              Reduce failed deliveries and improve customer experience.
            </p>

            {/* Main Input Form */}
            <form onSubmit={handleSubmit} className="max-w-2xl mx-auto mb-16">
              <div className="relative">
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
                  className="w-full px-6 py-4 text-lg border-2 border-gray-200 rounded-full shadow-md focus:border-secondary focus:ring-2 focus:ring-secondary focus:ring-opacity-20 transition-all"
                  placeholder="Enter an address to add directions..."
                />
                <button
                  type="submit"
                  disabled={isLoading || !address.trim()}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-primary text-white px-6 py-2 rounded-full hover:bg-primary-light transition-all flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span>{isLoading ? 'Validating...' : 'Add Directions'}</span>
                  <FiArrowRight className="ml-2" />
                </button>
              </div>
            </form>

            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-red-50 text-red-600 p-4 rounded-lg mb-8"
              >
                {error}
              </motion.div>
            )}

            {result && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white p-6 rounded-xl shadow-lg mb-12"
              >
                <h2 className="text-2xl font-semibold mb-4">Address Validated</h2>
                <p className="text-gray-700 mb-4">
                  <strong>Summary:</strong> {result.summary}
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <a
                    href={result.uploadLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="button button-primary"
                  >
                    Add Description
                  </a>
                  {user && (
                    <Link href="/profile" className="button button-outline">
                      View in Profile
                    </Link>
                  )}
                </div>
                <AddressFeedback
                  addressId={result.addressId}
                  inputAddress={address}
                  matchedAddress={selectedPlace?.formatted_address || address}
                />
              </motion.div>
            )}

            {/* Feature Highlights */}
            <div className="grid md:grid-cols-3 gap-8 text-left mt-16">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="card"
              >
                <div className="flex items-center mb-4">
                  <div className="p-2 bg-secondary bg-opacity-10 rounded-lg">
                    <FiCheck className="text-2xl text-secondary" />
                  </div>
                  <h3 className="text-xl font-semibold ml-3">Natural Language</h3>
                </div>
                <p className="text-gray-600">
                  Clear, human-friendly directions that guide people to the exact location
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="card"
              >
                <div className="flex items-center mb-4">
                  <div className="p-2 bg-accent bg-opacity-10 rounded-lg">
                    <FiShield className="text-2xl text-accent" />
                  </div>
                  <h3 className="text-xl font-semibold ml-3">Earn Credits</h3>
                </div>
                <p className="text-gray-600">
                  Contribute descriptions to earn free API credits and reduce your costs
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="card"
              >
                <div className="flex items-center mb-4">
                  <div className="p-2 bg-primary bg-opacity-10 rounded-lg">
                    <FiSearch className="text-2xl text-primary" />
                  </div>
                  <h3 className="text-xl font-semibold ml-3">Delivery Focused</h3>
                </div>
                <p className="text-gray-600">
                  Save time and reduce failed deliveries with precise location guidance
                </p>
              </motion.div>
            </div>
          </motion.div>
        </div>

        {/* CTA Section */}
        <div className="bg-primary text-white py-20">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-3xl font-bold mb-6">
              Ready to Improve Delivery Success?
            </h2>
            <p className="text-xl mb-8 text-gray-300">
              Join delivery companies and businesses using Addressd to provide better location guidance.
            </p>
            <Link
              href={user ? '/profile' : '/signup'}
              className="inline-flex items-center px-8 py-3 bg-white text-primary rounded-full font-semibold hover:bg-gray-100 transition-all"
            >
              {user ? 'Go to Dashboard' : 'Start Free Trial'}
              <FiArrowRight className="ml-2" />
            </Link>
          </div>
        </div>
      </main>
    </Layout>
  );
}

import { useState } from 'react';
import Head from 'next/head';
import { motion } from 'framer-motion';
import { FiCode, FiLock, FiZap, FiGift, FiArrowRight } from 'react-icons/fi';
import Layout from '../components/Layout';

export default function SignUp() {
  return (
    <Layout>
      <Head>
        <title>Sign Up for API Access - addressd</title>
        <meta name="description" content="Get API access to addressd's natural language directions for your delivery or logistics platform." />
      </Head>

      <main className="min-h-screen bg-gradient-to-b from-gray-50 to-white py-20">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="max-w-4xl mx-auto"
          >
            {/* Header */}
            <div className="text-center mb-12">
              <h1 className="text-4xl sm:text-5xl font-bold mb-4">
                Sign Up for API Access
              </h1>
              <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                Get started with addressd's powerful API to add natural language directions to your platform
              </p>
            </div>

            {/* Features Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
              <div className="bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition-shadow">
                <div className="flex items-center mb-4">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <FiCode className="text-2xl text-primary" />
                  </div>
                  <h3 className="text-xl font-semibold ml-3">Simple Integration</h3>
                </div>
                <p className="text-gray-600">
                  Easy-to-use REST API with comprehensive documentation and example code in multiple languages.
                </p>
              </div>

              <div className="bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition-shadow">
                <div className="flex items-center mb-4">
                  <div className="p-2 bg-violet-100 rounded-lg">
                    <FiLock className="text-2xl text-violet-600" />
                  </div>
                  <h3 className="text-xl font-semibold ml-3">Secure Access</h3>
                </div>
                <p className="text-gray-600">
                  Industry-standard authentication and rate limiting to keep your data safe and your service reliable.
                </p>
              </div>

              <div className="bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition-shadow">
                <div className="flex items-center mb-4">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <FiZap className="text-2xl text-green-600" />
                  </div>
                  <h3 className="text-xl font-semibold ml-3">High Performance</h3>
                </div>
                <p className="text-gray-600">
                  Fast response times with 99.9% uptime SLA and global CDN distribution for low latency.
                </p>
              </div>

              <div className="bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition-shadow">
                <div className="flex items-center mb-4">
                  <div className="p-2 bg-orange-100 rounded-lg">
                    <FiGift className="text-2xl text-orange-600" />
                  </div>
                  <h3 className="text-xl font-semibold ml-3">Free Credits</h3>
                </div>
                <p className="text-gray-600">
                  Start with 1,000 free API calls and earn more credits by contributing to our location database.
                </p>
              </div>
            </div>

            {/* Code Preview */}
            <div className="bg-gray-900 rounded-xl p-6 mb-12 overflow-hidden">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center">
                  <div className="w-3 h-3 rounded-full bg-red-400 mr-2"></div>
                  <div className="w-3 h-3 rounded-full bg-yellow-400 mr-2"></div>
                  <div className="w-3 h-3 rounded-full bg-green-400"></div>
                </div>
                <span className="text-gray-400 text-sm">Example API Request</span>
              </div>
              <pre className="text-gray-300 font-mono text-sm overflow-x-auto">
                <code>{`curl -X POST https://api.addressd.co/v1/directions \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "address": "123 Main St, City, Country"
  }'`}</code>
              </pre>
            </div>

            {/* Sign Up Button */}
            <div className="text-center">
              <button
                onClick={() => {
                  const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID}&redirect_uri=${encodeURIComponent(process.env.NEXT_PUBLIC_BASE_URL + '/auth/callback')}&response_type=code&scope=email%20profile&access_type=offline`;
                  window.location.href = googleAuthUrl;
                }}
                className="inline-flex items-center px-8 py-4 bg-primary text-white rounded-lg font-semibold hover:bg-primary-dark transition-colors text-lg"
              >
                Sign in with Google
                <FiArrowRight className="ml-2" />
              </button>
              <p className="mt-4 text-sm text-gray-500">
                By signing up, you agree to our{' '}
                <a href="/terms" className="text-primary hover:underline">Terms of Service</a>
                {' '}and{' '}
                <a href="/privacy" className="text-primary hover:underline">Privacy Policy</a>
              </p>
            </div>
          </motion.div>
        </div>
      </main>
    </Layout>
  );
} 
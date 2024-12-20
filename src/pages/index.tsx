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
  FiGift,
  FiCode,
  FiBox,
  FiLayers
} from 'react-icons/fi';
import Layout from '../components/Layout';
import AddressSearch from '../components/AddressSearch';
import { auth } from '../config/firebase';
import { User } from 'firebase/auth';

export default function Home() {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setUser(user);
    });
    return () => unsubscribe();
  }, []);

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

              <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 }}
                  className="bg-gradient-to-br from-violet-600 to-indigo-600 rounded-2xl p-8 text-white"
                >
                  <div className="space-y-6">
                    <div className="flex items-start space-x-4">
                      <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0">
                        <FiCpu className="text-white" />
                      </div>
                      <div>
                        <h3 className="font-semibold mb-1">Natural Language Processing</h3>
                        <p className="text-white/80">Transforms complex addresses into clear, conversational directions</p>
                      </div>
                    </div>
                    <div className="flex items-start space-x-4">
                      <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0">
                        <FiAperture className="text-white" />
                      </div>
                      <div>
                        <h3 className="font-semibold mb-1">Context Analysis</h3>
                        <p className="text-white/80">Identifies and prioritizes the most helpful navigation landmarks</p>
                      </div>
                    </div>
                    <div className="flex items-start space-x-4">
                      <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0">
                        <FiTrendingUp className="text-white" />
                      </div>
                      <div>
                        <h3 className="font-semibold mb-1">Continuous Learning</h3>
                        <p className="text-white/80">Improves accuracy through user feedback and real-world data</p>
                      </div>
                    </div>
                  </div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 }}
                  className="grid grid-cols-2 gap-6"
                >
                  <div className="bg-white rounded-xl shadow-lg p-6 text-center">
                    <div className="text-4xl font-bold text-violet-600 mb-2">95%</div>
                    <div className="text-gray-600">Accuracy Rate</div>
                  </div>
                  <div className="bg-white rounded-xl shadow-lg p-6 text-center">
                    <div className="text-4xl font-bold text-violet-600 mb-2">500k+</div>
                    <div className="text-gray-600">Locations</div>
                  </div>
                  <div className="bg-white rounded-xl shadow-lg p-6 text-center">
                    <div className="text-4xl font-bold text-violet-600 mb-2">24/7</div>
                    <div className="text-gray-600">AI Learning</div>
                  </div>
                  <div className="bg-white rounded-xl shadow-lg p-6 text-center">
                    <div className="text-4xl font-bold text-violet-600 mb-2">20%</div>
                    <div className="text-gray-600">Delivery Improvement</div>
                  </div>
                </motion.div>
              </div>
            </div>

            {/* Integration Options */}
            <div className="mt-32 max-w-7xl mx-auto">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="text-center mb-16"
              >
                <h2 className="text-4xl font-bold text-gray-900 mb-6">
                  Multiple Ways to Integrate
                </h2>
                <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                  Choose the integration method that works best for your business
                </p>
              </motion.div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* Embed Option */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="bg-white rounded-xl shadow-lg p-8 md:col-span-3 mb-12"
                >
                  <div className="flex items-center mb-4">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <FiCode className="text-2xl text-primary" />
                    </div>
                    <h3 className="text-xl font-semibold ml-3">Embed Natural Directions</h3>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mt-8">
                    {/* Left side: Demo */}
                    <div>
                      <div className="bg-gray-50 rounded-xl p-6 transform hover:scale-[1.02] transition-transform duration-300">
                        <div className="flex items-center mb-4">
                          <div className="w-3 h-3 rounded-full bg-red-400 mr-2"></div>
                          <div className="w-3 h-3 rounded-full bg-yellow-400 mr-2"></div>
                          <div className="w-3 h-3 rounded-full bg-green-400"></div>
                        </div>
                        <div className="space-y-4">
                          <h4 className="text-lg font-semibold text-gray-900">Delivery Instructions</h4>
                          <p className="text-gray-600 text-sm leading-relaxed">
                            Look for a modern glass-fronted building with a distinctive blue awning. 
                            The entrance is on the right side as you approach from High Street. 
                            You'll see a café at street level and clear signage.
                          </p>
                          <div className="flex items-center text-sm text-gray-500">
                            <FiCheck className="text-green-500 mr-2" />
                            Verified by addressd
                          </div>
                        </div>
                      </div>

                      {/* Code Preview */}
                      <div className="mt-6 bg-gray-900 rounded-xl p-6 overflow-hidden">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center">
                            <div className="w-3 h-3 rounded-full bg-red-400 mr-2"></div>
                            <div className="w-3 h-3 rounded-full bg-yellow-400 mr-2"></div>
                            <div className="w-3 h-3 rounded-full bg-green-400"></div>
                          </div>
                          <span className="text-gray-400 text-sm">embed.html</span>
                        </div>
                        <pre className="text-gray-300 font-mono text-sm overflow-x-auto">
                          <code>{`<div id="addressd-embed"></div>
<script src="https://addressd.co/embed.js" 
  data-address="your-address-id"
  data-theme="light">
</script>`}</code>
                        </pre>
                      </div>
                    </div>

                    {/* Right side: Features */}
                    <div className="space-y-6">
                      <div className="flex items-start">
                        <div className="p-2 bg-green-100 rounded-lg mt-1">
                          <FiCheck className="text-green-500" />
                        </div>
                        <div className="ml-4">
                          <h3 className="font-semibold text-gray-900">One-Line Integration</h3>
                          <p className="text-gray-600 text-sm">
                            Add the embed to your site with a single line of code. Works with any website or platform.
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start">
                        <div className="p-2 bg-blue-100 rounded-lg mt-1">
                          <FiShield className="text-blue-500" />
                        </div>
                        <div className="ml-4">
                          <h3 className="font-semibold text-gray-900">Verified Directions</h3>
                          <p className="text-gray-600 text-sm">
                            All directions are verified by our community and AI to ensure accuracy.
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start">
                        <div className="p-2 bg-purple-100 rounded-lg mt-1">
                          <FiBox className="text-purple-500" />
                        </div>
                        <div className="ml-4">
                          <h3 className="font-semibold text-gray-900">Custom Styling</h3>
                          <p className="text-gray-600 text-sm">
                            Match your brand with customizable themes, colors, and styles.
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start">
                        <div className="p-2 bg-orange-100 rounded-lg mt-1">
                          <FiTrendingUp className="text-orange-500" />
                        </div>
                        <div className="ml-4">
                          <h3 className="font-semibold text-gray-900">Analytics & Insights</h3>
                          <p className="text-gray-600 text-sm">
                            Track views, engagement, and how customers interact with your directions.
                          </p>
                        </div>
                      </div>

                      <div className="mt-8">
                        <Link
                          href="/embed"
                          className="inline-flex items-center px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors"
                        >
                          Try the Embed <FiArrowRight className="ml-2" />
                        </Link>
                      </div>
                    </div>
                  </div>
                </motion.div>

                {/* API Option */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="bg-white rounded-xl shadow-lg p-8"
                >
                  <div className="flex items-center mb-4">
                    <div className="p-2 bg-violet-100 rounded-lg">
                      <FiBox className="text-2xl text-violet-600" />
                    </div>
                    <h3 className="text-xl font-semibold ml-3">API</h3>
                  </div>
                  <p className="text-gray-600 mb-6">
                    Integrate natural language directions directly into your delivery or logistics platform.
                  </p>
                  <Link
                    href="/api"
                    className="inline-flex items-center text-primary hover:text-primary-dark"
                  >
                    View documentation <FiArrowRight className="ml-2" />
                  </Link>
                </motion.div>

                {/* Enterprise Option */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                  className="bg-white rounded-xl shadow-lg p-8"
                >
                  <div className="flex items-center mb-4">
                    <div className="p-2 bg-accent/10 rounded-lg">
                      <FiLayers className="text-2xl text-accent" />
                    </div>
                    <h3 className="text-xl font-semibold ml-3">Enterprise</h3>
                  </div>
                  <p className="text-gray-600 mb-6">
                    Custom solutions for large-scale operations with dedicated support and SLAs.
                  </p>
                  <Link
                    href="/contact"
                    className="inline-flex items-center text-primary hover:text-primary-dark"
                  >
                    Contact sales <FiArrowRight className="ml-2" />
                  </Link>
                </motion.div>
              </div>
            </div>
          </motion.div>
        </div>

        {/* CTA Section */}
        <div className="bg-primary text-white py-20">
          <div className="container max-w-7xl mx-auto px-4 text-center">
            <h2 className="text-3xl font-bold mb-6">
              Ready to Improve Delivery Success?
            </h2>
            <p className="text-xl mb-8 text-gray-300">
              Join delivery companies and businesses using addressd to provide better location guidance.
            </p>
            <Link
              href={user ? '/dashboard' : '/signup'}
              className="inline-flex items-center px-8 py-3 bg-white text-primary rounded-lg font-semibold hover:bg-gray-100 transition-all"
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

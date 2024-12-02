import { useState, useEffect } from 'react';
import Head from 'next/head';
import { motion } from 'framer-motion';
import { auth, db } from '../config/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { User } from '../types/user';
import { PlanType, BillingPlan } from '../types/billing';
import Link from 'next/link';
import Layout from '../components/Layout';
import { FiCode, FiBox, FiTrendingUp, FiZap, FiPlus, FiExternalLink } from 'react-icons/fi';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5
    }
  }
};

export default function Dashboard() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
          if (userDoc.exists()) {
            setUser(userDoc.data() as User);
          }
        } catch (err) {
          console.error('Error fetching user data:', err);
          setError('Failed to load user data');
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-pulse space-y-4">
            <div className="h-12 w-48 bg-gray-200 rounded"></div>
            <div className="h-4 w-32 bg-gray-200 rounded"></div>
          </div>
        </div>
      </Layout>
    );
  }

  if (!user) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-4xl font-bold mb-4">Sign in to view your dashboard</h1>
            <p className="text-gray-600">Please sign in to access your account dashboard.</p>
          </div>
        </div>
      </Layout>
    );
  }

  const getUsagePercentage = (plan: BillingPlan) => {
    if (!plan) return 0;
    const limit = plan.type === PlanType.API ? 1000 : 100;
    const usage = plan.currentUsage || 0;
    return Math.min((usage / limit) * 100, 100);
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat().format(num);
  };

  return (
    <Layout>
      <Head>
        <title>Dashboard - Addressd</title>
      </Head>

      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white pt-20 pb-32">
        <div className="container mx-auto px-4">
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="max-w-6xl mx-auto space-y-8"
          >
            {/* Header */}
            <motion.div variants={itemVariants} className="flex justify-between items-center">
              <div>
                <h1 className="text-4xl font-bold text-gray-900">Dashboard</h1>
                <p className="text-gray-600 mt-2">Monitor your API usage and embed performance</p>
              </div>
              <Link
                href="/pricing"
                className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors"
              >
                Upgrade Plan
              </Link>
            </motion.div>

            {/* Usage Stats */}
            <motion.section variants={itemVariants} className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {user.billing?.plans.map((plan, index) => (
                <div key={index} className="bg-white rounded-xl shadow-sm p-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        {plan.type === PlanType.API ? 'API Usage' : 'Embed Usage'}
                      </h3>
                      <p className="text-sm text-gray-500">This billing period</p>
                    </div>
                    {plan.type === PlanType.API ? (
                      <FiCode className="w-6 h-6 text-blue-500" />
                    ) : (
                      <FiBox className="w-6 h-6 text-purple-500" />
                    )}
                  </div>
                  <div className="mt-4">
                    <div className="flex justify-between text-sm text-gray-600 mb-1">
                      <span>{formatNumber(plan.currentUsage || 0)} calls</span>
                      <span>{plan.type === PlanType.API ? '1,000' : '100'} included</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          plan.type === PlanType.API ? 'bg-blue-500' : 'bg-purple-500'
                        }`}
                        style={{ width: `${getUsagePercentage(plan)}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </motion.section>

            {/* Quick Actions */}
            <motion.section variants={itemVariants} className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-sm p-6 text-white">
                <div className="flex items-start justify-between mb-4">
                  <h3 className="text-xl font-semibold">API Integration</h3>
                  <FiCode className="w-6 h-6" />
                </div>
                <p className="mb-6">Start integrating address validation into your application.</p>
                <div className="flex space-x-4">
                  <Link
                    href="/docs"
                    className="px-4 py-2 bg-white/10 rounded-lg hover:bg-white/20 transition-colors"
                  >
                    View Docs
                  </Link>
                  <button className="px-4 py-2 bg-white/10 rounded-lg hover:bg-white/20 transition-colors">
                    Copy API Key
                  </button>
                </div>
              </div>

              <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl shadow-sm p-6 text-white">
                <div className="flex items-start justify-between mb-4">
                  <h3 className="text-xl font-semibold">Embed Integration</h3>
                  <FiBox className="w-6 h-6" />
                </div>
                <p className="mb-6">Add address validation to your website with our embed solution.</p>
                <div className="flex space-x-4">
                  <Link
                    href="/embed"
                    className="px-4 py-2 bg-white/10 rounded-lg hover:bg-white/20 transition-colors"
                  >
                    Create Embed
                  </Link>
                  <Link
                    href="/docs#embed"
                    className="px-4 py-2 bg-white/10 rounded-lg hover:bg-white/20 transition-colors"
                  >
                    Learn More
                  </Link>
                </div>
              </div>
            </motion.section>

            {/* Product Prompts */}
            <motion.section variants={itemVariants} className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
                <div className="flex items-start justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Boost Accuracy</h3>
                  <FiTrendingUp className="w-6 h-6 text-green-500" />
                </div>
                <p className="text-gray-600 mb-6">
                  Improve address validation accuracy with our advanced validation rules.
                </p>
                <Link
                  href="/docs#validation-rules"
                  className="inline-flex items-center text-gray-600 hover:text-gray-900"
                >
                  Learn more <FiExternalLink className="ml-2 w-4 h-4" />
                </Link>
              </div>

              <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
                <div className="flex items-start justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Custom Rules</h3>
                  <FiZap className="w-6 h-6 text-yellow-500" />
                </div>
                <p className="text-gray-600 mb-6">
                  Create custom validation rules tailored to your business needs.
                </p>
                <Link
                  href="/docs#custom-rules"
                  className="inline-flex items-center text-gray-600 hover:text-gray-900"
                >
                  Learn more <FiExternalLink className="ml-2 w-4 h-4" />
                </Link>
              </div>

              <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
                <div className="flex items-start justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Bulk Validation</h3>
                  <FiPlus className="w-6 h-6 text-indigo-500" />
                </div>
                <p className="text-gray-600 mb-6">
                  Validate multiple addresses at once with our bulk validation feature.
                </p>
                <Link
                  href="/docs#bulk-validation"
                  className="inline-flex items-center text-gray-600 hover:text-gray-900"
                >
                  Learn more <FiExternalLink className="ml-2 w-4 h-4" />
                </Link>
              </div>
            </motion.section>
          </motion.div>
        </div>
      </div>
    </Layout>
  );
} 
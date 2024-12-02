import { useState, useEffect } from 'react';
import Head from 'next/head';
import { motion } from 'framer-motion';
import { auth, db } from '../config/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { User as FirebaseUser } from 'firebase/auth';
import { User } from '../types/user';
import { PlanType, BillingPlan, ApiPlan } from '../types/billing';
import Link from 'next/link';
import Layout from '../components/Layout';
import { FiCode, FiBox, FiTrendingUp, FiZap, FiPlus, FiExternalLink, FiStar, FiCheck } from 'react-icons/fi';

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
  const [copySuccess, setCopySuccess] = useState(false);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (firebaseUser: FirebaseUser | null) => {
      if (firebaseUser) {
        try {
          const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
          if (userDoc.exists()) {
            const userData = userDoc.data() as User;
            // Ensure billing and plans exist and are arrays
            userData.billing = userData.billing || { plans: [] };
            userData.billing.plans = Array.isArray(userData.billing.plans) ? userData.billing.plans : [];
            setUser(userData);
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

  const getUsagePercentage = (plan: BillingPlan) => {
    if (!plan) return 0;
    
    try {
      switch (plan.type) {
        case PlanType.API:
          const apiPlan = plan as ApiPlan;
          return Math.min(((apiPlan.currentUsage || 0) / 1000) * 100, 100);
        case PlanType.EMBED:
          return plan.status === 'active' ? 100 : 0;
        case PlanType.ENTERPRISE:
          return 50;
        default:
          return 0;
      }
    } catch (err) {
      console.error('Error calculating usage percentage:', err);
      return 0;
    }
  };

  const getUsageDisplay = (plan: BillingPlan) => {
    if (!plan) return 'N/A';
    
    try {
      switch (plan.type) {
        case PlanType.API:
          const apiPlan = plan as ApiPlan;
          return `${formatNumber(apiPlan.currentUsage || 0)} / 1,000 deliveries`;
        case PlanType.EMBED:
          return plan.status === 'active' ? 'Active' : 'Inactive';
        case PlanType.ENTERPRISE:
          return 'Custom Usage';
        default:
          return 'N/A';
      }
    } catch (err) {
      console.error('Error getting usage display:', err);
      return 'N/A';
    }
  };

  const getPlanLimit = (plan: BillingPlan) => {
    try {
      switch (plan.type) {
        case PlanType.API:
          return '1,000 deliveries included';
        case PlanType.EMBED:
          return 'Unlimited directions';
        case PlanType.ENTERPRISE:
          return 'Custom limit';
        default:
          return '';
      }
    } catch (err) {
      console.error('Error getting plan limit:', err);
      return '';
    }
  };

  const formatNumber = (num: number) => {
    try {
      return new Intl.NumberFormat().format(num);
    } catch (err) {
      console.error('Error formatting number:', err);
      return '0';
    }
  };

  const handleCopyApiKey = async () => {
    try {
      if (!user?.authToken) {
        setError('No API token available');
        return;
      }
      
      await navigator.clipboard.writeText(user.authToken);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (error) {
      console.error('Failed to copy API token:', error);
      setError('Failed to copy API token to clipboard');
      setTimeout(() => setError(''), 3000);
    }
  };

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

  return (
    <Layout>
      <Head>
        <title>Dashboard - Addressd</title>
      </Head>

      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white pt-20 pb-32">
        <div className="container mx-auto px-4">
          {error && (
            <div className="max-w-6xl mx-auto mb-8">
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                {error}
              </div>
            </div>
          )}

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
                <p className="text-gray-600 mt-2">
                  Optimize deliveries with natural language directions
                </p>
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
              {Array.isArray(user?.billing?.plans) && user.billing.plans.length > 0 ? (
                user.billing.plans.map((plan, index) => (
                  <div key={index} className="bg-white rounded-xl shadow-sm p-6">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">
                          {plan?.type === PlanType.API ? 'Delivery Optimizations' : 
                           plan?.type === PlanType.EMBED ? 'Location Directions' : 
                           'Enterprise Usage'}
                        </h3>
                        <p className="text-sm text-gray-500">
                          {plan?.type === PlanType.API ? 'This billing period' :
                           plan?.type === PlanType.EMBED ? 'Current status' :
                           'Custom billing'}
                        </p>
                      </div>
                      {plan?.type === PlanType.API ? (
                        <FiCode className="w-6 h-6 text-blue-500" />
                      ) : plan?.type === PlanType.EMBED ? (
                        <FiBox className="w-6 h-6 text-purple-500" />
                      ) : (
                        <FiStar className="w-6 h-6 text-yellow-500" />
                      )}
                    </div>
                    <div className="mt-4">
                      <div className="flex justify-between text-sm text-gray-600 mb-1">
                        <span>{getUsageDisplay(plan)}</span>
                        <span>{getPlanLimit(plan)}</span>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            plan?.type === PlanType.API ? 'bg-blue-500' : 
                            plan?.type === PlanType.EMBED ? 'bg-purple-500' :
                            'bg-yellow-500'
                          } transition-all duration-500 ease-in-out`}
                          style={{ width: `${getUsagePercentage(plan)}%` }}
                        />
                      </div>
                      {plan?.type === PlanType.API && (plan as ApiPlan).currentUsage > 800 && (
                        <p className="mt-2 text-sm text-orange-600">
                          Approaching limit. Consider upgrading your plan to optimize more deliveries.
                        </p>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="col-span-3 text-center p-8 bg-white rounded-xl shadow-sm">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No Active Plans</h3>
                  <p className="text-gray-600 mb-4">Start optimizing your deliveries with our plans.</p>
                  <Link
                    href="/pricing"
                    className="inline-flex items-center px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors"
                  >
                    View Plans
                  </Link>
                </div>
              )}
            </motion.section>

            {/* Quick Actions */}
            <motion.section variants={itemVariants} className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-sm p-6 text-white">
                <div className="flex items-start justify-between mb-4">
                  <h3 className="text-xl font-semibold">API Integration</h3>
                  <FiCode className="w-6 h-6" />
                </div>
                <p className="mb-6">
                  Enhance your delivery service with precise, natural language directions. 
                  Reduce failed deliveries and improve driver efficiency.
                </p>
                <div className="flex space-x-4">
                  <Link
                    href="/docs"
                    className="px-4 py-2 bg-white/10 rounded-lg hover:bg-white/20 transition-colors"
                  >
                    View Docs
                  </Link>
                  <button 
                    onClick={handleCopyApiKey}
                    className="px-4 py-2 bg-white/10 rounded-lg hover:bg-white/20 transition-colors flex items-center"
                    disabled={!user?.authToken}
                  >
                    {copySuccess ? (
                      <>
                        <FiCheck className="mr-2" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <FiCode className="mr-2" />
                        Copy API Token
                      </>
                    )}
                  </button>
                </div>
              </div>

              <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl shadow-sm p-6 text-white">
                <div className="flex items-start justify-between mb-4">
                  <h3 className="text-xl font-semibold">Embed Integration</h3>
                  <FiBox className="w-6 h-6" />
                </div>
                <p className="mb-6">
                  Help customers find your exact location with clear, natural language directions.
                  Perfect for business websites and contact pages.
                </p>
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
                  <h3 className="text-lg font-semibold text-gray-900">Contribute & Save</h3>
                  <FiTrendingUp className="w-6 h-6 text-green-500" />
                </div>
                <p className="text-gray-600 mb-6">
                  Add detailed location descriptions to earn free API credits. Help improve delivery success rates while reducing your costs.
                </p>
                <Link
                  href="/contribute"
                  className="inline-flex items-center text-gray-600 hover:text-gray-900"
                >
                  Start Contributing <FiExternalLink className="ml-2 w-4 h-4" />
                </Link>
              </div>

              <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
                <div className="flex items-start justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Optimize Deliveries</h3>
                  <FiZap className="w-6 h-6 text-yellow-500" />
                </div>
                <p className="text-gray-600 mb-6">
                  Track delivery success rates and optimize routes with clear, natural language directions.
                </p>
                <Link
                  href="/docs#optimization"
                  className="inline-flex items-center text-gray-600 hover:text-gray-900"
                >
                  View Guide <FiExternalLink className="ml-2 w-4 h-4" />
                </Link>
              </div>

              <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
                <div className="flex items-start justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Add New Location</h3>
                  <FiPlus className="w-6 h-6 text-blue-500" />
                </div>
                <p className="text-gray-600 mb-6">
                  Create detailed, natural language directions for a new location to help drivers find it easily.
                </p>
                <Link
                  href="/"
                  className="inline-flex items-center text-gray-600 hover:text-gray-900"
                >
                  Add Location <FiExternalLink className="ml-2 w-4 h-4" />
                </Link>
              </div>
            </motion.section>
          </motion.div>
        </div>
      </div>
    </Layout>
  );
} 
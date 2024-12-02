import { useState, useEffect } from 'react';
import Head from 'next/head';
import { motion } from 'framer-motion';
import { auth, db } from '../config/firebase';
import { GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { User } from '../types/user';
import { PlanType, BillingPlan, ApiPlan } from '../types/billing';
import { useRouter } from 'next/router';
import { Timestamp } from 'firebase/firestore';
import Link from 'next/link';
import Layout from '../components/Layout';
import { DeleteEmbedModal } from '../components/DeleteEmbedModal';
import { FiCopy, FiCheck, FiCode, FiUser, FiKey, FiStar, FiBox, FiDollarSign, FiExternalLink } from 'react-icons/fi';

interface ActiveEmbed {
  addressId: string;
  domain: string;
  createdAt: Date;
  lastUsed: Date;
  viewCount: number;
}

interface AddressDetails {
  formattedAddress: string;
  id: string;
}

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

// Helper function to get current usage based on plan type
const getCurrentUsage = (plan: BillingPlan) => {
  if (plan.type === PlanType.API) {
    return (plan as ApiPlan).currentUsage;
  }
  return 0;
};

export default function Profile() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedEmbed, setSelectedEmbed] = useState<ActiveEmbed | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const router = useRouter();
  const [addressDetails, setAddressDetails] = useState<{[key: string]: AddressDetails}>({});
  const [sectionLoading, setSectionLoading] = useState<{[key: string]: boolean}>({});
  const [sectionError, setSectionError] = useState<{[key: string]: string}>({});

  // Move fetchAddressDetails to component scope
  const fetchAddressDetails = async () => {
    if (!user?.embedAccess?.activeEmbeds) return;
    
    setSectionLoading(prev => ({ ...prev, embeds: true }));
    setSectionError(prev => ({ ...prev, embeds: '' }));
    
    const details: {[key: string]: AddressDetails} = {};
    
    try {
      for (const embed of user.embedAccess.activeEmbeds) {
        try {
          const addressDoc = await getDoc(doc(db, 'addresses', embed.addressId));
          if (addressDoc.exists()) {
            details[embed.addressId] = addressDoc.data() as AddressDetails;
          }
        } catch (error) {
          console.error('Error fetching address details:', error);
        }
      }
      
      setAddressDetails(details);
    } catch (error) {
      setSectionError(prev => ({ ...prev, embeds: 'Failed to load embed details' }));
    } finally {
      setSectionLoading(prev => ({ ...prev, embeds: false }));
    }
  };

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            const createdAt = userData.createdAt instanceof Timestamp ? 
              userData.createdAt.toDate() : 
              userData.createdAt;
            const updatedAt = userData.updatedAt instanceof Timestamp ? 
              userData.updatedAt.toDate() : 
              userData.updatedAt;
            
            setUser({
              ...userData,
              createdAt,
              updatedAt,
              id: userDoc.id
            } as User);
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

  useEffect(() => {
    fetchAddressDetails();
  }, [user?.embedAccess?.activeEmbeds]);

  const handleSignIn = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (err) {
      console.error('Error signing in:', err);
      setError('Failed to sign in');
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      router.push('/');
    } catch (err) {
      console.error('Error signing out:', err);
      setError('Failed to sign out');
    }
  };

  const handleDeleteEmbed = () => {
    // Close the modal
    setIsDeleteModalOpen(false);
    setSelectedEmbed(null);

    // Redirect to Stripe billing portal
    window.location.href = 'https://billing.stripe.com/p/login/7sIaHs5Vx1cq2DC9AA';
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
        <div className="min-h-screen flex flex-col items-center justify-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center"
          >
            <h1 className="text-4xl font-bold mb-8">Sign In to View Profile</h1>
            <button
              onClick={handleSignIn}
              className="flex items-center px-6 py-3 bg-white border border-gray-300 rounded-lg shadow-sm hover:shadow-md transition-all"
            >
              <img src="/google-icon.svg" alt="Google" className="w-6 h-6 mr-3" />
              <span>Sign in with Google</span>
            </button>
            {error && (
              <div className="mt-4 text-red-600 bg-red-50 px-4 py-2 rounded-lg">
                {error}
              </div>
            )}
          </motion.div>
        </div>
      </Layout>
    );
  }

  const formatDate = (date: Date) => {
    return date.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <Layout>
      <Head>
        <title>{user.name}'s Profile - Addressd</title>
      </Head>

      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white pt-20 pb-32">
        <div className="container mx-auto px-4">
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="max-w-6xl mx-auto"
          >
            {/* Header */}
            <motion.div
              variants={itemVariants}
              className="flex justify-between items-center mb-12"
            >
              <div>
                <h1 className="text-4xl font-bold text-gray-900">Profile</h1>
                <p className="text-gray-600 mt-2">Manage your account and settings</p>
              </div>
              <button
                onClick={handleSignOut}
                className="px-4 py-2 text-gray-700 hover:text-gray-900 bg-white border border-gray-300 rounded-lg hover:shadow-md transition-all"
              >
                Sign Out
              </button>
            </motion.div>

            {/* Rest of the profile content */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* ... existing content ... */}
            </div>
          </motion.div>
        </div>
      </div>

      <DeleteEmbedModal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setSelectedEmbed(null);
        }}
        onConfirm={handleDeleteEmbed}
      />
    </Layout>
  );
} 
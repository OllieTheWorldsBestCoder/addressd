import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { motion } from 'framer-motion';
import { FiCheck, FiCopy, FiExternalLink } from 'react-icons/fi';
import Layout from '../components/Layout';
import styles from '../styles/Success.module.css';
import { auth } from '../config/firebase';
import { User } from 'firebase/auth';

function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user: User | null) => {
      setUser(user);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return { user, loading };
}

interface EmbedDetails {
  embedId: string;
  embedCode: string;
  address: string;
}

export default function EmbedSuccess() {
  const router = useRouter();
  const { session_id } = router.query;
  const { user, loading } = useAuth();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [error, setError] = useState<string>('');
  const [embedDetails, setEmbedDetails] = useState<EmbedDetails | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!session_id) return;
    
    // If user is still loading, wait
    if (loading) return;

    // If no user after loading, redirect to sign in
    if (!user) {
      router.push('/signin');
      return;
    }

    verifyCheckoutSession();
  }, [session_id, user, loading]);

  const verifyCheckoutSession = async () => {
    try {
      console.log('Verifying checkout session:', {
        sessionId: session_id,
        userId: user?.uid
      });

      const response = await fetch('/api/verify-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          sessionId: session_id,
          userId: user?.uid 
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        console.error('Verification failed:', data);
        throw new Error(data.error || 'Failed to verify checkout session');
      }

      console.log('Verification successful:', data);
      setEmbedDetails(data);
      setStatus('success');
    } catch (error) {
      console.error('Error verifying session:', error);
      setStatus('error');
      setError(error instanceof Error ? error.message : 'An error occurred');
    }
  };

  const copyToClipboard = async () => {
    if (embedDetails?.embedCode) {
      try {
        await navigator.clipboard.writeText(embedDetails.embedCode);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (err) {
        console.error('Failed to copy:', err);
      }
    }
  };

  if (status === 'loading') {
    return (
      <Layout>
        <div className={styles.container}>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center"
          >
            <h1>Setting up your embed...</h1>
            <p>Please wait while we process your subscription</p>
          </motion.div>
        </div>
      </Layout>
    );
  }

  if (status === 'error') {
    return (
      <Layout>
        <div className={styles.container}>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center"
          >
            <h1>Something went wrong</h1>
            <p className="text-red-500">{error}</p>
            <button
              onClick={() => router.push('/embed')}
              className="mt-4 px-6 py-2 bg-primary text-white rounded-lg"
            >
              Try Again
            </button>
          </motion.div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className={styles.container}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-2xl mx-auto"
        >
          <div className="flex items-center justify-center mb-6">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
              <FiCheck className="w-6 h-6 text-green-500" />
            </div>
          </div>
          
          <h1 className="text-3xl font-bold text-center mb-4">
            Your embed is ready!
          </h1>
          
          <p className="text-gray-600 text-center mb-8">
            Add this code to your website where you want the directions to appear
          </p>

          {embedDetails && (
            <div className="bg-gray-50 rounded-lg p-6 mb-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-500">embed.html</span>
                <button
                  onClick={copyToClipboard}
                  className="flex items-center text-sm text-gray-600 hover:text-gray-900"
                >
                  <FiCopy className="mr-1" />
                  {copied ? 'Copied!' : 'Copy code'}
                </button>
              </div>
              <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto">
                <code>{embedDetails.embedCode}</code>
              </pre>
            </div>
          )}

          <div className="flex justify-center space-x-4">
            <button
              onClick={() => router.push('/profile')}
              className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors"
            >
              View in Profile
            </button>
            <a
              href="/docs#embed"
              className="px-6 py-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors flex items-center"
            >
              View Documentation
              <FiExternalLink className="ml-2" />
            </a>
          </div>
        </motion.div>
      </div>
    </Layout>
  );
} 
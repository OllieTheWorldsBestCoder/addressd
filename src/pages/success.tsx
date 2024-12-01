import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { PlanType } from '../../types/billing';
import styles from '../../styles/Success.module.css';

export default function Success() {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [error, setError] = useState<string>('');
  const router = useRouter();
  const { session_id } = router.query;

  useEffect(() => {
    if (session_id) {
      fetch('/api/verify-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sessionId: session_id }),
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.error) {
            setStatus('error');
            setError(data.error);
          } else {
            setStatus('success');
            // Redirect to profile after 3 seconds
            setTimeout(() => {
              router.push('/profile');
            }, 3000);
          }
        })
        .catch((err) => {
          setStatus('error');
          setError(err.message);
        });
    }
  }, [session_id, router]);

  return (
    <div className={styles.container}>
      {status === 'loading' && (
        <div>
          <h1>Processing your subscription...</h1>
          <p>Please wait while we set up your API access.</p>
        </div>
      )}
      {status === 'success' && (
        <div>
          <h1>🎉 Welcome to the API Plan!</h1>
          <p>Your subscription has been activated successfully.</p>
          <p>Redirecting you to your profile...</p>
        </div>
      )}
      {status === 'error' && (
        <div>
          <h1>Something went wrong</h1>
          <p>{error}</p>
          <button onClick={() => router.push('/profile')}>
            Return to Profile
          </button>
        </div>
      )}
    </div>
  );
} 
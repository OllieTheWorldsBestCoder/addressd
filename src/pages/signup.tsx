import { useState, useEffect } from 'react';
import { auth, db } from '../config/firebase';
import { GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
import { doc, setDoc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { User } from '../types/user';
import styles from '../styles/Signup.module.css';
import crypto from 'crypto';
import { useRouter } from 'next/router';

export default function Signup() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState<{ token: string } | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const router = useRouter();

  useEffect(() => {
    // Listen for auth state changes
    const unsubscribe = auth.onAuthStateChanged(async (firebaseUser) => {
      if (firebaseUser) {
        // Check if user exists in our database
        const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
        if (userDoc.exists()) {
          // If user exists, redirect to profile page
          router.push('/profile');
        } else {
          // Create new user
          createAccount(firebaseUser);
        }
      } else {
        setUser(null);
        setSuccess(null);
      }
    });

    return () => unsubscribe();
  }, [router]);

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError('');
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (err) {
      console.error('Error signing in with Google:', err);
      setError('Failed to sign in with Google. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const createAccount = async (firebaseUser: any) => {
    try {
      const authToken = crypto.randomBytes(32).toString('hex');
      
      const newUser: User = {
        id: firebaseUser.uid,
        name: firebaseUser.displayName || '',
        email: firebaseUser.email || '',
        authToken,
        summaryCount: 0,
        contributionPoints: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      await setDoc(doc(db, 'users', newUser.id), newUser);
      setUser(newUser);
      setSuccess({ token: authToken });
    } catch (err) {
      console.error('Error creating user:', err);
      setError('Failed to create user. Please try again.');
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
    } catch (err) {
      console.error('Error signing out:', err);
    }
  };

  return (
    <div className={styles.container}>
      <main className={styles.main}>
        <h1 className={styles.title}>Sign Up for API Access</h1>
        
        {!user && !success && (
          <button 
            onClick={handleGoogleSignIn}
            className={styles.googleButton}
            disabled={loading}
          >
            <img src="/google-icon.svg" alt="Google" />
            {loading ? 'Signing in...' : 'Sign in with Google'}
          </button>
        )}

        {error && <p className={styles.error}>{error}</p>}
        
        {success && (
          <div className={styles.success}>
            <div className={styles.userInfo}>
              <h2>🎉 Welcome {user?.name}!</h2>
              <button onClick={handleSignOut} className={styles.signOutButton}>
                Sign Out
              </button>
            </div>
            <p>Your API Token:</p>
            <code className={styles.token}>{success.token}</code>
            <p className={styles.instructions}>
              Store this token securely. You'll need it to make API requests.
              <br />
              Example usage:
            </p>
            <h3>1. Validate Address</h3>
            <pre className={styles.code}>
              {`curl -X POST \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer ${success.token}" \\
  -d '{"address": "Your Address"}' \\
  ${process.env.NEXT_PUBLIC_BASE_URL}/api/address/validate`}
            </pre>
            <h3>2. Contribute Description</h3>
            <pre className={styles.code}>
              {`curl -X POST \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer ${success.token}" \\
  -d '{
    "address": "Your Address",
    "description": "Your description of this location"
  }' \\
  ${process.env.NEXT_PUBLIC_BASE_URL}/api/address/contribute`}
            </pre>
            <p className={styles.points}>
              Earn points for your contributions:
              <br />
              • New address: £0.05
              <br />
              • Additional description: £0.0125
            </p>
          </div>
        )}
      </main>
    </div>
  );
} 
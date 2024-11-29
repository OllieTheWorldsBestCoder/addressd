import { useState, useEffect } from 'react';
import { auth, db } from '../config/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { User } from '../types/user';
import styles from '../styles/Profile.module.css';
import { useRouter } from 'next/router';
import { GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';

export default function Profile() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const router = useRouter();

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

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Loading...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className={styles.container}>
        <h1>Sign In to View Profile</h1>
        <button onClick={handleSignIn} className={styles.googleButton}>
          <img src="/google-icon.svg" alt="Google" />
          Sign in with Google
        </button>
        {error && <p className={styles.error}>{error}</p>}
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>Profile</h1>
        <button onClick={handleSignOut} className={styles.signOutButton}>
          Sign Out
        </button>
      </div>

      <div className={styles.profile}>
        <div className={styles.section}>
          <h2>Account Information</h2>
          <p><strong>Name:</strong> {user.name}</p>
          <p><strong>Email:</strong> {user.email}</p>
          <p><strong>Member since:</strong> {user.createdAt.toLocaleDateString()}</p>
        </div>

        <div className={styles.section}>
          <h2>API Access</h2>
          <div className={styles.apiToken}>
            <p><strong>Your API Token:</strong></p>
            <code className={styles.token}>{user.authToken}</code>
            <button 
              onClick={() => navigator.clipboard.writeText(user.authToken)}
              className={styles.copyButton}
            >
              Copy to Clipboard
            </button>
          </div>
        </div>

        <div className={styles.section}>
          <h2>Contributions</h2>
          <div className={styles.stats}>
            <div className={styles.stat}>
              <h3>Points Earned</h3>
              <p>{user.contributionPoints.toFixed(3)}</p>
            </div>
            <div className={styles.stat}>
              <h3>Summaries Generated</h3>
              <p>{user.summaryCount}</p>
            </div>
          </div>
        </div>

        <div className={styles.section}>
          <h2>API Documentation</h2>
          <div className={styles.docs}>
            <h3>Validate Address</h3>
            <pre className={styles.code}>
              {`curl -X POST \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer ${user.authToken}" \\
  -d '{"address": "Your Address"}' \\
  ${process.env.NEXT_PUBLIC_BASE_URL}/api/address/validate`}
            </pre>

            <h3>Contribute Description</h3>
            <pre className={styles.code}>
              {`curl -X POST \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer ${user.authToken}" \\
  -d '{
    "address": "Your Address",
    "description": "Your description"
  }' \\
  ${process.env.NEXT_PUBLIC_BASE_URL}/api/address/contribute`}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
} 
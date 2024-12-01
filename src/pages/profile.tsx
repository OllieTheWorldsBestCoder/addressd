import { useState, useEffect } from 'react';
import { auth, db } from '../config/firebase';
import { GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { User } from '../types/user';
import styles from '../styles/Profile.module.css';
import { useRouter } from 'next/router';
import { Timestamp } from 'firebase/firestore';
import Link from 'next/link';

interface ActiveEmbed {
  addressId: string;
  domain: string;
  createdAt: Date;
  lastUsed: Date;
  viewCount: number;
}

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
            const userData = userDoc.data();
            // Convert Timestamp to Date if necessary
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

  const formatDate = (date: Date) => {
    return date.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

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
          <p><strong>Member since:</strong> {formatDate(user.createdAt)}</p>
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
            <h3>1. Validate Address</h3>
            <pre className={styles.code}>
              {`curl -X POST \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer ${user.authToken}" \\
  -d '{"address": "Your Address"}' \\
  ${process.env.NEXT_PUBLIC_BASE_URL}/api/address/validate`}
            </pre>

            <h3>2. Contribute Description</h3>
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

        <div className={styles.section}>
          <h2>Active Embeds</h2>
          <div className={styles.embedsHeader}>
            <h3>Your Active Embeds</h3>
            <Link href="/embed" className={styles.createEmbedButton}>
              Create New Embed
            </Link>
          </div>

          {user.embedAccess?.activeEmbeds && user.embedAccess.activeEmbeds.length > 0 ? (
            <div className={styles.embedsList}>
              {user.embedAccess.activeEmbeds.map((embed: ActiveEmbed) => (
                <div key={`${embed.addressId}-${embed.domain}`} className={styles.embedItem}>
                  <div className={styles.embedInfo}>
                    <p><strong>Domain:</strong> {embed.domain}</p>
                    <p><strong>Address ID:</strong> {embed.addressId}</p>
                    <p><strong>Last Used:</strong> {new Date(embed.lastUsed).toLocaleDateString()}</p>
                    <p><strong>Views:</strong> {embed.viewCount}</p>
                  </div>
                  <div className={styles.embedActions}>
                    <button
                      onClick={() => {
                        // Copy embed code to clipboard
                        const embedCode = `
<div id="addressd-embed"></div>
<script>
  (function() {
    var script = document.createElement('script');
    script.src = '${process.env.NEXT_PUBLIC_BASE_URL}/embed.js';
    script.async = true;
    script.dataset.token = '${user.embedAccess?.embedToken}';
    script.dataset.address = '${embed.addressId}';
    document.head.appendChild(script);
  })();
</script>`;
                        navigator.clipboard.writeText(embedCode);
                        alert('Embed code copied to clipboard!');
                      }}
                      className={styles.copyButton}
                    >
                      Copy Code
                    </button>
                    <button
                      onClick={async () => {
                        if (confirm('Are you sure you want to delete this embed?')) {
                          try {
                            // Remove from user's activeEmbeds array
                            const updatedEmbeds = user.embedAccess?.activeEmbeds.filter(
                              (e: ActiveEmbed) => 
                                !(e.addressId === embed.addressId && e.domain === embed.domain)
                            );
                            await updateDoc(doc(db, 'users', user.id), {
                              'embedAccess.activeEmbeds': updatedEmbeds
                            });
                            // Refresh the page or update state
                            window.location.reload();
                          } catch (error) {
                            console.error('Error deleting embed:', error);
                            alert('Failed to delete embed');
                          }
                        }
                      }}
                      className={styles.deleteButton}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className={styles.noEmbeds}>
              <p>You don't have any active embeds yet.</p>
              <Link href="/embed" className={styles.createFirstEmbedButton}>
                Create Your First Embed
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 
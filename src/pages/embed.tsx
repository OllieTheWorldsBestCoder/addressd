import { useState, useEffect } from 'react';
import { auth, db } from '../config/firebase';
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { doc, setDoc, getDoc, updateDoc } from 'firebase/firestore';
import { AddressService } from '../services/address.service';
import styles from '../styles/Embed.module.css';
import crypto from 'crypto';
import { User } from '../types/user';

export default function EmbedPage() {
  const [user, setUser] = useState<User | null>(null);
  const [address, setAddress] = useState('');
  const [description, setDescription] = useState('');
  const [embedCode, setEmbedCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (firebaseUser) => {
      if (firebaseUser) {
        const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
        if (userDoc.exists()) {
          setUser(userDoc.data() as User);
        }
      } else {
        setUser(null);
      }
    });

    return () => unsubscribe();
  }, []);

  const handleSignIn = async () => {
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      
      // Create or update user with embed access
      const embedToken = crypto.randomBytes(32).toString('hex');
      const userData: User = {
        id: result.user.uid,
        name: result.user.displayName || '',
        email: result.user.email || '',
        authToken: crypto.randomBytes(32).toString('hex'),
        summaryCount: 0,
        contributionPoints: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
        embedAccess: {
          isEmbedUser: true,
          managedAddresses: [],
          embedToken
        }
      };

      await setDoc(doc(db, 'users', userData.id), userData);
      setUser(userData);
    } catch (err) {
      console.error('Error signing in:', err);
      setError('Failed to sign in');
    }
  };

  const handleCreateEmbed = async () => {
    if (!user || !address || !description) return;
    
    setLoading(true);
    try {
      const addressService = new AddressService();
      const addressResult = await addressService.createOrUpdateAddress(address);

      if (!addressResult) {
        throw new Error('Failed to validate address');
      }

      // Add initial description
      await updateDoc(doc(db, 'addresses', addressResult.id), {
        descriptions: [{
          content: description,
          createdAt: new Date(),
          userId: user.id
        }]
      });

      // Update user's managed addresses
      const updatedManagedAddresses = [
        ...(user.embedAccess?.managedAddresses || []),
        addressResult.id
      ];

      await updateDoc(doc(db, 'users', user.id), {
        'embedAccess.managedAddresses': updatedManagedAddresses
      });

      // Generate embed code
      const embedCode = `
<div id="addressd-embed"></div>
<script>
  (function() {
    var script = document.createElement('script');
    script.src = '${process.env.NEXT_PUBLIC_BASE_URL}/embed.js';
    script.async = true;
    script.dataset.token = '${user.embedAccess?.embedToken}';
    script.dataset.address = '${addressResult.id}';
    document.head.appendChild(script);
  })();
</script>`;

      setEmbedCode(embedCode);
    } catch (err) {
      console.error('Error creating embed:', err);
      setError('Failed to create embed code');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <h1>Create Embeddable Address Description</h1>
      
      {!user ? (
        <button onClick={handleSignIn} className={styles.signInButton}>
          Sign in with Google to Create Embed
        </button>
      ) : (
        <div className={styles.embedForm}>
          <input
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Enter address"
            className={styles.input}
          />
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Enter initial description"
            className={styles.textarea}
          />
          <button
            onClick={handleCreateEmbed}
            disabled={loading || !address || !description}
            className={styles.createButton}
          >
            {loading ? 'Creating...' : 'Create Embed Code'}
          </button>
          
          {embedCode && (
            <div className={styles.embedCode}>
              <h3>Your Embed Code:</h3>
              <pre>{embedCode}</pre>
              <button
                onClick={() => navigator.clipboard.writeText(embedCode)}
                className={styles.copyButton}
              >
                Copy Code
              </button>
            </div>
          )}
          
          {error && <p className={styles.error}>{error}</p>}
        </div>
      )}
    </div>
  );
} 
import { useState, useEffect } from 'react';
import { auth, db } from '../config/firebase';
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { doc, setDoc, getDoc, updateDoc } from 'firebase/firestore';
import { AddressService } from '../services/address.service';
import styles from '../styles/Embed.module.css';
import crypto from 'crypto';
import { User } from '../types/user';
import { useRouter } from 'next/router';

export default function EmbedPage() {
  const [user, setUser] = useState<User | null>(null);
  const [address, setAddress] = useState('');
  const [description, setDescription] = useState('');
  const [embedCode, setEmbedCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
          if (userDoc.exists()) {
            const userData = userDoc.data() as User;
            // Check if user already has embed access
            if (!userData.embedAccess) {
              // Update existing user with embed access
              const embedToken = crypto.randomBytes(32).toString('hex');
              await updateDoc(doc(db, 'users', firebaseUser.uid), {
                embedAccess: {
                  isEmbedUser: true,
                  managedAddresses: [],
                  embedToken,
                  activeEmbeds: []
                }
              });
              setUser({ ...userData, embedAccess: { isEmbedUser: true, managedAddresses: [], embedToken, activeEmbeds: [] } });
            } else {
              setUser(userData);
            }
          }
        } catch (err) {
          console.error('Error fetching user data:', err);
          setError('Failed to load user data');
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
      
      // Check if user exists
      const userDoc = await getDoc(doc(db, 'users', result.user.uid));
      
      if (!userDoc.exists()) {
        // Create new user with embed access
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
            embedToken,
            activeEmbeds: []
          }
        };
        await setDoc(doc(db, 'users', userData.id), userData);
        setUser(userData);
      }
    } catch (err) {
      console.error('Error signing in:', err);
      setError('Failed to sign in');
    }
  };

  const handleCreateEmbed = async () => {
    if (!user || !address || !description) return;
    
    setLoading(true);
    setError('');
    
    try {
      console.log('Starting embed creation process...');
      console.log('User:', user.id);
      console.log('Address:', address);
      
      const addressService = new AddressService();
      console.log('Validating address...');
      const addressResult = await addressService.createOrUpdateAddress(address);

      if (!addressResult) {
        console.error('Failed to validate/create address');
        throw new Error('Failed to validate address');
      }

      console.log('Address validated:', addressResult);

      // Add initial description
      console.log('Adding description to address...');
      await updateDoc(doc(db, 'addresses', addressResult.id), {
        descriptions: [{
          content: description,
          createdAt: new Date(),
          userId: user.id
        }]
      });

      console.log('Description added successfully');

      // Update user's managed addresses
      console.log('Updating user managed addresses...');
      const updatedManagedAddresses = [
        ...(user.embedAccess?.managedAddresses || []),
        addressResult.id
      ];

      await updateDoc(doc(db, 'users', user.id), {
        'embedAccess.managedAddresses': updatedManagedAddresses
      });

      console.log('User managed addresses updated');

      // Generate embed code
      console.log('Generating embed code...');
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

      console.log('Embed code generated successfully');
      setEmbedCode(embedCode);
      
    } catch (err) {
      console.error('Error creating embed:', err);
      setError(err instanceof Error ? err.message : 'Failed to create embed code');
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
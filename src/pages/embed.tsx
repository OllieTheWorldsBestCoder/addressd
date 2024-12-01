import { useState, useEffect } from 'react';
import { auth, db } from '../config/firebase';
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { doc, setDoc, getDoc, updateDoc } from 'firebase/firestore';
import { AddressService } from '../services/address.service';
import styles from '../styles/Embed.module.css';
import crypto from 'crypto';
import { User } from '../types/user';
import { useRouter } from 'next/router';
import { loadStripe } from '@stripe/stripe-js';
import { PlanType } from '../types/billing';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

export default function EmbedPage() {
  const [user, setUser] = useState<User | null>(null);
  const [address, setAddress] = useState('');
  const [description, setDescription] = useState('');
  const [embedCode, setEmbedCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [validatedAddressId, setValidatedAddressId] = useState<string | null>(null);
  const [showPricingTable, setShowPricingTable] = useState(false);
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
      const validationResponse = await fetch('/api/address/validate-frontend', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.authToken}`
        },
        body: JSON.stringify({ address }),
      });

      if (!validationResponse.ok) {
        const error = await validationResponse.json();
        throw new Error(error.error || 'Failed to validate address');
      }

      const validationResult = await validationResponse.json();
      
      // Store data in session storage before showing pricing table
      sessionStorage.setItem('pendingEmbed', JSON.stringify({
        addressId: validationResult.addressId,
        address: address,
        description: description
      }));
      
      setValidatedAddressId(validationResult.addressId);
      setShowPricingTable(true);
      
    } catch (err) {
      console.error('Error:', err);
      setError(err instanceof Error ? err.message : 'Failed to validate address');
    } finally {
      setLoading(false);
    }
  };

  // Check for successful payment and create embed
  useEffect(() => {
    const session_id = router.query.session_id;
    const pendingData = sessionStorage.getItem('pendingEmbed');

    // Wait for user authentication before proceeding
    if (session_id && pendingData && user) {
      try {
        console.log('Processing successful checkout...', {
          session_id,
          pendingData,
          user
        });
        
        const { addressId, address: storedAddress, description: storedDescription } = JSON.parse(pendingData);

        // Create the embed immediately
        (async () => {
          try {
            setLoading(true);
            
            // Add description
            const descriptionResponse = await fetch('/api/address/contribute', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${user.authToken}`
              },
              body: JSON.stringify({
                address: storedAddress,
                description: storedDescription.trim()
              })
            });

            if (!descriptionResponse.ok) {
              throw new Error('Failed to add description');
            }

            // Update managed addresses
            const updatedManagedAddresses = [
              ...(user.embedAccess?.managedAddresses || []),
              addressId
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
    script.dataset.address = '${addressId}';
    document.head.appendChild(script);
  })();
</script>`;

            // Update state
            setAddress(storedAddress);
            setDescription(storedDescription);
            setValidatedAddressId(addressId);
            setEmbedCode(embedCode);
            setShowPricingTable(false);
            
            // Clear storage
            sessionStorage.removeItem('pendingEmbed');
            
          } catch (err) {
            console.error('Error creating embed:', err);
            setError(err instanceof Error ? err.message : 'Failed to create embed');
          } finally {
            setLoading(false);
          }
        })();

      } catch (error) {
        console.error('Error processing checkout:', error);
        setError('Failed to process checkout');
      }
    }
  }, [router.query.session_id, user]);

  return (
    <div className={styles.container}>
      <h1>Create Embeddable Address Description</h1>
      
      {!user ? (
        // Step 1: Sign in
        <button onClick={handleSignIn} className={styles.signInButton}>
          Sign in with Google to Create Embed
        </button>
      ) : showPricingTable ? (
        // Step 3: Show pricing table
        <div>
          <stripe-pricing-table 
            pricing-table-id={process.env.NEXT_PUBLIC_STRIPE_PRICING_TABLE_ID!}
            publishable-key={process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!}
            client-reference-id={user.id}
            customer-email={user.email}
          >
          </stripe-pricing-table>
        </div>
      ) : (
        // Step 2: Show form or Step 4: Show embed code
        <div className={styles.embedForm}>
          {!embedCode ? (
            // Step 2: Input form
            <>
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
            </>
          ) : (
            // Step 4: Show embed code
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
import { NextApiRequest, NextApiResponse } from 'next';
import { db } from '../../config/firebase';
import { stripe } from '../../config/stripe';
import { PlanType } from '../../types/billing';
import { collection, doc, getDoc, updateDoc, arrayUnion, setDoc } from 'firebase/firestore';
import crypto from 'crypto';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { sessionId, userId } = req.body;
    console.log('Verifying checkout session:', { sessionId, userId });

    if (!sessionId || !userId) {
      return res.status(400).json({ message: 'Missing required parameters' });
    }

    // Retrieve the checkout session
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['subscription']
    });

    if (!session) {
      return res.status(404).json({ message: 'Session not found' });
    }

    console.log('Retrieved session:', {
      id: session.id,
      metadata: session.metadata,
      subscription: session.subscription
    });

    // Get the address ID from the metadata
    const addressId = session.metadata?.addressId;
    
    if (!addressId) {
      return res.status(400).json({ message: 'No address ID found in session' });
    }

    // Get user's embed token
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);
    const userData = userDoc.data();
    
    // Create embed token if it doesn't exist
    let embedToken = userData?.embedAccess?.embedToken;
    if (!embedToken) {
      embedToken = crypto.randomBytes(32).toString('hex');
      await updateDoc(userRef, {
        'embedAccess.embedToken': embedToken,
        'embedAccess.isEmbedUser': true
      });
    }

    // Get the base URL, defaulting to production if not set
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://addressd.vercel.app';

    // Generate embed code
    const embedCode = `<div id="addressd-embed"></div>
<script src="${baseUrl}/embed.js" 
  data-address="${addressId}"
  data-token="${embedToken}">
</script>`;

    // Create or update the embed document
    const embedsCollection = collection(db, 'embeds');
    const embedRef = doc(embedsCollection, addressId);
    await setDoc(embedRef, {
      status: 'active',
      embedCode,
      stripeSubscriptionId: session.subscription,
      userId,
      createdAt: new Date(),
      updatedAt: new Date()
    }, { merge: true });

    // Get address details
    const addressesCollection = collection(db, 'addresses');
    const addressRef = doc(addressesCollection, addressId);
    const addressDoc = await getDoc(addressRef);
    const address = addressDoc.data()?.formatted_address || '';

    console.log('Successfully verified checkout session');
    res.status(200).json({
      embedId: addressId,
      embedCode,
      address
    });

  } catch (error) {
    console.error('Error verifying checkout session:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
} 
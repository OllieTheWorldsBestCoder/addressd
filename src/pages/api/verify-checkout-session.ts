import { NextApiRequest, NextApiResponse } from 'next';
import { db } from '../../config/firebase';
import { stripe } from '../../config/stripe';
import { PlanType } from '../../types/billing';
import { collection, doc, getDoc, updateDoc, arrayUnion } from 'firebase/firestore';

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

    // Get the address ID and billing period from the metadata
    const addressId = session.metadata?.addressId;
    const billingPeriod = session.metadata?.billing_period;
    
    if (!addressId) {
      return res.status(400).json({ message: 'No address ID found in session' });
    }

    // Update user's billing information
    const usersCollection = collection(db, 'users');
    const userRef = doc(usersCollection, userId);

    // Create the new plan object
    const newPlan = {
      type: PlanType.EMBED,
      status: 'active',
      startDate: new Date(),
      stripeSubscriptionId: session.subscription,
      addressId: addressId,
      billingPeriod,
      priceMonthly: 300, // £3
      priceYearly: 2000, // £20
      currentPrice: billingPeriod === 'yearly' ? 2000 : 300 // Set based on selected period
    };

    // Update user document
    const updates = {
      'billing.stripeCustomerId': session.customer,
      'billing.plans': arrayUnion(newPlan),
      'embedAccess.activeEmbeds': arrayUnion({
        addressId: addressId,
        domain: 'pending', // Will be updated on first embed view
        createdAt: new Date(),
        lastUsed: new Date(),
        viewCount: 0
      })
    };

    console.log('Updating user document:', { userId, updates });
    await updateDoc(userRef, updates);

    // Generate embed code
    const embedCode = `<div id="addressd-embed"></div>
<script src="${process.env.NEXT_PUBLIC_URL}/embed.js" 
  data-address="${addressId}"
  data-token="${userId}">
</script>`;

    // Update the embed document
    const embedsCollection = collection(db, 'embeds');
    const embedRef = doc(embedsCollection, addressId);
    await updateDoc(embedRef, {
      status: 'active',
      embedCode,
      stripeSubscriptionId: session.subscription,
      userId
    });

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
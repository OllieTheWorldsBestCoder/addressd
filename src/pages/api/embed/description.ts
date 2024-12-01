import { NextApiRequest, NextApiResponse } from 'next';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../../config/firebase';
import { User } from '../../../types/user';
import { EmbedTrackingService } from '../../../services/embedTracking.service';
import { BillingService } from '../../../services/billing.service';

const embedTracking = new EmbedTrackingService();
const billingService = new BillingService();

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { addressId } = req.query;
    const token = req.headers.authorization?.replace('Bearer ', '');
    const origin = req.headers.origin || req.headers.referer || 'unknown';

    if (!addressId || !token) {
      return res.status(400).json({ error: 'Address ID and token are required' });
    }

    // Validate embed token
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('embedAccess.embedToken', '==', token));
    const userSnapshot = await getDocs(q);

    if (userSnapshot.empty) {
      return res.status(401).json({ error: 'Invalid embed token' });
    }

    const user = userSnapshot.docs[0].data() as User;
    const userId = userSnapshot.docs[0].id;

    // Check if embed access is valid
    const hasValidSubscription = await billingService.validateEmbedAccess(user);
    if (!hasValidSubscription) {
      return res.status(402).json({ 
        error: 'Subscription required',
        message: 'Please update your subscription to continue using embeds'
      });
    }

    // Extract domain from origin
    let domain = 'unknown';
    try {
      if (origin !== 'unknown') {
        const url = new URL(origin);
        domain = url.hostname;
      }
    } catch (error) {
      console.warn('Failed to parse origin:', origin);
      domain = 'unknown';
    }

    // Track the embed view
    await embedTracking.trackEmbedView(
      userId,
      addressId as string,
      domain
    );

    // Get address data
    const addressDoc = await getDoc(doc(db, 'addresses', addressId as string));
    
    if (!addressDoc.exists()) {
      return res.status(404).json({ error: 'Address not found' });
    }

    const address = addressDoc.data();

    return res.status(200).json({
      description: address.summary || address.descriptions?.[0]?.content || 'No description available',
      lastUpdated: address.updatedAt
    });

  } catch (error) {
    console.error('Error fetching embed description:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
} 
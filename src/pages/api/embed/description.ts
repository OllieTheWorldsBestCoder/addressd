import { NextApiRequest, NextApiResponse } from 'next';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../../config/firebase';
import { User } from '../../../types/user';

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

    // Verify user has access to this address
    if (!user.embedAccess?.managedAddresses.includes(addressId as string)) {
      return res.status(403).json({ error: 'Unauthorized access to this address' });
    }

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
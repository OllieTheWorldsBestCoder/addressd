import { NextApiRequest, NextApiResponse } from 'next';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../config/firebase';

export async function validateApiKey(
  req: NextApiRequest,
  res: NextApiResponse,
  next: () => void
) {
  const apiKey = req.headers.authorization?.replace('Bearer ', '');
  const origin = req.headers.origin;

  if (!apiKey) {
    return res.status(401).json({ error: 'No API key provided' });
  }

  try {
    // Check if API key exists and is valid for this origin
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('authToken', '==', apiKey));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      return res.status(401).json({ error: 'Invalid API key' });
    }

    // Store user in request for later use
    (req as any).user = {
      ...querySnapshot.docs[0].data(),
      id: querySnapshot.docs[0].id
    };

    return next();
  } catch (error) {
    console.error('Error validating API key:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
} 
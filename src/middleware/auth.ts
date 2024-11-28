import { NextApiRequest, NextApiResponse } from 'next';
import { db } from '../config/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { User } from '../types/user';

export async function authenticateRequest(
  req: NextApiRequest,
  res: NextApiResponse
): Promise<User | null> {
  const authToken = req.headers.authorization?.replace('Bearer ', '');

  if (!authToken) {
    res.status(401).json({ error: 'No authentication token provided' });
    return null;
  }

  try {
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('authToken', '==', authToken));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      res.status(401).json({ error: 'Invalid authentication token' });
      return null;
    }

    return querySnapshot.docs[0].data() as User;
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(500).json({ error: 'Authentication error' });
    return null;
  }
} 
import { NextApiRequest, NextApiResponse } from 'next';
import { db } from '../../../config/firebase';
import { collection, addDoc } from 'firebase/firestore';
import { AddressFeedback } from '../../../types/address';
import crypto from 'crypto';
import { LearningService } from '../../../services/learning.service';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { addressId, isPositive, inputAddress, matchedAddress } = req.body;

    if (!addressId || typeof isPositive !== 'boolean' || !inputAddress || !matchedAddress) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const feedback: AddressFeedback = {
      id: crypto.randomBytes(16).toString('hex'),
      addressId,
      isPositive,
      inputAddress,
      matchedAddress,
      createdAt: new Date(),
    };

    await addDoc(collection(db, 'addressFeedback'), feedback);

    const learningService = new LearningService();
    await learningService.updateFromFeedback(feedback);

    return res.status(200).json({ message: 'Feedback submitted successfully' });
  } catch (error) {
    console.error('Error submitting feedback:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
} 
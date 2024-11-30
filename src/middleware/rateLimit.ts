import { NextApiRequest, NextApiResponse } from 'next';
import { doc, getDoc, setDoc, increment } from 'firebase/firestore';
import { db } from '../config/firebase';

const RATE_LIMIT = 100; // requests per window
const WINDOW_SIZE = 15 * 60 * 1000; // 15 minutes in milliseconds

export async function rateLimit(
  req: NextApiRequest,
  res: NextApiResponse,
  next: () => void
) {
  const apiKey = req.headers.authorization?.replace('Bearer ', '');
  
  if (!apiKey) {
    return next();
  }

  const rateLimitRef = doc(db, 'rateLimits', apiKey);
  const now = Date.now();

  try {
    const rateData = await getDoc(rateLimitRef);
    const currentData = rateData.data();

    if (currentData) {
      if (now - currentData.windowStart > WINDOW_SIZE) {
        // Reset window
        await setDoc(rateLimitRef, {
          count: 1,
          windowStart: now
        });
      } else if (currentData.count >= RATE_LIMIT) {
        return res.status(429).json({
          error: 'Rate limit exceeded',
          resetAt: new Date(currentData.windowStart + WINDOW_SIZE)
        });
      } else {
        // Increment count
        await setDoc(rateLimitRef, {
          count: increment(1)
        }, { merge: true });
      }
    } else {
      // First request
      await setDoc(rateLimitRef, {
        count: 1,
        windowStart: now
      });
    }

    return next();
  } catch (error) {
    console.error('Error in rate limiting:', error);
    return next(); // Fail open if rate limiting errors
  }
} 
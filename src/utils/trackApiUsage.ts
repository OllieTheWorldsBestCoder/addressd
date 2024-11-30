import { doc, setDoc, increment } from 'firebase/firestore';
import { db } from '../config/firebase';

export async function trackApiUsage(userId: string, endpoint: string) {
  const now = new Date();
  const usageRef = doc(db, 'apiUsage', `${userId}_${now.toISOString().split('T')[0]}`);

  await setDoc(usageRef, {
    [endpoint]: increment(1),
    totalCalls: increment(1),
    lastUsed: now
  }, { merge: true });
} 
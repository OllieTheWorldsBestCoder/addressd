import { doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { db } from '../config/firebase';
import { User } from '../types/user';

export class EmbedTrackingService {
  async trackEmbedView(
    userId: string, 
    addressId: string, 
    domain: string
  ) {
    const userRef = doc(db, 'users', userId);
    const now = new Date();

    try {
      // Only track unique domain+address combinations
      // This is what we'll charge for - active embeds, not API calls
      await updateDoc(userRef, {
        'embedAccess.activeEmbeds': arrayUnion({
          addressId,
          domain,
          createdAt: now,
          lastUsed: now,
          viewCount: 1  // Initialize view count
        })
      });

    } catch (error) {
      console.error('Error tracking embed:', error);
      throw error;
    }
  }

  async getActiveEmbeds(userId: string) {
    // For billing purposes - count unique domain+address combinations
    // Implementation for getting active embed count for billing
  }
} 
import { doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { db } from '../config/firebase';
import { User } from '../types/user';
import { trackEmbedView, trackEmbedInteraction } from '../utils/analytics';

export class EmbedTrackingService {
  async trackEmbedView(
    userId: string, 
    addressId: string, 
    domain: string,
    embedId: string
  ) {
    const userRef = doc(db, 'users', userId);
    const now = new Date();

    try {
      // Track in Firebase for billing
      await updateDoc(userRef, {
        'embedAccess.activeEmbeds': arrayUnion({
          addressId,
          domain,
          embedId,
          createdAt: now,
          lastUsed: now,
          viewCount: 1  // Initialize view count
        })
      });

      // Track in Vercel Analytics
      trackEmbedView(addressId, embedId);

    } catch (error) {
      console.error('Error tracking embed:', error);
      throw error;
    }
  }

  async trackEmbedInteractionEvent(
    addressId: string,
    embedId: string,
    interactionType: 'directions' | 'copy' | 'share'
  ) {
    try {
      // Track in Vercel Analytics
      trackEmbedInteraction(addressId, embedId, interactionType);
    } catch (error) {
      console.error('Error tracking embed interaction:', error);
      // Don't throw error for analytics failures
    }
  }

  async getActiveEmbeds(userId: string) {
    // For billing purposes - count unique domain+address combinations
    // Implementation for getting active embed count for billing
  }
} 
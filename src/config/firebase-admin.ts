import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// Initialize Firebase Admin only if it hasn't been initialized
if (!getApps().length) {
  initializeApp({
    credential: cert({
      projectId: "addressd-eb27f",
      clientEmail: "firebase-adminsdk-qqxvr@addressd-eb27f.iam.gserviceaccount.com",
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')
    })
  });
}

export const adminDb = getFirestore(); 
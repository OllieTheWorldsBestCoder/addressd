import { initializeApp, getApps } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getAnalytics, isSupported } from "firebase/analytics";

// Get the API key based on environment
const apiKey = process.env.FIREBASE_API_KEY || process.env.NEXT_PUBLIC_FIREBASE_API_KEY;

if (!apiKey) {
  throw new Error('Firebase API key is not configured. Please set FIREBASE_API_KEY or NEXT_PUBLIC_FIREBASE_API_KEY in your environment.');
}

const firebaseConfig = {
  apiKey,
  authDomain: "addressd-eb27f.firebaseapp.com",
  projectId: "addressd-eb27f",
  storageBucket: "addressd-eb27f.firebasestorage.app",
  messagingSenderId: "306319639011",
  appId: "1:306319639011:web:eefae9735dff1c83ace0d6",
  measurementId: "G-R5NH3HRB92"
};

// Initialize Firebase only if it hasn't been initialized already
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

// Initialize services
export const db = getFirestore(app);
export const auth = getAuth(app);

// Initialize Analytics only in browser environment
if (typeof window !== 'undefined') {
  isSupported().then(yes => yes && getAnalytics(app));
}
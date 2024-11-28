import { initializeApp, getApps } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: "addressd-eb27f.firebaseapp.com",
  projectId: "addressd-eb27f",
  storageBucket: "addressd-eb27f.firebasestorage.app",
  messagingSenderId: "306319639011",
  appId: "1:306319639011:web:eefae9735dff1c83ace0d6",
  measurementId: "G-R5NH3HRB92"
};

// Initialize Firebase only if it hasn't been initialized already
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
export const db = getFirestore(app);
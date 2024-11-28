// Run this script to check the admin user's token
import { config } from 'dotenv';
import { resolve } from 'path';
import { db } from '../config/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';

// Load environment variables from .env.local
config({ path: resolve(process.cwd(), '.env.local') });

async function checkAdminToken() {
  try {
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('id', '==', 'addressd-admin'));
    const querySnapshot = await getDocs(q);
    
    if (!querySnapshot.empty) {
      const adminUser = querySnapshot.docs[0].data();
      console.log('Admin user found:');
      console.log('Auth Token:', adminUser.authToken);
      console.log('Current env token:', process.env.TEST_AUTH_TOKEN);
      
      if (adminUser.authToken === process.env.TEST_AUTH_TOKEN) {
        console.log('\n✅ Tokens match!');
      } else {
        console.log('\n❌ Tokens do not match!');
      }
    } else {
      console.log('Admin user not found in database');
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

checkAdminToken();
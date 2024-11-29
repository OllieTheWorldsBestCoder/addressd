import { config } from 'dotenv';
import { resolve } from 'path';
import { auth, db } from '../config/firebase';
import { doc, getDoc } from 'firebase/firestore';

config({ path: resolve(process.cwd(), '.env.local') });

async function testAuthFlow() {
  try {
    console.log('Testing Firebase configuration...');
    
    // Test Firebase connection
    const testDoc = await getDoc(doc(db, 'users', 'test'));
    console.log('Firebase connection successful');

    // Test auth configuration
    const providers = await auth.listProviders?.();
    console.log('Available auth providers:', providers);

    console.log('Auth configuration test complete');
  } catch (error) {
    console.error('Test failed:', error);
  }
}

testAuthFlow(); 
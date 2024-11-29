import { config } from 'dotenv';
import { resolve } from 'path';
import { auth, db } from '../config/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { GoogleAuthProvider } from 'firebase/auth';

config({ path: resolve(process.cwd(), '.env.local') });

async function testAuthFlow() {
  try {
    console.log('Testing Firebase configuration...');
    
    // Test Firebase connection
    const testDoc = await getDoc(doc(db, 'users', 'test'));
    console.log('Firebase connection successful');

    // Test auth configuration
    const provider = new GoogleAuthProvider();
    console.log('Google Auth Provider initialized');

    // Test auth configuration
    console.log('Auth configuration:', {
      appName: auth.app.name,
      apiKey: auth.app.options.apiKey ? 'Present' : 'Missing',
      authDomain: auth.app.options.authDomain ? 'Present' : 'Missing',
      currentUser: auth.currentUser ? 'Logged in' : 'Not logged in'
    });

    // Test provider configuration
    provider.addScope('email');
    provider.addScope('profile');
    console.log('Provider scopes configured');

    console.log('Auth configuration test complete');
  } catch (error) {
    console.error('Test failed:', error);
  }
}

testAuthFlow(); 
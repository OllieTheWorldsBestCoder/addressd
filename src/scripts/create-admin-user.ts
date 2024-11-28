import { db } from '../config/firebase';
import { collection, doc, setDoc } from 'firebase/firestore';
import { User } from '../types/user';
import crypto from 'crypto';

async function createAdminUser() {
  try {
    // Generate a secure random token
    const authToken = crypto.randomBytes(32).toString('hex');
    
    const adminUser: User = {
      id: 'addressd-admin',
      name: 'Addressd Admin',
      email: 'admin@addressd.app',
      authToken: authToken,
      summaryCount: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Add to Firestore
    await setDoc(doc(db, 'users', adminUser.id), adminUser);

    console.log('Admin user created successfully!');
    console.log('Auth Token:', authToken);
    console.log('Please save this token securely and update your .env.local file');
  } catch (error) {
    console.error('Error creating admin user:', error);
  }
}

createAdminUser(); 
import { config } from 'dotenv';
import { resolve } from 'path';
import { db } from '../config/firebase';
import { collection, query, where, getDocs, updateDoc, doc, arrayUnion, increment, getDoc } from 'firebase/firestore';
import { AddressService } from '../services/address.service';
import { User } from '../types/user';
import { Contribution } from '../types/address';

config({ path: resolve(process.cwd(), '.env.local') });

const NEW_ADDRESS_POINTS = 0.05;
const EXISTING_ADDRESS_POINTS = NEW_ADDRESS_POINTS / 4;

async function testContribution() {
  try {
    console.log('\nTesting contribution functionality...\n');

    const addressService = new AddressService();
    const TEST_AUTH_TOKEN = process.env.TEST_AUTH_TOKEN;

    // Test cases
    const testCases = [
      {
        name: 'New address with auth',
        address: '82a Market Street, St Andrews KY16 9PA',
        description: 'Test description for new address with auth',
        useAuth: true
      },
      {
        name: 'Existing address with auth',
        address: '82a Market Street, St Andrews KY16 9PA',
        description: 'Additional description for existing address with auth',
        useAuth: true
      },
      {
        name: 'New address without auth',
        address: '1 South Street, St Andrews KY16 9QR',
        description: 'Test description without auth',
        useAuth: false
      }
    ];

    // Run test cases
    for (const testCase of testCases) {
      console.log(`\nRunning test case: ${testCase.name}`);
      console.log('Input:', testCase);

      // Get user if auth token provided
      let user: User | null = null;
      if (testCase.useAuth && TEST_AUTH_TOKEN) {
        const usersRef = collection(db, 'users');
        const q = query(usersRef, where('authToken', '==', TEST_AUTH_TOKEN));
        const querySnapshot = await getDocs(q);
        
        if (!querySnapshot.empty) {
          user = {
            ...querySnapshot.docs[0].data(),
            id: querySnapshot.docs[0].id
          } as User;
          console.log('Found user:', user.email);
        }
      }

      // Check if address exists
      const existingAddress = await addressService.findExistingAddress(testCase.address);
      
      if (existingAddress) {
        console.log('Found existing address:', existingAddress.formattedAddress);
        
        // Add description to existing address
        const contribution: Contribution = {
          content: testCase.description,
          createdAt: new Date(),
          userId: user?.id || null  // Ensure userId is null if no user
        };

        await updateDoc(doc(db, 'addresses', existingAddress.id), {
          descriptions: arrayUnion(contribution),
          updatedAt: new Date()
        });

        // Update user points
        if (user) {
          await updateDoc(doc(db, 'users', user.id), {
            contributionPoints: increment(EXISTING_ADDRESS_POINTS),
            updatedAt: new Date()
          });
          console.log(`Added ${EXISTING_ADDRESS_POINTS} points for existing address contribution`);
        }

      } else {
        console.log('Creating new address...');
        const newAddress = await addressService.createOrUpdateAddress(testCase.address);
        
        if (!newAddress) {
          throw new Error('Failed to create address');
        }

        // Add description
        const contribution: Contribution = {
          content: testCase.description,
          createdAt: new Date(),
          userId: user?.id || null  // Ensure userId is null if no user
        };

        await updateDoc(doc(db, 'addresses', newAddress.id), {
          descriptions: arrayUnion(contribution),
          updatedAt: new Date()
        });

        // Update user points
        if (user) {
          await updateDoc(doc(db, 'users', user.id), {
            contributionPoints: increment(NEW_ADDRESS_POINTS),
            updatedAt: new Date()
          });
          console.log(`Added ${NEW_ADDRESS_POINTS} points for new address contribution`);
        }

        console.log('Created new address:', newAddress.formattedAddress);
      }

      // Verify final state if authenticated
      if (user) {
        const userDoc = await getDoc(doc(db, 'users', user.id));
        const userData = userDoc.data();
        console.log('Updated user points:', userData?.contributionPoints);
      }

      // Add delay between tests
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    console.log('\nAll test cases completed successfully!');

  } catch (error) {
    console.error('Test failed:', error);
  }
}

// Run the tests
testContribution(); 
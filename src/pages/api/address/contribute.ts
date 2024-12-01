import { NextApiRequest, NextApiResponse } from 'next';
import { doc, getDoc, updateDoc, increment, collection, query, where, getDocs, arrayUnion } from 'firebase/firestore';
import { db } from '../../../config/firebase';
import { AddressService } from '../../../services/address.service';
import { User } from '../../../types/user';

const NEW_ADDRESS_POINTS = 0.05;
const EXISTING_ADDRESS_POINTS = NEW_ADDRESS_POINTS / 4;

interface ContributeRequest {
  address: string;
  description: string;
  authToken?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { address, description, authToken } = req.body as ContributeRequest;

    if (!address || !description) {
      return res.status(400).json({ error: 'Address and description are required' });
    }

    // Initialize services
    const addressService = new AddressService();

    // Get user if auth token provided
    let user: User | null = null;
    if (authToken) {
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('authToken', '==', authToken));
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        user = {
          ...querySnapshot.docs[0].data(),
          id: querySnapshot.docs[0].id
        } as User;
      }
    }

    // Check if address exists
    const existingAddress = await addressService.findExistingAddress(address);
    let result;

    if (existingAddress) {
      // Add description to existing address
      const contribution = {
        content: description.trim(),
        createdAt: new Date(),
        userId: user?.id || null
      };

      console.log('Contribution object:', contribution);

      await updateDoc(doc(db, 'addresses', existingAddress.id), {
        descriptions: arrayUnion(contribution),
        updatedAt: new Date()
      });

      // Update user contribution points if authenticated
      if (user) {
        await updateDoc(doc(db, 'users', user.id), {
          contributionPoints: increment(EXISTING_ADDRESS_POINTS),
          updatedAt: new Date()
        });
      }

      result = {
        addressId: existingAddress.id,
        isNewAddress: false,
        pointsEarned: user ? EXISTING_ADDRESS_POINTS : 0
      };
    } else {
      // Create new address with description
      const newAddress = await addressService.createOrUpdateAddress(address);
      
      if (!newAddress) {
        return res.status(400).json({ error: 'Failed to validate address' });
      }

      const contribution = {
        content: description.trim(),
        createdAt: new Date(),
        userId: user?.id || null
      };

      console.log('Contribution object for new address:', contribution);

      await updateDoc(doc(db, 'addresses', newAddress.id), {
        descriptions: arrayUnion(contribution),
        updatedAt: new Date()
      });

      // Update user contribution points if authenticated
      if (user) {
        await updateDoc(doc(db, 'users', user.id), {
          contributionPoints: increment(NEW_ADDRESS_POINTS),
          updatedAt: new Date()
        });
      }

      result = {
        addressId: newAddress.id,
        isNewAddress: true,
        pointsEarned: user ? NEW_ADDRESS_POINTS : 0
      };
    }

    return res.status(200).json(result);
  } catch (error) {
    console.error('Error in contribute:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
} 
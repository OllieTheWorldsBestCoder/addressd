import { NextApiRequest, NextApiResponse } from 'next';
import { AddressService } from '../../../services/address.service';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../../config/firebase';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // Handle preflight request
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { address } = req.body;
    const authToken = req.headers.authorization?.replace('Bearer ', '');

    if (!address) {
      return res.status(400).json({ error: 'Address is required' });
    }

    // Validate API token if provided
    if (authToken) {
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('authToken', '==', authToken));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        return res.status(401).json({ error: 'Invalid API token' });
      }
    }

    console.log('Validating address:', address);
    const addressService = new AddressService();

    // First try to find existing address
    const existingAddress = await addressService.findExistingAddress(address);

    if (existingAddress) {
      console.log('Found existing address:', existingAddress);
      return res.status(200).json({
        foundAddress: existingAddress.formattedAddress,
        directions: existingAddress.summary || "It looks like we don't have information on this address just yet, why not be the first to help?",
        uploadLink: `/upload/${existingAddress.id}`,
        addressId: existingAddress.id
      });
    }

    // If no existing address, validate and create new one
    const validatedAddress = await addressService.validateAndFormatAddress(address);
    
    if (!validatedAddress) {
      console.error('Invalid address format:', address);
      return res.status(400).json({ error: 'Invalid address format' });
    }

    // Create new address
    const newAddress = await addressService.createOrUpdateAddress(address);
    
    if (!newAddress) {
      console.error('Failed to create address:', address);
      return res.status(500).json({ error: 'Failed to create address' });
    }

    console.log('Created new address:', newAddress);
    return res.status(200).json({
      foundAddress: newAddress.formattedAddress,
      directions: "It looks like we don't have information on this address just yet, why not be the first to help?",
      uploadLink: `/upload/${newAddress.id}`,
      addressId: newAddress.id
    });

  } catch (error) {
    console.error('Error validating address:', error);
    return res.status(500).json({ 
      error: 'Failed to process address',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
} 
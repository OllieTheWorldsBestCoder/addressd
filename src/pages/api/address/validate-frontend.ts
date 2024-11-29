import { NextApiRequest, NextApiResponse } from 'next';
import { AddressService } from '../../../services/address.service';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { address } = req.body;

    if (!address) {
      return res.status(400).json({ error: 'Address is required' });
    }

    console.log('Validating address:', address);
    const addressService = new AddressService();

    // First try to find existing address
    const existingAddress = await addressService.findExistingAddress(address);

    if (existingAddress) {
      console.log('Found existing address:', existingAddress);
      return res.status(200).json({
        summary: existingAddress.summary || 'No description available yet.',
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
      summary: 'No description available yet.',
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
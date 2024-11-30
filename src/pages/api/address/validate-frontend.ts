import { NextApiRequest, NextApiResponse } from 'next';
import { AddressService } from '../../../services/address.service';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { address } = req.body;

    if (!address) {
      return res.status(400).json({ error: 'Address is required' });
    }

    const addressService = new AddressService();
    const existingAddress = await addressService.findExistingAddress(address);

    if (existingAddress) {
      return res.status(200).json({
        formattedAddress: existingAddress.formattedAddress,
        summary: existingAddress.summary || 'No description available yet.',
        uploadLink: `/upload/${existingAddress.id}`,
        addressId: existingAddress.id
      });
    }

    const validatedAddress = await addressService.validateAndFormatAddress(address);
    
    if (!validatedAddress) {
      return res.status(400).json({ error: 'Invalid address format' });
    }

    const newAddress = await addressService.createOrUpdateAddress(address);
    
    if (!newAddress) {
      return res.status(500).json({ error: 'Failed to create address' });
    }

    return res.status(200).json({
      formattedAddress: newAddress.formattedAddress,
      summary: 'No description available yet.',
      uploadLink: `/upload/${newAddress.id}`,
      addressId: newAddress.id
    });

  } catch (error) {
    console.error('Error validating address:', error);
    return res.status(500).json({ error: 'Failed to process address' });
  }
} 
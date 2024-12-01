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
    console.log('Received address validation request:', address);

    if (!address) {
      console.log('No address provided');
      return res.status(400).json({ error: 'Address is required' });
    }

    console.log('Creating AddressService...');
    const addressService = new AddressService();

    console.log('Checking for existing address...');
    const existingAddress = await addressService.findExistingAddress(address);

    if (existingAddress) {
      console.log('Found existing address:', existingAddress);
      return res.status(200).json({
        formattedAddress: existingAddress.formattedAddress,
        summary: existingAddress.summary || 'No description available yet.',
        uploadLink: `/upload/${existingAddress.id}`,
        addressId: existingAddress.id
      });
    }

    console.log('No existing address found, validating new address...');
    const validatedAddress = await addressService.validateAndFormatAddress(address);
    
    if (!validatedAddress) {
      console.log('Address validation failed');
      return res.status(400).json({ error: 'Invalid address format' });
    }

    console.log('Address validated, creating new address...');
    const newAddress = await addressService.createOrUpdateAddress(address);
    
    if (!newAddress) {
      console.log('Failed to create new address');
      return res.status(500).json({ error: 'Failed to create address' });
    }

    console.log('New address created:', newAddress);
    return res.status(200).json({
      formattedAddress: newAddress.formattedAddress,
      summary: 'No description available yet.',
      uploadLink: `/upload/${newAddress.id}`,
      addressId: newAddress.id
    });

  } catch (error) {
    console.error('Error validating address:', error);
    if (error instanceof Error) {
      console.error('Error stack:', error.stack);
    }
    return res.status(500).json({ 
      error: 'Failed to process address',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
} 
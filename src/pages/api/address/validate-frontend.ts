import { NextApiRequest, NextApiResponse } from 'next';
import { AddressService } from '../../../services/address.service';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Add request logging
  console.log(`[validate-frontend] Request received:`, {
    method: req.method,
    url: req.url,
    headers: {
      'content-type': req.headers['content-type'],
      'origin': req.headers.origin,
    },
    body: req.body,
    timestamp: new Date().toISOString()
  });

  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    console.log('[validate-frontend] Handling OPTIONS request');
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    console.log('[validate-frontend] Invalid method:', req.method);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { address } = req.body;
    console.log('[validate-frontend] Processing address:', address);

    if (!address) {
      console.log('[validate-frontend] No address provided');
      return res.status(400).json({ error: 'Address is required' });
    }

    console.log('[validate-frontend] Creating AddressService');
    const addressService = new AddressService();

    console.log('[validate-frontend] Checking for existing address');
    const existingAddress = await addressService.findExistingAddress(address);

    if (existingAddress) {
      console.log('[validate-frontend] Found existing address:', existingAddress.id);
      return res.status(200).json({
        formattedAddress: existingAddress.formattedAddress,
        summary: existingAddress.summary || 'No description available yet.',
        uploadLink: `/upload/${existingAddress.id}`,
        addressId: existingAddress.id
      });
    }

    console.log('[validate-frontend] No existing address found, validating new address');
    const validatedAddress = await addressService.validateAndFormatAddress(address);
    
    if (!validatedAddress) {
      console.log('[validate-frontend] Address validation failed');
      return res.status(400).json({ error: 'Invalid address format' });
    }

    console.log('[validate-frontend] Creating new address');
    const newAddress = await addressService.createOrUpdateAddress(address);
    
    if (!newAddress) {
      console.log('[validate-frontend] Failed to create new address');
      return res.status(500).json({ error: 'Failed to create address' });
    }

    console.log('[validate-frontend] Successfully created new address:', newAddress.id);
    return res.status(200).json({
      formattedAddress: newAddress.formattedAddress,
      summary: 'No description available yet.',
      uploadLink: `/upload/${newAddress.id}`,
      addressId: newAddress.id
    });

  } catch (error) {
    console.error('[validate-frontend] Error processing request:', error);
    // Log the full error stack
    if (error instanceof Error) {
      console.error('[validate-frontend] Error stack:', error.stack);
      console.error('[validate-frontend] Error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack
      });
    }
    return res.status(500).json({ 
      error: 'Failed to process address',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
} 
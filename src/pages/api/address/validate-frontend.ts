import type { NextApiRequest, NextApiResponse } from 'next';
import { AddressService } from '../../../services/address.service';
import { AddressResponse } from '../../../types/address';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<AddressResponse | { error: string }>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  console.log('[validate-frontend] Request received:', {
    method: req.method,
    url: req.url,
    headers: {
      'content-type': req.headers['content-type'],
      origin: req.headers.origin
    },
    body: req.body,
    timestamp: new Date().toISOString()
  });

  try {
    const { address } = req.body;
    if (!address) {
      return res.status(400).json({ error: 'Address is required' });
    }

    console.log('[validate-frontend] Processing address:', address);

    // Create AddressService
    console.log('[validate-frontend] Creating AddressService');
    const addressService = new AddressService();

    // Check for existing address
    console.log('[validate-frontend] Checking for existing address');
    const existingAddress = await addressService.findExistingAddress(address);

    if (existingAddress) {
      console.log('[validate-frontend] Found existing address:', existingAddress.id);
      return res.status(200).json({
        summary: existingAddress.summary,
        uploadLink: `/upload/${existingAddress.id}`,
        addressId: existingAddress.id,
        formattedAddress: existingAddress.formattedAddress
      });
    }

    // Create new address
    console.log('[validate-frontend] Creating new address');
    const newAddress = await addressService.createOrUpdateAddress(address);

    if (!newAddress) {
      console.log('[validate-frontend] Failed to create address');
      return res.status(400).json({ error: 'Invalid address' });
    }

    console.log('[validate-frontend] Successfully created new address:', newAddress.id);

    // Return the response
    return res.status(200).json({
      summary: newAddress.summary,
      uploadLink: `/upload/${newAddress.id}`,
      addressId: newAddress.id,
      formattedAddress: newAddress.formattedAddress
    });
  } catch (error) {
    console.error('[validate-frontend] Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
} 
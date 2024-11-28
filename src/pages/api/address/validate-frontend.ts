import { NextApiRequest, NextApiResponse } from 'next';
import { AddressService } from '../../../services/address.service';
import { AddressResponse } from '../../../types/address';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<AddressResponse | { error: string }>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Check if request is coming from our frontend or local testing
  const referer = req.headers.referer;
  const isLocalTest = req.headers['user-agent']?.includes('node-fetch') || 
                     req.headers['user-agent']?.includes('axios');
  
  if (!isLocalTest && (!referer || !referer.startsWith(process.env.NEXT_PUBLIC_BASE_URL || ''))) {
    return res.status(403).json({ error: 'Unauthorized' });
  }

  try {
    const { address } = req.body;

    if (!address || typeof address !== 'string') {
      return res.status(400).json({ error: 'Invalid address provided' });
    }

    const addressService = new AddressService();
    const result = await addressService.createOrUpdateAddress(address);

    if (!result) {
      return res.status(400).json({ error: 'Invalid address' });
    }

    const response: AddressResponse = {
      summary: result.summary,
      uploadLink: `${process.env.NEXT_PUBLIC_BASE_URL}/upload/${result.id}`,
      addressId: result.id
    };

    return res.status(200).json(response);
  } catch (error) {
    console.error('Error processing address:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
} 
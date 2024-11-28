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

  try {
    const { address, apiKey } = req.body;
    console.log('\n--- New Address Validation Request ---');
    console.log('Input address:', address);
    console.log('Environment:', {
      NODE_ENV: process.env.NODE_ENV,
      hasGoogleMapsKey: !!process.env.GOOGLE_MAPS_API_KEY,
      hasOpenAIKey: !!process.env.OPENAI_API_KEY
    });

    if (!address || typeof address !== 'string') {
      console.log('Invalid address format');
      return res.status(400).json({ error: 'Invalid address format' });
    }

    const addressService = new AddressService();
    console.log('Calling validateAndFormatAddress...');
    const geocodeResult = await addressService.validateAndFormatAddress(address);
    
    if (!geocodeResult) {
      console.log('No geocode result found');
      return res.status(400).json({ 
        error: 'Could not validate address. Please provide more details or check the format.' 
      });
    }

    console.log('Geocode result:', JSON.stringify(geocodeResult, null, 2));
    console.log('Creating or updating address...');
    const result = await addressService.createOrUpdateAddress(address);

    if (!result) {
      console.log('Failed to create/update address');
      return res.status(400).json({ 
        error: 'Failed to process address. Please try again.' 
      });
    }

    console.log('Success! Result:', result);
    const response: AddressResponse = {
      summary: result.summary || 'Address validated successfully',
      uploadLink: `${process.env.NEXT_PUBLIC_BASE_URL}/upload/${result.id}`,
      addressId: result.id
    };

    return res.status(200).json(response);
  } catch (error) {
    console.error('Error processing address:', error);
    if (error instanceof Error) {
      console.error('Error stack:', error.stack);
    }
    return res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Internal server error' 
    });
  }
} 
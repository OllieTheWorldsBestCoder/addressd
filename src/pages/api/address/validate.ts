import { NextApiRequest, NextApiResponse } from 'next';
import { AddressService } from '../../../services/address.service';
import { AddressResponse } from '../../../types/address';
import { authenticateRequest } from '../../../middleware/auth';
import { doc, updateDoc, increment } from 'firebase/firestore';
import { db } from '../../../config/firebase';
import { validateApiKey } from '../../../middleware/validateApiKey';
import { rateLimit } from '../../../middleware/rateLimit';

// Update the error response type to include optional details
interface ErrorResponse {
  error: string;
  details?: unknown;
}

// Apply middleware chain
const withMiddleware = (handler: any) => async (req: NextApiRequest, res: NextApiResponse) => {
  await validateApiKey(req, res, async () => {
    await rateLimit(req, res, async () => {
      await handler(req, res);
    });
  });
};

export default withMiddleware(async function handler(
  req: NextApiRequest,
  res: NextApiResponse<AddressResponse | ErrorResponse>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Authenticate the request
    const user = await authenticateRequest(req, res);
    if (!user) {
      console.log('Authentication failed');
      return; // Response already sent by authenticateRequest
    }

    console.log('Request authenticated for user:', user.id);
    const { address } = req.body;

    if (!address || typeof address !== 'string') {
      console.log('Invalid address format:', address);
      return res.status(400).json({ error: 'Invalid address provided' });
    }

    console.log('Creating AddressService...');
    const addressService = new AddressService();
    
    console.log('Calling createOrUpdateAddress with:', address);
    const result = await addressService.createOrUpdateAddress(address);

    if (!result) {
      console.log('No result returned from createOrUpdateAddress');
      return res.status(400).json({ error: 'Invalid address' });
    }

    console.log('Address processed successfully:', result.id);

    // If the address already existed (has descriptions), increment the user's summary count
    if (result.descriptions && result.descriptions.length > 0) {
      console.log('Updating user summary count...');
      await updateDoc(doc(db, 'users', user.id), {
        summaryCount: increment(1),
        updatedAt: new Date()
      });
    }

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
      error: error instanceof Error ? error.message : 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error : undefined
    });
  }
}); 
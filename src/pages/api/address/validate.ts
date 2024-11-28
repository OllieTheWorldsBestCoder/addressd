import { NextApiRequest, NextApiResponse } from 'next';
import { AddressService } from '../../../services/address.service';
import { AddressResponse } from '../../../types/address';
import { authenticateRequest } from '../../../middleware/auth';
import { doc, updateDoc, increment } from 'firebase/firestore';
import { db } from '../../../config/firebase';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<AddressResponse | { error: string }>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Authenticate the request
  const user = await authenticateRequest(req, res);
  if (!user) {
    return; // Response already sent by authenticateRequest
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

    // If the address already existed (has descriptions), increment the user's summary count
    if (result.descriptions.length > 0) {
      await updateDoc(doc(db, 'users', user.id), {
        summaryCount: increment(1),
        updatedAt: new Date()
      });
    }

    const response: AddressResponse = {
      summary: result.summary,
      uploadLink: `${process.env.NEXT_PUBLIC_BASE_URL}/upload/${result.id}`,
    };

    return res.status(200).json(response);
  } catch (error) {
    console.error('Error processing address:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
} 
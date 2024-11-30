import { NextApiRequest, NextApiResponse } from 'next';
import { AddressService } from '../../../services/address.service';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../../config/firebase';

interface ValidateResponse {
  success: boolean;
  foundAddress?: string;
  directions?: string;
  isNewAddress: boolean;
  uploadLink?: string;
  addressId?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ValidateResponse>
) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ 
      success: false,
      isNewAddress: false
    });
  }

  try {
    const { address } = req.body;

    if (!address) {
      return res.status(400).json({ 
        success: false,
        isNewAddress: false
      });
    }

    const addressService = new AddressService();
    const existingAddress = await addressService.findExistingAddress(address);

    if (existingAddress) {
      return res.status(200).json({
        success: true,
        foundAddress: existingAddress.formattedAddress,
        directions: existingAddress.summary || "It looks like we don't have information on this address just yet, why not be the first to help?",
        isNewAddress: false,
        uploadLink: `/upload/${existingAddress.id}`,
        addressId: existingAddress.id
      });
    }

    // If no existing address, validate and create new one
    const validatedAddress = await addressService.validateAndFormatAddress(address);
    
    if (!validatedAddress) {
      return res.status(400).json({ 
        success: false,
        isNewAddress: false
      });
    }

    // Create new address
    const newAddress = await addressService.createOrUpdateAddress(address);
    
    if (!newAddress) {
      return res.status(500).json({ 
        success: false,
        isNewAddress: false
      });
    }

    return res.status(200).json({
      success: true,
      foundAddress: newAddress.formattedAddress,
      directions: "It looks like we don't have information on this address just yet, why not be the first to help?",
      isNewAddress: true,
      uploadLink: `/upload/${newAddress.id}`,
      addressId: newAddress.id
    });

  } catch (error) {
    console.error('Error validating address:', error);
    return res.status(500).json({ 
      success: false,
      isNewAddress: false
    });
  }
} 
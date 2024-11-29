import { NextApiRequest, NextApiResponse } from 'next';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../../config/firebase';
import { Configuration, OpenAIApi } from "openai";
import { Address } from '../../../types/address';

const openai = new OpenAIApi(new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
}));

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { addressId } = req.body;

    if (!addressId) {
      return res.status(400).json({ error: 'Address ID is required' });
    }

    const addressRef = doc(db, 'addresses', addressId);
    const addressDoc = await getDoc(addressRef);

    if (!addressDoc.exists()) {
      return res.status(404).json({ error: 'Address not found' });
    }

    const address = addressDoc.data() as Address;
    
    if (!address.descriptions || address.descriptions.length === 0) {
      return res.status(400).json({ error: 'No descriptions to summarize' });
    }

    // Generate summary using OpenAI
    const prompt = `Summarize the following descriptions of ${address.formattedAddress}:\n\n${
      address.descriptions.map(d => d.content).join('\n\n')
    }`;

    const completion = await openai.createCompletion({
      model: "text-davinci-003",
      prompt,
      max_tokens: 200,
      temperature: 0.3,
    });

    const summary = completion.data.choices[0]?.text?.trim();

    if (!summary) {
      throw new Error('Failed to generate summary');
    }

    // Update address with new summary
    await updateDoc(addressRef, {
      summary,
      updatedAt: new Date()
    });

    return res.status(200).json({ summary });
  } catch (error) {
    console.error('Error generating summary:', error);
    return res.status(500).json({ 
      error: 'Failed to generate summary',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
} 
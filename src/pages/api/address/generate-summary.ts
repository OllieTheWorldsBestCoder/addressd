import { NextApiRequest, NextApiResponse } from 'next';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../../config/firebase';
import OpenAI from "openai";
import { Address } from '../../../types/address';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('Starting summary generation for request:', req.body);
    const { addressId } = req.body;

    if (!addressId) {
      console.error('No addressId provided');
      return res.status(400).json({ error: 'Address ID is required' });
    }

    const addressRef = doc(db, 'addresses', addressId);
    const addressDoc = await getDoc(addressRef);

    if (!addressDoc.exists()) {
      console.error(`Address not found for ID: ${addressId}`);
      return res.status(404).json({ error: 'Address not found' });
    }

    const address = addressDoc.data() as Address;
    console.log('Found address:', address);
    
    if (!address.descriptions || address.descriptions.length === 0) {
      console.error('No descriptions found for address');
      return res.status(400).json({ error: 'No descriptions to summarize' });
    }

    // Generate summary using OpenAI
    const prompt = `Summarize the following descriptions of ${address.formattedAddress}:\n\n${
      address.descriptions.map(d => d.content).join('\n\n')
    }`;

    console.log('Sending prompt to OpenAI:', prompt);

    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: "You are a helpful assistant that summarizes location descriptions."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.3,
      max_tokens: 200
    });

    console.log('OpenAI response:', completion);

    const summary = completion.choices[0]?.message?.content?.trim();

    if (!summary) {
      console.error('No summary generated from OpenAI');
      throw new Error('Failed to generate summary');
    }

    console.log('Generated summary:', summary);

    // Update address with new summary
    await updateDoc(addressRef, {
      summary,
      updatedAt: new Date()
    });

    console.log('Successfully updated address with new summary');

    return res.status(200).json({ summary });
  } catch (error) {
    console.error('Error in generate-summary:', error);
    return res.status(500).json({ 
      error: 'Failed to generate summary',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
} 
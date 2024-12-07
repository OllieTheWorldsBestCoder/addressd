import { NextApiRequest, NextApiResponse } from 'next';
import { collection, getDocs, query, where, updateDoc, doc, Timestamp } from 'firebase/firestore';
import { db } from '../../../config/firebase';
import { Address, Contribution } from '../../../types/address';
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Helper to check if a date is within last 24 hours
const isWithin24Hours = (date: Date) => {
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  return date >= twentyFourHoursAgo;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const addressesRef = collection(db, 'addresses');
    const snapshot = await getDocs(addressesRef);
    
    const results = {
      total: snapshot.size,
      updated: [] as string[],
      skipped: [] as string[],
      errors: [] as string[]
    };

    for (const addressDoc of snapshot.docs) {
      try {
        const address = addressDoc.data() as Address;

        // Skip if no descriptions
        if (!address.descriptions || address.descriptions.length === 0) {
          results.skipped.push(address.id);
          continue;
        }

        // Check if any new descriptions in last 24 hours
        const hasNewDescriptions = address.descriptions.some(desc => {
          const descDate = desc.createdAt instanceof Date ? 
            desc.createdAt : 
            (desc.createdAt as Timestamp).toDate();
          return isWithin24Hours(descDate);
        });

        // Skip if no new descriptions and already has summary
        if (!hasNewDescriptions && address.summary) {
          results.skipped.push(address.id);
          continue;
        }

        // Generate summary using OpenAI
        const prompt = `Summarize the following descriptions of ${address.formattedAddress}:\n\n${
          address.descriptions.map(d => d.content).join('\n\n')
        }`;

        console.log('Sending prompt to OpenAI:', prompt);

        const completion = await openai.chat.completions.create({
          model: "gpt4o-mini",
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
          throw new Error('Failed to generate summary');
        }

        // Update address with new summary
        await updateDoc(doc(db, 'addresses', address.id), {
          summary,
          updatedAt: new Date()
        });

        results.updated.push(address.id);

      } catch (error) {
        console.error(`Error processing address ${addressDoc.id}:`, error);
        results.errors.push(addressDoc.id);
      }
    }

    return res.status(200).json({
      message: 'Summary generation complete',
      results
    });

  } catch (error) {
    console.error('Error in generate-summaries:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
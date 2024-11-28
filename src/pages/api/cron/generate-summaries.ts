import { NextApiRequest, NextApiResponse } from 'next';
import { collection, getDocs, query, where, updateDoc, doc, Timestamp } from 'firebase/firestore';
import { db } from '../../../config/firebase';
import { Address, Contribution } from '../../../types/address';
import axios, { AxiosError } from 'axios';

// Helper to check if a date is within last 24 hours
const isWithin24Hours = (date: Date) => {
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  return date >= twentyFourHoursAgo;
};

// Add delay between requests
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function generateSummary(address: Address): Promise<string> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OpenAI API key is not configured');
  }

  if (!address.descriptions || address.descriptions.length === 0) {
    return `No descriptions available for ${address.formattedAddress}`;
  }

  const makeRequest = async (retryCount = 0): Promise<string> => {
    try {
      const response = await axios.post('https://api.openai.com/v1/chat/completions', {
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: "You are a helpful assistant that summarizes information about locations and addresses. Create concise, informative summaries that highlight key features and characteristics of the location."
          },
          {
            role: "user",
            content: `Please create a concise summary of this location (${address.formattedAddress}) based on the following descriptions:\n\n${address.descriptions.map(d => d.content).join('\n\n')}`
          }
        ],
        temperature: 0.7,
        max_tokens: 500
      }, {
        headers: {
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json'
        },
        timeout: 10000
      });

      if (!response.data.choices?.[0]?.message?.content) {
        throw new Error('Invalid response from OpenAI API');
      }

      return response.data.choices[0].message.content;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError<{ error?: { message: string } }>;
        
        // Handle rate limiting with retries
        if (axiosError.response?.status === 429 && retryCount < 3) {
          console.log(`Rate limited, retrying after delay... (Attempt ${retryCount + 1})`);
          await delay(Math.pow(2, retryCount) * 1000); // Exponential backoff
          return makeRequest(retryCount + 1);
        }
        
        if (axiosError.response?.status === 401) {
          throw new Error('Invalid OpenAI API key');
        }
        if (axiosError.code === 'ECONNABORTED') {
          throw new Error('OpenAI API request timed out');
        }
        throw new Error(`OpenAI API error: ${axiosError.response?.data?.error?.message || axiosError.message}`);
      }
      throw error;
    }
  };

  // Add delay between processing different addresses
  await delay(1000);
  return makeRequest();
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Verify request method
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Verify cron secret
  const authHeader = req.headers.authorization;
  const expectedAuth = `Bearer ${process.env.CRON_SECRET_KEY}`;
  
  console.log('Received auth header:', authHeader);  // Debug log
  console.log('Expected auth:', expectedAuth);       // Debug log
  console.log('CRON_SECRET_KEY:', process.env.CRON_SECRET_KEY); // Debug log
  
  if (!authHeader || authHeader !== expectedAuth) {
    console.error('Invalid or missing authorization header');
    console.error('Auth header:', authHeader);        // Debug log
    console.error('Expected:', expectedAuth);         // Debug log
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    // Get all addresses from Firestore
    const addressesRef = collection(db, 'addresses');
    const addressesSnapshot = await getDocs(addressesRef);
    
    const results = {
      updated: [] as string[],
      errors: [] as Array<{ id: string; error: string }>,
      skipped: [] as string[],
      total: addressesSnapshot.size
    };

    // Process each address
    for (const addressDoc of addressesSnapshot.docs) {
      const address = addressDoc.data() as Address;
      
      try {
        // Check if there are any new descriptions in the last 24 hours
        const hasNewDescriptions = address.descriptions.some(
          desc => isWithin24Hours(desc.createdAt instanceof Timestamp ? 
            desc.createdAt.toDate() : 
            new Date(desc.createdAt))
        );

        if (!hasNewDescriptions) {
          results.skipped.push(address.id);
          continue;
        }

        // Generate new summary
        const newSummary = await generateSummary(address);
        
        // Update the address with new summary
        await updateDoc(doc(db, 'addresses', address.id), {
          summary: newSummary,
          updatedAt: new Date()
        });

        results.updated.push(address.id);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error(`Error processing address ${address.id}:`, error);
        results.errors.push({ id: address.id, error: errorMessage });
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
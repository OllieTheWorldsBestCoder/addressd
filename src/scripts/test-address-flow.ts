import { config } from 'dotenv';
import { resolve } from 'path';
import { db } from '../config/firebase';
import { AddressService } from '../services/address.service';
import { doc, getDoc, updateDoc, arrayUnion } from 'firebase/firestore';
import OpenAI from "openai";
import { Address, Contribution } from '../types/address';
import { Client } from "@googlemaps/google-maps-services-js";

config({ path: resolve(process.cwd(), '.env.local') });

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function generateSummary(addressId: string) {
  try {
    console.log('Starting direct summary generation for:', addressId);
    
    const addressRef = doc(db, 'addresses', addressId);
    const addressDoc = await getDoc(addressRef);

    if (!addressDoc.exists()) {
      throw new Error('Address not found');
    }

    const address = addressDoc.data() as Address;
    
    if (!address.descriptions || address.descriptions.length === 0) {
      throw new Error('No descriptions to summarize');
    }

    const prompt = `Summarize the following descriptions of ${address.formattedAddress}:\n\n${
      address.descriptions.map((d: Contribution) => d.content).join('\n\n')
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

    console.log('Generated summary:', summary);

    await updateDoc(addressRef, {
      summary,
      updatedAt: new Date()
    });

    return summary;
  } catch (error) {
    console.error('Error generating summary:', error);
    throw error;
  }
}

async function testAddressFlow() {
  try {
    console.log('Starting address flow test...');

    // 1. Create/Update Address
    const addressService = new AddressService();
    const testAddress = "82a Market Street, St Andrews KY16 9PA";
    
    console.log('Creating/updating address:', testAddress);
    const address = await addressService.createOrUpdateAddress(testAddress);
    
    if (!address) {
      throw new Error('Failed to create/update address');
    }
    console.log('Address created/updated:', address);

    // 2. Add a description
    const description: Contribution = {
      content: "Test description for local testing",
      createdAt: new Date()
    };

    console.log('Adding description to address:', address.id);
    const addressRef = doc(db, 'addresses', address.id);
    await updateDoc(addressRef, {
      descriptions: arrayUnion(description)
    });

    // 3. Generate summary directly
    console.log('Generating summary...');
    const summary = await generateSummary(address.id);
    console.log('Summary generated:', summary);

    // 4. Verify final state
    const finalAddressDoc = await getDoc(addressRef);
    const finalAddress = finalAddressDoc.data();
    console.log('Final address state:', finalAddress);

  } catch (error) {
    console.error('Test failed:', error);
  }
}

// Run the test
testAddressFlow(); 
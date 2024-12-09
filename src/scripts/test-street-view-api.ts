import { config } from 'dotenv';
import { resolve } from 'path';
import axios from 'axios';
import OpenAI from 'openai';

// Load environment variables
config({ path: resolve(process.cwd(), '.env.local') });

const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

if (!GOOGLE_MAPS_API_KEY) {
  throw new Error('GOOGLE_MAPS_API_KEY is required');
}

if (!OPENAI_API_KEY) {
  throw new Error('OPENAI_API_KEY is required');
}

const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

async function getStreetViewImage(address: string) {
  try {
    // First, geocode the address to get coordinates
    const geocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${GOOGLE_MAPS_API_KEY}`;
    const geocodeResponse = await axios.get(geocodeUrl);
    
    if (geocodeResponse.data.status !== 'OK') {
      throw new Error(`Geocoding failed: ${geocodeResponse.data.status}`);
    }

    const location = geocodeResponse.data.results[0].geometry.location;
    console.log('Geocoded location:', location);

    // Then get the Street View metadata to check if an image is available
    const metadataUrl = `https://maps.googleapis.com/maps/api/streetview/metadata?location=${location.lat},${location.lng}&key=${GOOGLE_MAPS_API_KEY}`;
    const metadataResponse = await axios.get(metadataUrl);

    if (metadataResponse.data.status !== 'OK') {
      console.log('No Street View image available for this location');
      return null;
    }

    // Get the Street View image
    const imageUrl = `https://maps.googleapis.com/maps/api/streetview?size=640x640&location=${location.lat},${location.lng}&key=${GOOGLE_MAPS_API_KEY}`;
    console.log('Street View URL:', imageUrl);

    // Get image description from OpenAI Vision
    const imageResponse = await openai.chat.completions.create({
      model: "gpt-4-vision-preview",
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: "Describe this location in 2-3 sentences, focusing on the building's appearance and notable features. Keep it concise." },
            {
              type: "image_url",
              image_url: {
                url: imageUrl,
                detail: "low"
              }
            }
          ],
        },
      ],
      max_tokens: 150,
    });

    return {
      imageUrl,
      location,
      description: imageResponse.choices[0].message.content
    };

  } catch (error) {
    console.error('Error:', error);
    if (axios.isAxiosError(error)) {
      console.error('Response data:', error.response?.data);
    }
    throw error;
  }
}

async function testAddresses() {
  const addresses = [
    "10 Downing Street, London",
    "1600 Pennsylvania Avenue NW, Washington, DC",
    "350 5th Ave, New York, NY 10118", // Empire State Building
    "82a Market Street, St Andrews KY16 9PA"
  ];

  for (const address of addresses) {
    console.log(`\n=== Testing address: ${address} ===`);
    try {
      const result = await getStreetViewImage(address);
      if (result) {
        console.log('Success!');
        console.log('Location:', result.location);
        console.log('Image URL:', result.imageUrl);
        console.log('Description:', result.description);
      } else {
        console.log('No Street View image available');
      }
    } catch (error) {
      console.error(`Failed to process ${address}:`, error);
    }
    console.log('='.repeat(50));
  }
}

console.log('Starting Street View API test...');
testAddresses()
  .then(() => {
    console.log('Test completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Test failed:', error);
    process.exit(1);
  }); 
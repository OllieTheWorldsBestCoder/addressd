import { NextApiRequest, NextApiResponse } from 'next';
import { generateBlogPost } from '@/services/content-generation';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// Initialize Firebase Admin if not already initialized
if (!getApps().length) {
  initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')
    })
  });
}

const adminDb = getFirestore();

// Verify cron job secret
const verifyCronSecret = (req: NextApiRequest): boolean => {
  const cronSecret = process.env.CRON_SECRET_KEY;
  const headerSecret = req.headers['x-cron-secret'];
  
  console.log('Checking cron secret:', {
    headerReceived: !!headerSecret,
    secretConfigured: !!cronSecret,
  });
  
  return headerSecret === cronSecret;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Allow both GET and POST for cron jobs
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Verify cron secret
  if (!verifyCronSecret(req)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    console.log('Starting blog post generation...');
    const postId = await generateBlogPost();
    console.log('Successfully generated blog post:', postId);
    
    return res.status(200).json({
      success: true,
      postId
    });
  } catch (error) {
    console.error('Error in generate-blog-post cron job:', error);
    return res.status(500).json({
      error: 'Failed to generate blog post',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
} 
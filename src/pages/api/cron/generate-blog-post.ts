import { NextApiRequest, NextApiResponse } from 'next';
import { generateBlogPost } from '@/services/content-generation';
import { adminDb } from '../../../config/firebase-admin';  // Use Firebase Admin

// Verify cron job secret
const verifyCronSecret = (req: NextApiRequest): boolean => {
  const cronSecret = process.env.CRON_SECRET_KEY;
  const headerSecret = req.headers['x-cron-secret'];
  const isVercelCron = req.headers['x-vercel-cron'] === '1';  // Check for Vercel cron
  
  console.log('Checking cron secret:', {
    headerReceived: !!headerSecret,
    secretConfigured: !!cronSecret,
    isVercelCron
  });
  
  return headerSecret === cronSecret || isVercelCron;  // Allow Vercel cron jobs
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
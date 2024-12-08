import { NextApiRequest, NextApiResponse } from 'next';
import { generateBlogPost } from '@/services/content-generation';
import { adminDb } from '../../../config/firebase-admin';  // Use Firebase Admin

// Verify cron job secret
const verifyCronSecret = (req: NextApiRequest): boolean => {
  // For Vercel Cron jobs, this header will be present
  const isVercelCron = req.headers['x-vercel-cron'] === '1';
  
  console.log('Checking cron authentication:', {
    isVercelCron,
    headers: req.headers
  });
  
  return isVercelCron;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Allow both GET and POST for cron jobs
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Verify cron request
  if (!verifyCronSecret(req)) {
    return res.status(401).json({ error: 'Unauthorized - Not a Vercel cron request' });
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
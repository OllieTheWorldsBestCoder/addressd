import { NextApiRequest, NextApiResponse } from 'next';
import { generateBlogPost } from '@/services/content-generation';
import { signInWithCustomToken, getAuth } from 'firebase/auth';
import { auth } from '@/lib/firebase';

// Verify cron job secret
const verifyCronSecret = (req: NextApiRequest): boolean => {
  const cronSecret = process.env.CRON_SECRET_KEY;
  return req.headers['x-cron-secret'] === cronSecret;
};

// Sign in as cron job
async function signInAsCronJob() {
  try {
    await signInWithCustomToken(auth, process.env.CRON_SECRET_KEY || '');
  } catch (error) {
    console.error('Error signing in as cron job:', error);
    throw error;
  }
}

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
    // Sign in as cron job
    await signInAsCronJob();

    // Generate new blog post
    const postId = await generateBlogPost();
    
    // Sign out after operation
    await auth.signOut();

    return res.status(200).json({
      success: true,
      postId
    });
  } catch (error) {
    console.error('Error in generate-blog-post cron job:', error);
    // Make sure to sign out even if there's an error
    await auth.signOut();
    return res.status(500).json({
      error: 'Failed to generate blog post',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
} 
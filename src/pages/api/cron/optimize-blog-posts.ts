import { NextApiRequest, NextApiResponse } from 'next';
import { optimizeBlogPost } from '@/services/content-generation';
import { getBlogPosts, updateBlogPost } from '@/services/blog';
import { BlogPost } from '@/types/blog';

// Verify cron job secret
const verifyCronSecret = (req: NextApiRequest): boolean => {
  const cronSecret = process.env.CRON_SECRET;
  return req.headers['x-cron-secret'] === cronSecret;
};

// Number of posts to optimize per run
const POSTS_PER_RUN = 5;

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
    // Get posts that haven't been optimized recently
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { posts } = await getBlogPosts(1);
    const postsToOptimize = posts
      .filter((post: BlogPost) => !post.lastOptimizedAt || new Date(post.lastOptimizedAt) < thirtyDaysAgo)
      .slice(0, POSTS_PER_RUN);

    // Optimize each post
    const optimizationResults = await Promise.allSettled(
      postsToOptimize.map(async (post: BlogPost) => {
        const optimizedData = await optimizeBlogPost(post);
        await updateBlogPost(post.id, optimizedData);
        return {
          postId: post.id,
          title: post.title
        };
      })
    );

    // Process results
    const successful = optimizationResults.filter((result): result is PromiseFulfilledResult<{
      postId: string;
      title: string;
    }> => result.status === 'fulfilled');
    
    const failed = optimizationResults.filter((result): result is PromiseRejectedResult => 
      result.status === 'rejected'
    );

    return res.status(200).json({
      success: true,
      optimized: successful.length,
      failed: failed.length,
      details: {
        successful: successful.map((result) => result.value),
        failed: failed.map((result) => ({
          error: result.reason instanceof Error ? result.reason.message : 'Unknown error'
        }))
      }
    });
  } catch (error) {
    console.error('Error in optimize-blog-posts cron job:', error);
    return res.status(500).json({
      error: 'Failed to optimize blog posts',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
} 
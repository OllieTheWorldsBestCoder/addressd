import { NextApiRequest, NextApiResponse } from 'next';
import { getBlogPosts } from '@/services/blog';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const page = parseInt(req.query.page as string) || 1;
    const category = req.query.category as string;
    const tag = req.query.tag as string;

    const { posts, hasMore } = await getBlogPosts(
      page,
      category === 'all' ? undefined : category,
      tag === 'all' ? undefined : tag
    );

    return res.status(200).json({
      posts: JSON.parse(JSON.stringify(posts)), // Serialize dates
      hasMore
    });
  } catch (error) {
    console.error('Error fetching blog posts:', error);
    return res.status(500).json({ error: 'Failed to fetch blog posts' });
  }
} 
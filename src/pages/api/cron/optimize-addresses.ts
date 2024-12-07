import type { NextApiRequest, NextApiResponse } from 'next';
import { OptimizationService } from '../../../services/optimization.service';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Verify cron secret
  const cronSecret = req.headers['x-cron-secret'];
  if (cronSecret !== process.env.CRON_SECRET_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const optimizationService = new OptimizationService();
    await optimizationService.optimizeAddresses();
    
    return res.status(200).json({ 
      success: true,
      message: 'Address optimization completed successfully'
    });
  } catch (error) {
    console.error('Error in optimize-addresses cron:', error);
    return res.status(500).json({ 
      error: 'Failed to optimize addresses',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
} 
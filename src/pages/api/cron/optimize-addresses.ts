import type { NextApiRequest, NextApiResponse } from 'next';
import { AddressOptimizationService } from '../../../services/optimization.service';


export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const optimizer = new AddressOptimizationService();

  // Run daily optimization
  await optimizer.optimizeDatabase();

  // Update search indices
  await optimizer.updateSearchIndices();

  // Generate address statistics
  await generateAddressStats();
} 
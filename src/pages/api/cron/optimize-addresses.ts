import type { NextApiRequest, NextApiResponse } from 'next';
import { AddressOptimizationService } from '../../../services/optimization.service';
import { collection, getDocs, query, where, doc, setDoc } from 'firebase/firestore';
import { db } from '../../../config/firebase';

// Add function to generate address statistics
async function generateAddressStats() {
  const addressesRef = collection(db, 'addresses');
  const snapshot = await getDocs(addressesRef);
  
  const stats = {
    total: snapshot.size,
    withDescriptions: 0,
    withMatchedAddresses: 0,
    highConfidence: 0,
    averageConfidence: 0,
    timestamp: new Date()
  };

  let totalConfidence = 0;

  snapshot.docs.forEach(doc => {
    const address = doc.data();
    if (address.descriptions?.length > 0) stats.withDescriptions++;
    if (address.matchedAddresses?.length > 0) stats.withMatchedAddresses++;
    if (address.confidence >= 0.8) stats.highConfidence++;
    totalConfidence += address.confidence || 0;
  });

  stats.averageConfidence = totalConfidence / snapshot.size;

  // Store stats in Firestore
  await setDoc(doc(db, 'statistics', 'addresses'), {
    ...stats,
    updatedAt: new Date()
  });
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    const optimizer = new AddressOptimizationService();

    // Run daily optimization
    const optimizationResults = await optimizer.optimizeDatabase();

    // Update search indices
    await optimizer.updateSearchIndices();

    // Generate address statistics
    await generateAddressStats();

    return res.status(200).json({
      message: 'Optimization complete',
      results: optimizationResults
    });
  } catch (error) {
    console.error('Error in optimize-addresses:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
} 
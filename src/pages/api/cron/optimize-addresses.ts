export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const optimizer = new AddressOptimizationService();

  // Run daily optimization
  await optimizer.optimizeDatabase();

  // Update search indices
  await updateSearchIndices();

  // Generate address statistics
  await generateAddressStats();
} 
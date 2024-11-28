export function getVectorDistance(a: number[], b: number[]): number {
  if (a.length !== b.length) return 1; // Maximum distance if vectors don't match
  
  let sumSquares = 0;
  for (let i = 0; i < a.length; i++) {
    sumSquares += Math.pow(a[i] - b[i], 2);
  }
  
  return Math.sqrt(sumSquares);
}

export function normalizeVector(vector: number[]): number[] {
  const magnitude = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
  return vector.map(val => val / magnitude);
} 
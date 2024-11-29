export interface User {
  id: string;
  name: string;
  email: string;
  authToken: string;
  summaryCount: number;
  contributionPoints: number;
  createdAt: Date;
  updatedAt: Date;
} 
export interface User {
  id: string;
  name: string;
  email: string;
  authToken: string;
  summaryCount: number;
  contributionPoints: number;
  createdAt: Date;
  updatedAt: Date;
  embedAccess?: {
    isEmbedUser: boolean;
    managedAddresses: string[];  // Array of address IDs
    embedToken: string;  // Special token for embed access
  };
} 
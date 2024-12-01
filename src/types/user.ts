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
    activeEmbeds: {      // Track active embeds
      addressId: string;
      domain: string;    // Domain where embed is used
      createdAt: Date;
      lastUsed: Date;
      viewCount: number;
    }[];
  };
} 
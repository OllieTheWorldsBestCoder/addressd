export interface BlogPost {
  id: string;
  title: string;
  slug: string;
  content: string;
  excerpt: string;
  publishedAt: Date;
  updatedAt: Date;
  author: string;
  tags: string[];
  imageUrl?: string;
  
  // SEO metadata
  metaTitle: string;
  metaDescription: string;
  keywords: string[];
  
  // Analytics
  views: number;
  likes: number;
  
  // Generation metadata
  isGenerated: boolean;
  generationPrompt?: string;
  lastOptimizedAt?: Date;
}

export interface BlogCategory {
  id: string;
  name: string;
  slug: string;
  description: string;
  postCount: number;
}

export interface BlogTag {
  id: string;
  name: string;
  slug: string;
  postCount: number;
} 
import { db } from '@/lib/firebase';
import { BlogPost, BlogCategory, BlogTag } from '@/types/blog';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query as firestoreQuery,
  where,
  orderBy,
  limit,
  startAfter,
  increment,
  updateDoc,
  addDoc,
  Timestamp,
  DocumentSnapshot,
  QueryDocumentSnapshot
} from 'firebase/firestore';

const POSTS_PER_PAGE = 12;

export async function getBlogPosts(
  page: number = 1,
  category?: string,
  tag?: string
): Promise<{ posts: BlogPost[]; hasMore: boolean }> {
  try {
    let q = firestoreQuery(
      collection(db, 'blog_posts'),
      orderBy('publishedAt', 'desc'),
      limit(POSTS_PER_PAGE)
    );

    if (category) {
      q = firestoreQuery(q, where('categories', 'array-contains', category));
    }

    if (tag) {
      q = firestoreQuery(q, where('tags', 'array-contains', tag));
    }

    if (page > 1) {
      const lastVisible = await getLastVisiblePost(page);
      if (lastVisible) {
        q = firestoreQuery(q, startAfter(lastVisible));
      }
    }

    const snapshot = await getDocs(q);
    const posts = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data() as Omit<BlogPost, 'id'>
    })) as BlogPost[];

    // Check if there are more posts
    const nextQuery = firestoreQuery(
      collection(db, 'blog_posts'),
      orderBy('publishedAt', 'desc'),
      startAfter(snapshot.docs[snapshot.docs.length - 1]),
      limit(1)
    );
    const nextSnapshot = await getDocs(nextQuery);
    const hasMore = !nextSnapshot.empty;

    return { posts, hasMore };
  } catch (error) {
    console.error('Error fetching blog posts:', error);
    return { posts: [], hasMore: false };
  }
}

async function getLastVisiblePost(page: number): Promise<DocumentSnapshot | null> {
  try {
    const q = firestoreQuery(
      collection(db, 'blog_posts'),
      orderBy('publishedAt', 'desc'),
      limit((page - 1) * POSTS_PER_PAGE)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs[snapshot.docs.length - 1] || null;
  } catch (error) {
    console.error('Error getting last visible post:', error);
    return null;
  }
}

export async function getBlogPost(slug: string): Promise<BlogPost | null> {
  try {
    const q = firestoreQuery(
      collection(db, 'blog_posts'),
      where('slug', '==', slug),
      limit(1)
    );
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) {
      return null;
    }

    const post = {
      id: snapshot.docs[0].id,
      ...snapshot.docs[0].data() as Omit<BlogPost, 'id'>
    } as BlogPost;

    // Increment view count
    await updateDoc(doc(db, 'blog_posts', post.id), {
      views: increment(1)
    });

    return post;
  } catch (error) {
    console.error('Error fetching blog post:', error);
    return null;
  }
}

export async function getRelatedPosts(post: BlogPost): Promise<BlogPost[]> {
  try {
    const q = firestoreQuery(
      collection(db, 'blog_posts'),
      where('tags', 'array-contains-any', post.tags),
      where('id', '!=', post.id),
      orderBy('publishedAt', 'desc'),
      limit(2)
    );
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data() as Omit<BlogPost, 'id'>
    })) as BlogPost[];
  } catch (error) {
    console.error('Error fetching related posts:', error);
    return [];
  }
}

export async function getCategories(): Promise<BlogCategory[]> {
  try {
    const snapshot = await getDocs(collection(db, 'blog_categories'));
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data() as Omit<BlogCategory, 'id'>
    })) as BlogCategory[];
  } catch (error) {
    console.error('Error fetching categories:', error);
    return [];
  }
}

export async function getTags(): Promise<BlogTag[]> {
  try {
    const snapshot = await getDocs(collection(db, 'blog_tags'));
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data() as Omit<BlogTag, 'id'>
    })) as BlogTag[];
  } catch (error) {
    console.error('Error fetching tags:', error);
    return [];
  }
}

export async function createBlogPost(post: Omit<BlogPost, 'id'>): Promise<string> {
  try {
    const docRef = await addDoc(collection(db, 'blog_posts'), {
      ...post,
      publishedAt: Timestamp.fromDate(post.publishedAt),
      updatedAt: Timestamp.fromDate(post.updatedAt),
      views: 0,
      likes: 0
    });
    return docRef.id;
  } catch (error) {
    console.error('Error creating blog post:', error);
    throw error;
  }
}

export async function updateBlogPost(id: string, post: Partial<BlogPost>): Promise<void> {
  try {
    const docRef = doc(db, 'blog_posts', id);
    await updateDoc(docRef, {
      ...post,
      updatedAt: Timestamp.fromDate(new Date())
    });
  } catch (error) {
    console.error('Error updating blog post:', error);
    throw error;
  }
}

export async function likeBlogPost(id: string): Promise<void> {
  try {
    const docRef = doc(db, 'blog_posts', id);
    await updateDoc(docRef, {
      likes: increment(1)
    });
  } catch (error) {
    console.error('Error liking blog post:', error);
    throw error;
  }
}

export async function searchBlogPosts(query: string): Promise<BlogPost[]> {
  try {
    // TODO: Implement full-text search (consider using Algolia or similar)
    const q = firestoreQuery(
      collection(db, 'blog_posts'),
      orderBy('publishedAt', 'desc'),
      limit(10)
    );
    
    const snapshot = await getDocs(q);
    const posts = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data() as Omit<BlogPost, 'id'>
    })) as BlogPost[];

    // Simple client-side search
    return posts.filter(post =>
      post.title.toLowerCase().includes(query.toLowerCase()) ||
      post.content.toLowerCase().includes(query.toLowerCase()) ||
      post.excerpt.toLowerCase().includes(query.toLowerCase())
    );
  } catch (error) {
    console.error('Error searching blog posts:', error);
    return [];
  }
} 
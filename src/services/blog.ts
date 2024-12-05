import { db } from '@/config/firebase';
import { collection, getDocs, getDoc, doc, query, orderBy, where, limit as firestoreLimit, updateDoc, addDoc, Timestamp } from 'firebase/firestore';
import { BlogPost, BlogCategory, BlogTag } from '@/types/blog';

// Helper type for Firestore document
type FirestoreBlogPost = Omit<BlogPost, 'publishedAt' | 'updatedAt' | 'lastOptimizedAt'> & {
  publishedAt: Timestamp;
  updatedAt: Timestamp;
  lastOptimizedAt?: Timestamp | null;
};

export async function getAllBlogPosts(): Promise<BlogPost[]> {
  const postsRef = collection(db, 'blog_posts');
  const q = query(
    postsRef,
    where('published', '==', true),
    orderBy('publishedAt', 'desc')
  );
  
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => {
    const data = doc.data() as FirestoreBlogPost;
    return {
      id: doc.id,
      ...data,
      publishedAt: data.publishedAt.toDate(),
      updatedAt: data.updatedAt.toDate(),
      lastOptimizedAt: data.lastOptimizedAt?.toDate() || undefined
    } as BlogPost;
  });
}

export async function getBlogPosts(
  page: number = 1,
  category?: string,
  tag?: string
): Promise<{ posts: BlogPost[]; hasMore: boolean }> {
  const POSTS_PER_PAGE = 12;
  const postsRef = collection(db, 'blog_posts');
  let q = query(
    postsRef,
    where('published', '==', true),
    orderBy('publishedAt', 'desc'),
    firestoreLimit(POSTS_PER_PAGE)
  );

  if (category) {
    q = query(q, where('categories', 'array-contains', category));
  }

  if (tag) {
    q = query(q, where('tags', 'array-contains', tag));
  }

  const snapshot = await getDocs(q);
  const posts = snapshot.docs.map(doc => {
    const data = doc.data() as FirestoreBlogPost;
    return {
      id: doc.id,
      ...data,
      publishedAt: data.publishedAt.toDate(),
      updatedAt: data.updatedAt.toDate(),
      lastOptimizedAt: data.lastOptimizedAt?.toDate() || undefined
    } as BlogPost;
  });

  // Check if there are more posts
  const nextQuery = query(
    postsRef,
    orderBy('publishedAt', 'desc'),
    firestoreLimit(1)
  );
  const nextSnapshot = await getDocs(nextQuery);
  const hasMore = !nextSnapshot.empty;

  return { posts, hasMore };
}

export async function getBlogPost(slug: string): Promise<BlogPost | null> {
  const postsRef = collection(db, 'blog_posts');
  const q = query(postsRef, where('slug', '==', slug), firestoreLimit(1));
  const snapshot = await getDocs(q);
  
  if (snapshot.empty) {
    return null;
  }
  
  const doc = snapshot.docs[0];
  const data = doc.data() as FirestoreBlogPost;
  return {
    id: doc.id,
    ...data,
    publishedAt: data.publishedAt.toDate(),
    updatedAt: data.updatedAt.toDate(),
    lastOptimizedAt: data.lastOptimizedAt?.toDate() || undefined
  } as BlogPost;
}

export async function getRelatedPosts(currentPost: BlogPost, limit: number = 2): Promise<BlogPost[]> {
  const postsRef = collection(db, 'blog_posts');
  const q = query(
    postsRef,
    where('published', '==', true),
    where('tags', 'array-contains-any', currentPost.tags),
    where('slug', '!=', currentPost.slug),
    orderBy('publishedAt', 'desc'),
    firestoreLimit(limit)
  );
  
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => {
    const data = doc.data() as FirestoreBlogPost;
    return {
      id: doc.id,
      ...data,
      publishedAt: data.publishedAt.toDate(),
      updatedAt: data.updatedAt.toDate(),
      lastOptimizedAt: data.lastOptimizedAt?.toDate() || undefined
    } as BlogPost;
  });
}

export async function getAllCategories(): Promise<BlogCategory[]> {
  const categoriesRef = collection(db, 'blog_categories');
  const snapshot = await getDocs(categoriesRef);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  })) as BlogCategory[];
}

export async function getAllTags(): Promise<BlogTag[]> {
  const tagsRef = collection(db, 'blog_tags');
  const snapshot = await getDocs(tagsRef);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  })) as BlogTag[];
}

export async function incrementPostViews(postId: string): Promise<void> {
  const postRef = doc(db, 'blog_posts', postId);
  const postDoc = await getDoc(postRef);
  
  if (postDoc.exists()) {
    const currentViews = postDoc.data().views || 0;
    await updateDoc(postRef, {
      views: currentViews + 1
    });
  }
}

export async function incrementPostLikes(postId: string): Promise<void> {
  const postRef = doc(db, 'blog_posts', postId);
  const postDoc = await getDoc(postRef);
  
  if (postDoc.exists()) {
    const currentLikes = postDoc.data().likes || 0;
    await updateDoc(postRef, {
      likes: currentLikes + 1
    });
  }
}

export async function createBlogPost(post: Omit<BlogPost, 'id'>): Promise<string> {
  const firestorePost: Omit<FirestoreBlogPost, 'id'> = {
    ...post,
    publishedAt: Timestamp.fromDate(post.publishedAt),
    updatedAt: Timestamp.fromDate(post.updatedAt),
    lastOptimizedAt: post.lastOptimizedAt ? Timestamp.fromDate(post.lastOptimizedAt) : null
  };

  const docRef = await addDoc(collection(db, 'blog_posts'), firestorePost);
  return docRef.id;
}

export async function updateBlogPost(id: string, post: Partial<BlogPost>): Promise<void> {
  const docRef = doc(db, 'blog_posts', id);
  const updateData: Partial<FirestoreBlogPost> = { ...post };
  
  // Convert dates to Firestore Timestamps
  if (post.publishedAt) {
    updateData.publishedAt = Timestamp.fromDate(post.publishedAt);
  }
  if (post.updatedAt) {
    updateData.updatedAt = Timestamp.fromDate(post.updatedAt);
  }
  if (post.lastOptimizedAt) {
    updateData.lastOptimizedAt = Timestamp.fromDate(post.lastOptimizedAt);
  }
  
  await updateDoc(docRef, updateData);
} 
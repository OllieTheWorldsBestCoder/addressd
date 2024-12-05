import { useState } from 'react';
import Head from 'next/head';
import { motion } from 'framer-motion';
import Layout from '@/components/Layout';
import BlogCard from '@/components/BlogCard';
import { BlogPost, BlogCategory, BlogTag } from '@/types/blog';
import { getBlogPosts, getAllCategories, getAllTags } from '@/services/blog';
import { GetServerSideProps } from 'next';

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 }
};

interface BlogIndexProps {
  initialPosts: BlogPost[];
  categories: BlogCategory[];
  tags: BlogTag[];
  hasMore: boolean;
}

export default function BlogIndex({ initialPosts, categories, tags, hasMore }: BlogIndexProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedTag, setSelectedTag] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [posts, setPosts] = useState<BlogPost[]>(initialPosts);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMorePosts, setHasMorePosts] = useState(hasMore);

  const loadMorePosts = async () => {
    if (loading || !hasMorePosts) return;
    
    setLoading(true);
    try {
      const nextPage = page + 1;
      const response = await fetch(`/api/blog/posts?page=${nextPage}&category=${selectedCategory}&tag=${selectedTag}`);
      const data = await response.json();
      
      setPosts(prev => [...prev, ...data.posts]);
      setHasMorePosts(data.hasMore);
      setPage(nextPage);
    } catch (error) {
      console.error('Error loading more posts:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredPosts = posts.filter(post => {
    if (selectedCategory !== 'all' && !post.categories?.includes(selectedCategory)) return false;
    if (selectedTag !== 'all' && !post.tags?.includes(selectedTag)) return false;
    if (searchQuery && !post.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  return (
    <Layout>
      <Head>
        <title>Blog - addressd | Delivery Optimization & Location Guidance</title>
        <meta 
          name="description" 
          content="Expert insights on delivery optimization, location guidance, and reducing failed deliveries. Stay updated with the latest trends in logistics and last-mile delivery."
        />
        <meta 
          name="keywords" 
          content="delivery optimization, failed deliveries, location guidance, logistics, last-mile delivery, delivery directions"
        />
      </Head>

      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white pt-20 pb-32">
        <div className="container mx-auto px-4">
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="max-w-7xl mx-auto space-y-12"
          >
            {/* Header */}
            <motion.div variants={itemVariants} className="text-center">
              <h1 className="text-4xl font-bold text-gray-900 mb-4">
                Delivery Optimization Blog
              </h1>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                Expert insights and guides on improving delivery success rates, optimizing routes,
                and providing clear location guidance.
              </p>
            </motion.div>

            {/* Filters */}
            <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-2">
                  Category
                </label>
                <select
                  id="category"
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                >
                  <option value="all">All Categories</option>
                  {categories.map(category => (
                    <option key={category.id} value={category.slug}>
                      {category.name} ({category.postCount})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="tag" className="block text-sm font-medium text-gray-700 mb-2">
                  Tag
                </label>
                <select
                  id="tag"
                  value={selectedTag}
                  onChange={(e) => setSelectedTag(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                >
                  <option value="all">All Tags</option>
                  {tags.map(tag => (
                    <option key={tag.id} value={tag.slug}>
                      {tag.name} ({tag.postCount})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-2">
                  Search
                </label>
                <input
                  type="text"
                  id="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search articles..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                />
              </div>
            </motion.div>

            {/* Blog Posts Grid */}
            <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {filteredPosts.length > 0 ? (
                filteredPosts.map(post => (
                  <BlogCard key={post.id} post={post} />
                ))
              ) : (
                <div className="col-span-full text-center py-12">
                  <p className="text-gray-600">No articles found matching your criteria.</p>
                </div>
              )}
            </motion.div>

            {/* Load More Button */}
            {hasMorePosts && (
              <motion.div variants={itemVariants} className="text-center mt-8">
                <button
                  onClick={loadMorePosts}
                  disabled={loading}
                  className="px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Loading...' : 'Load More Posts'}
                </button>
              </motion.div>
            )}
          </motion.div>
        </div>
      </div>
    </Layout>
  );
}

export const getServerSideProps: GetServerSideProps = async ({ query }) => {
  try {
    const { posts, hasMore } = await getBlogPosts(1, query.category as string, query.tag as string);
    const [categories, tags] = await Promise.all([
      getAllCategories(),
      getAllTags()
    ]);

    return {
      props: {
        initialPosts: JSON.parse(JSON.stringify(posts)),
        categories: JSON.parse(JSON.stringify(categories)),
        tags: JSON.parse(JSON.stringify(tags)),
        hasMore
      }
    };
  } catch (error) {
    console.error('Error fetching blog data:', error);
    return {
      props: {
        initialPosts: [],
        categories: [],
        tags: [],
        hasMore: false
      }
    };
  }
}; 
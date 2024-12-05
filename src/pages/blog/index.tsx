import { useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { FiCalendar, FiTag, FiEye, FiHeart } from 'react-icons/fi';
import Layout from '@/components/Layout';
import { BlogPost, BlogCategory, BlogTag } from '@/types/blog';

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

export default function BlogIndex() {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedTag, setSelectedTag] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // TODO: Replace with actual data fetching
  const posts: BlogPost[] = [];
  const categories: BlogCategory[] = [];
  const tags: BlogTag[] = [];

  const filteredPosts = posts.filter(post => {
    if (selectedCategory !== 'all' && !post.tags.includes(selectedCategory)) return false;
    if (selectedTag !== 'all' && !post.tags.includes(selectedTag)) return false;
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
                  <Link key={post.id} href={`/blog/${post.slug}`}>
                    <motion.article 
                      className="bg-white rounded-xl shadow-sm hover:shadow-lg transition-shadow p-6 border border-gray-100"
                      whileHover={{ y: -4 }}
                    >
                      {post.imageUrl && (
                        <div className="aspect-video rounded-lg overflow-hidden mb-4">
                          <img 
                            src={post.imageUrl} 
                            alt={post.title}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}
                      <h2 className="text-xl font-semibold text-gray-900 mb-2">
                        {post.title}
                      </h2>
                      <p className="text-gray-600 text-sm mb-4">
                        {post.excerpt}
                      </p>
                      <div className="flex items-center justify-between text-sm text-gray-500">
                        <div className="flex items-center">
                          <FiCalendar className="mr-1" />
                          {new Date(post.publishedAt).toLocaleDateString()}
                        </div>
                        <div className="flex items-center space-x-4">
                          <span className="flex items-center">
                            <FiEye className="mr-1" />
                            {post.views}
                          </span>
                          <span className="flex items-center">
                            <FiHeart className="mr-1" />
                            {post.likes}
                          </span>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2 mt-4">
                        {post.tags.map(tag => (
                          <span 
                            key={tag}
                            className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800"
                          >
                            <FiTag className="mr-1" />
                            {tag}
                          </span>
                        ))}
                      </div>
                    </motion.article>
                  </Link>
                ))
              ) : (
                <div className="col-span-full text-center py-12">
                  <p className="text-gray-600">No articles found matching your criteria.</p>
                </div>
              )}
            </motion.div>
          </motion.div>
        </div>
      </div>
    </Layout>
  );
} 
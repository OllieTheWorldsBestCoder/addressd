import { useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { FiCalendar, FiTag, FiEye, FiHeart, FiShare2, FiArrowLeft } from 'react-icons/fi';
import Layout from '@/components/Layout';
import { BlogPost } from '@/types/blog';
import { GetServerSideProps } from 'next';
import { getBlogPost, getRelatedPosts, incrementPostViews } from '@/services/blog';
import ReactMarkdown from 'react-markdown';

interface BlogPostPageProps {
  post: BlogPost;
  relatedPosts: BlogPost[];
}

export default function BlogPostPage({ post, relatedPosts }: BlogPostPageProps) {
  useEffect(() => {
    // Increment view count
    if (post?.id) {
      incrementPostViews(post.id);
    }
  }, [post?.id]);

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: post.title,
          text: post.excerpt,
          url: window.location.href,
        });
      } catch (err) {
        console.error('Error sharing:', err);
      }
    }
  };

  if (!post) {
    return (
      <Layout>
        <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white pt-20 pb-32">
          <div className="container mx-auto px-4 text-center">
            <h1 className="text-2xl font-bold text-gray-900">Post not found</h1>
            <Link href="/blog" className="text-primary hover:text-primary-dark mt-4 inline-block">
              Return to Blog
            </Link>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <Head>
        <title>{post.title} - addressd</title>
        <meta name="description" content={post.excerpt} />
        <meta name="keywords" content={post.tags?.join(', ')} />
        
        {/* Open Graph */}
        <meta property="og:title" content={post.title} />
        <meta property="og:description" content={post.excerpt} />
        <meta property="og:type" content="article" />
        {post.imageUrl && <meta property="og:image" content={post.imageUrl} />}
        
        {/* Twitter Card */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={post.title} />
        <meta name="twitter:description" content={post.excerpt} />
        {post.imageUrl && <meta name="twitter:image" content={post.imageUrl} />}
      </Head>

      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white pt-20 pb-32">
        <article className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            {/* Back Link */}
            <Link href="/blog" className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-8">
              <FiArrowLeft className="mr-2" />
              Back to Blog
            </Link>

            {/* Header */}
            <motion.header
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-12"
            >
              {post.imageUrl && (
                <div className="aspect-video rounded-xl overflow-hidden mb-8">
                  <img 
                    src={post.imageUrl} 
                    alt={post.title}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}

              <h1 className="text-4xl font-bold text-gray-900 mb-4">
                {post.title}
              </h1>

              <div className="flex items-center justify-between text-sm text-gray-500 mb-6">
                <div className="flex items-center space-x-6">
                  <span className="flex items-center">
                    <FiCalendar className="mr-1" />
                    {new Date(post.publishedAt).toLocaleDateString()}
                  </span>
                  <span className="flex items-center">
                    <FiEye className="mr-1" />
                    {post.views} views
                  </span>
                  <span className="flex items-center">
                    <FiHeart className="mr-1" />
                    {post.likes} likes
                  </span>
                </div>
                <button
                  onClick={handleShare}
                  className="flex items-center text-gray-500 hover:text-gray-900"
                >
                  <FiShare2 className="mr-1" />
                  Share
                </button>
              </div>

              <div className="flex flex-wrap gap-2">
                {post.tags?.map(tag => (
                  <span 
                    key={tag}
                    className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800"
                  >
                    <FiTag className="mr-1" />
                    {tag}
                  </span>
                ))}
              </div>
            </motion.header>

            {/* Content */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="prose prose-lg max-w-none"
            >
              <ReactMarkdown>{post.content}</ReactMarkdown>
            </motion.div>

            {/* Author Info */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="mt-12 p-6 bg-white rounded-xl shadow-sm border border-gray-100"
            >
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                About the Author
              </h3>
              <p className="text-gray-600">
                Written by {post.author}
              </p>
            </motion.div>

            {/* Related Posts */}
            {relatedPosts.length > 0 && (
              <motion.section
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="mt-16"
              >
                <h2 className="text-2xl font-bold text-gray-900 mb-6">
                  Related Articles
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {relatedPosts.map(relatedPost => (
                    <Link key={relatedPost.id} href={`/blog/${relatedPost.slug}`}>
                      <motion.article 
                        className="bg-white rounded-xl shadow-sm hover:shadow-lg transition-shadow p-6 border border-gray-100"
                        whileHover={{ y: -4 }}
                      >
                        <h3 className="text-xl font-semibold text-gray-900 mb-2">
                          {relatedPost.title}
                        </h3>
                        <p className="text-gray-600 text-sm">
                          {relatedPost.excerpt}
                        </p>
                      </motion.article>
                    </Link>
                  ))}
                </div>
              </motion.section>
            )}
          </div>
        </article>
      </div>
    </Layout>
  );
}

export const getServerSideProps: GetServerSideProps = async ({ params }) => {
  try {
    const slug = params?.slug as string;
    console.log('Fetching blog post with slug:', slug);
    
    const post = await getBlogPost(slug);
    console.log('Blog post found:', post ? 'yes' : 'no');
    
    if (!post) {
      console.log('Blog post not found, returning 404');
      return {
        notFound: true
      };
    }

    console.log('Fetching related posts...');
    const relatedPosts = await getRelatedPosts(post);
    console.log('Found related posts:', relatedPosts.length);

    // Convert dates to strings for serialization
    const serializedPost = {
      ...post,
      publishedAt: post.publishedAt.toISOString(),
      updatedAt: post.updatedAt.toISOString(),
      lastOptimizedAt: post.lastOptimizedAt?.toISOString()
    };

    return {
      props: {
        post: serializedPost,
        relatedPosts: relatedPosts.map(p => ({
          ...p,
          publishedAt: p.publishedAt.toISOString(),
          updatedAt: p.updatedAt.toISOString(),
          lastOptimizedAt: p.lastOptimizedAt?.toISOString()
        }))
      }
    };
  } catch (error) {
    console.error('Error in getServerSideProps:', error);
    throw error; // Let Next.js handle the error page
  }
} 
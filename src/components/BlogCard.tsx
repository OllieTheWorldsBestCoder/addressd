import Link from 'next/link';
import { motion } from 'framer-motion';
import { FiCalendar, FiTag, FiEye, FiHeart } from 'react-icons/fi';
import { BlogPost } from '@/types/blog';

interface BlogCardProps {
  post: BlogPost;
}

export default function BlogCard({ post }: BlogCardProps) {
  return (
    <Link href={`/blog/${post.slug}`}>
      <motion.article 
        className="bg-white rounded-xl shadow-sm hover:shadow-lg transition-shadow p-6 border border-gray-100 h-full flex flex-col"
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
        
        <h2 className="text-xl font-semibold text-gray-900 mb-2 line-clamp-2">
          {post.title}
        </h2>
        
        <p className="text-gray-600 text-sm mb-4 flex-grow line-clamp-3">
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
        
        {post.tags && post.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-4">
            {post.tags.slice(0, 3).map(tag => (
              <span 
                key={tag}
                className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800"
              >
                <FiTag className="mr-1" />
                {tag}
              </span>
            ))}
            {post.tags.length > 3 && (
              <span className="text-xs text-gray-500">
                +{post.tags.length - 3} more
              </span>
            )}
          </div>
        )}
      </motion.article>
    </Link>
  );
} 
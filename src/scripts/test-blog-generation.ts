import { config } from 'dotenv';
import { resolve } from 'path';
import { generateBlogPost } from '../services/content-generation';
import { getBlogPost } from '../services/blog';

// Load environment variables
config({ path: resolve(process.cwd(), '.env.local') });

async function testBlogGeneration() {
  try {
    console.log('Starting blog post generation test...');
    
    // Generate a new blog post
    console.log('Generating blog post...');
    const postId = await generateBlogPost();
    console.log('Blog post generated with ID:', postId);
    
    // Fetch the generated post
    console.log('\nFetching generated post...');
    const post = await getBlogPost(postId);
    
    if (!post) {
      console.error('Failed to fetch generated post');
      return;
    }

    // Display the results
    console.log('\n=== Generated Blog Post ===');
    console.log('Title:', post.title);
    console.log('\nMeta Description:', post.metaDescription);
    console.log('\nExcerpt:', post.excerpt);
    console.log('\nTags:', post.tags.join(', '));
    console.log('\nKeywords:', post.keywords.join(', '));
    console.log('\nContent:', post.content);
    
  } catch (error) {
    console.error('Error in test:', error);
  }
}

// Run the test
testBlogGeneration(); 
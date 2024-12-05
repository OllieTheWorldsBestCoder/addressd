import { config } from 'dotenv';
import { resolve } from 'path';
import { createBlogPost } from '../services/blog';
import { BlogPost } from '../types/blog';

// Load environment variables
config({ path: resolve(process.cwd(), '.env.local') });

async function createTestBlogPost() {
  try {
    console.log('Creating test blog post...');
    
    const testPost: Omit<BlogPost, 'id'> = {
      title: 'How to Optimize Your Business Location for Deliveries',
      slug: 'optimize-business-location-deliveries',
      content: `
        <h2>Understanding Delivery Optimization</h2>
        <p>In today's fast-paced world, ensuring your business location is optimized for deliveries is crucial for success. This guide will help you understand the key factors that affect delivery efficiency and how to improve them.</p>

        <h3>1. Clear Address Information</h3>
        <p>Make sure your business address is clearly visible and easy to understand. This includes:</p>
        <ul>
          <li>Proper street signage</li>
          <li>Visible building numbers</li>
          <li>Clear entrance markings</li>
          <li>Accurate GPS coordinates</li>
        </ul>

        <h3>2. Delivery Access Points</h3>
        <p>Optimize your delivery access points by:</p>
        <ul>
          <li>Designating specific delivery zones</li>
          <li>Installing proper lighting</li>
          <li>Maintaining clear pathways</li>
          <li>Providing loading/unloading areas</li>
        </ul>

        <h3>3. Communication Systems</h3>
        <p>Implement effective communication systems:</p>
        <ul>
          <li>Clear delivery instructions</li>
          <li>Contact information availability</li>
          <li>Real-time updates capability</li>
          <li>Feedback mechanisms</li>
        </ul>

        <h2>Best Practices for Implementation</h2>
        <p>Follow these best practices to ensure successful implementation:</p>
        <ol>
          <li>Regularly audit your location's accessibility</li>
          <li>Train staff on delivery protocols</li>
          <li>Maintain open communication with delivery services</li>
          <li>Collect and act on feedback</li>
        </ol>

        <h2>Measuring Success</h2>
        <p>Track these key metrics to measure the success of your optimization efforts:</p>
        <ul>
          <li>Delivery success rate</li>
          <li>Average delivery time</li>
          <li>Driver feedback scores</li>
          <li>Customer satisfaction ratings</li>
        </ul>
      `,
      excerpt: 'Learn how to optimize your business location for efficient deliveries with our comprehensive guide covering address visibility, access points, and communication systems.',
      publishedAt: new Date(),
      updatedAt: new Date(),
      author: 'addressd Team',
      tags: ['delivery', 'optimization', 'business', 'location'],
      categories: ['Delivery Optimization', 'Business Tips'],
      metaTitle: 'How to Optimize Your Business Location for Deliveries | addressd',
      metaDescription: 'Learn how to optimize your business location for efficient deliveries. Comprehensive guide covering address visibility, access points, and communication systems.',
      keywords: ['delivery optimization', 'business location', 'delivery efficiency', 'address visibility', 'delivery access'],
      views: 0,
      likes: 0,
      isGenerated: false,
      published: true
    };

    const postId = await createBlogPost(testPost);
    console.log('Successfully created test blog post with ID:', postId);
    
  } catch (error) {
    console.error('Error creating test blog post:', error);
  }
}

// Run the test
createTestBlogPost(); 
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
# Understanding Delivery Optimization

In today's fast-paced world, ensuring your business location is optimized for deliveries is crucial for success. This guide will help you understand the key factors that affect delivery efficiency and how to improve them.

## Clear Address Information

Make sure your business address is clearly visible and easy to understand. This includes:

- Proper street signage
- Visible building numbers
- Clear entrance markings
- Accurate GPS coordinates

## Delivery Access Points

Optimize your delivery access points by:

- Designating specific delivery zones
- Installing proper lighting
- Maintaining clear pathways
- Providing loading/unloading areas

## Communication Systems

Implement effective communication systems:

- Clear delivery instructions
- Contact information availability
- Real-time updates capability
- Feedback mechanisms

## Best Practices for Implementation

Follow these best practices to ensure successful implementation:

1. Regularly audit your location's accessibility
2. Train staff on delivery protocols
3. Maintain open communication with delivery services
4. Collect and act on feedback

## Measuring Success

Track these key metrics to measure the success of your optimization efforts:

- Delivery success rate
- Average delivery time
- Driver feedback scores
- Customer satisfaction ratings
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
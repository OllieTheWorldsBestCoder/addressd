import { OpenAI } from 'openai';
import { BlogPost } from '@/types/blog';
import { createBlogPost } from './blog';
import slugify from 'slugify';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || ''
});

// Topics related to our niche
const TOPIC_CATEGORIES = [
  'Customer Location Challenges',  // e.g., Hard-to-find business locations
  'Delivery Pain Points',         // e.g., Failed deliveries, wrong addresses
  'Local Business Visibility',    // e.g., Getting found by customers
  'Address Communication',        // e.g., Clear directions for customers/drivers
  'Delivery Driver Experience',   // e.g., Reducing driver confusion
  'Customer Navigation',          // e.g., Helping customers find your business
  'Small Business Accessibility', // e.g., Making your location easy to find
  'Location Optimization',        // e.g., Improving your business's findability
  'Delivery Success Strategies',  // e.g., Reducing failed deliveries
  'Location Marketing',          // e.g., Promoting your physical location
  'Food Delivery Optimization',  // e.g., Restaurant delivery challenges
  'Retail Delivery Solutions',   // e.g., Shop delivery improvements
  'Service Business Location',   // e.g., Getting found by service customers
  'Event Venue Directions',      // e.g., Helping guests find your venue
  'Healthcare Location Access'   // e.g., Patient navigation to facilities
] as const;

// Keywords to include for SEO
const CORE_KEYWORDS = [
  'business location',
  'easy to find',
  'clear directions',
  'delivery success',
  'location findability',
  'address accuracy',
  'customer navigation',
  'delivery optimization',
  'location visibility',
  'business accessibility',
  'delivery instructions',
  'location marketing',
  'navigation guidance',
  'address verification',
  'customer experience'
] as const;

interface GeneratedContent {
  title: string;
  content: string;
  excerpt: string;
  tags: string[];
  keywords: string[];
  metaTitle: string;
  metaDescription: string;
}

export async function generateBlogPost(): Promise<string> {
  try {
    // 1. Generate topic and outline
    const topic = await generateTopic();
    const outline = await generateOutline(topic);
    
    // 2. Generate full content
    const content = await generateContent(topic, outline);
    
    // 3. Generate SEO metadata
    const seoData = await generateSEOMetadata(topic, content);
    
    // 4. Create blog post
    const post: Omit<BlogPost, 'id'> = {
      title: seoData.title,
      slug: slugify(seoData.title, { lower: true, strict: true }),
      content: content.content,
      excerpt: seoData.excerpt,
      publishedAt: new Date(),
      updatedAt: new Date(),
      author: 'addressd Team',
      tags: seoData.tags,
      metaTitle: seoData.metaTitle,
      metaDescription: seoData.metaDescription,
      keywords: seoData.keywords,
      views: 0,
      likes: 0,
      isGenerated: true,
      generationPrompt: topic,
      lastOptimizedAt: new Date()
    };

    // Save to Firestore
    const postId = await createBlogPost(post);
    return postId;
  } catch (error) {
    console.error('Error generating blog post:', error);
    throw error;
  }
}

async function generateTopic(): Promise<string> {
  const category = TOPIC_CATEGORIES[Math.floor(Math.random() * TOPIC_CATEGORIES.length)];
  
  const completion = await openai.chat.completions.create({
    model: 'gpt-4',
    messages: [
      {
        role: 'system',
        content: `You are an expert in business location optimization and delivery success. Your goal is to help businesses solve real problems related to:
- Making their locations easier to find for customers and delivery drivers
- Improving delivery success rates
- Enhancing their location's visibility and accessibility
- Optimizing their address communication

Focus on practical, actionable advice that addresses common pain points.`
      },
      {
        role: 'user',
        content: `Generate a compelling blog post topic about ${category} that addresses a specific challenge faced by businesses. 
The topic should:
- Target a real pain point that businesses experience
- Promise clear, actionable solutions
- Appeal to business owners and operations managers
- Focus on improving findability or delivery success`
      }
    ],
    temperature: 0.7,
    max_tokens: 100
  });

  return completion.choices[0].message.content || '';
}

async function generateOutline(topic: string): Promise<string[]> {
  const completion = await openai.chat.completions.create({
    model: 'gpt-4',
    messages: [
      {
        role: 'system',
        content: `You are a content strategist specializing in business location optimization and delivery success. 
Your goal is to create practical, actionable content that helps businesses:
- Improve their findability
- Optimize their delivery operations
- Enhance customer experience
- Increase operational efficiency`
      },
      {
        role: 'user',
        content: `Create a detailed outline for a blog post about: ${topic}

The outline should:
- Start with the core problem/challenge
- Include real-world examples or scenarios
- Focus on practical, implementable solutions
- Address both immediate fixes and long-term strategies
- Include relevant statistics or data points where applicable
- End with measurable outcomes or success indicators

Include 4-6 main sections with specific subpoints.`
      }
    ],
    temperature: 0.7,
    max_tokens: 400
  });

  return completion.choices[0].message.content?.split('\n').filter(Boolean) || [];
}

async function generateContent(topic: string, outline: string[]): Promise<{ content: string }> {
  const completion = await openai.chat.completions.create({
    model: 'gpt-4',
    messages: [
      {
        role: 'system',
        content: `You are an expert content writer specializing in logistics and delivery optimization. Write in a clear, professional style with actionable insights. Include relevant statistics and examples where appropriate.`
      },
      {
        role: 'user',
        content: `Write a comprehensive blog post about: ${topic}\n\nFollow this outline:\n${outline.join('\n')}\n\nEnsure the content is engaging, informative, and optimized for SEO. Include a strong introduction and conclusion.`
      }
    ],
    temperature: 0.7,
    max_tokens: 2000
  });

  return {
    content: completion.choices[0].message.content || ''
  };
}

async function generateSEOMetadata(topic: string, content: { content: string }): Promise<GeneratedContent> {
  const completion = await openai.chat.completions.create({
    model: 'gpt-4',
    messages: [
      {
        role: 'system',
        content: 'You are an SEO expert specializing in logistics and delivery optimization content.'
      },
      {
        role: 'user',
        content: `Generate SEO metadata for this blog post:\n\nTopic: ${topic}\n\nContent: ${content.content}\n\nInclude:\n- SEO-optimized title\n- Meta description\n- Excerpt\n- 5 relevant tags\n- 8-10 focus keywords\n\nEnsure the metadata is optimized for search engines while remaining engaging for readers.`
      }
    ],
    temperature: 0.7,
    max_tokens: 500
  });

  const seoContent = completion.choices[0].message.content || '';
  
  // Parse the SEO content
  const title = seoContent.match(/Title: (.*)/i)?.[1] || topic;
  const metaDescription = seoContent.match(/Meta description: (.*)/i)?.[1] || '';
  const excerpt = seoContent.match(/Excerpt: (.*)/i)?.[1] || '';
  const tags = (seoContent.match(/Tags: (.*)/i)?.[1] || '').split(',').map((tag: string) => tag.trim());
  const keywords = (seoContent.match(/Keywords: (.*)/i)?.[1] || '').split(',').map((keyword: string) => keyword.trim());

  return {
    title,
    content: content.content,
    excerpt,
    tags,
    keywords: [...new Set([...keywords, ...CORE_KEYWORDS])],
    metaTitle: title,
    metaDescription
  };
}

export async function optimizeBlogPost(post: BlogPost): Promise<Partial<BlogPost>> {
  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: 'You are an SEO optimization expert specializing in logistics and delivery content.'
        },
        {
          role: 'user',
          content: `Optimize this blog post for search engines:\n\nTitle: ${post.title}\n\nContent: ${post.content}\n\nCurrent meta description: ${post.metaDescription}\n\nProvide:\n1. Optimized title\n2. Optimized meta description\n3. Optimized excerpt\n4. Additional relevant keywords\n5. Suggested content improvements`
        }
      ],
      temperature: 0.7,
      max_tokens: 1000
    });

    const optimization = completion.choices[0].message.content || '';

    // Parse optimization suggestions
    const optimizedTitle = optimization.match(/Optimized title: (.*)/i)?.[1] || post.title;
    const optimizedMetaDescription = optimization.match(/Optimized meta description: (.*)/i)?.[1] || post.metaDescription;
    const optimizedExcerpt = optimization.match(/Optimized excerpt: (.*)/i)?.[1] || post.excerpt;
    const newKeywords = (optimization.match(/Additional keywords: (.*)/i)?.[1] || '').split(',').map((k: string) => k.trim());

    return {
      title: optimizedTitle,
      metaTitle: optimizedTitle,
      metaDescription: optimizedMetaDescription,
      excerpt: optimizedExcerpt,
      keywords: [...new Set([...post.keywords, ...newKeywords])],
      lastOptimizedAt: new Date()
    };
  } catch (error) {
    console.error('Error optimizing blog post:', error);
    throw error;
  }
} 
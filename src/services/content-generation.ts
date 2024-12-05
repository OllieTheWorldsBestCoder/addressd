import { OpenAI } from 'openai';
import { BlogPost } from '@/types/blog';
import { createBlogPost } from './blog';
import slugify from 'slugify';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || ''
});

// Topics related to our niche
const TOPIC_CATEGORIES = [
  'Delivery Optimization',
  'Last Mile Delivery',
  'Location Guidance',
  'Address Verification',
  'Delivery Success Rates',
  'Logistics Technology',
  'Route Optimization',
  'Customer Experience',
  'Delivery Instructions',
  'Urban Delivery Challenges'
] as const;

// Keywords to include for SEO
const CORE_KEYWORDS = [
  'delivery optimization',
  'failed deliveries',
  'delivery success',
  'location guidance',
  'delivery instructions',
  'address verification',
  'last mile delivery',
  'delivery efficiency',
  'route optimization',
  'delivery accuracy'
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
        content: `You are a logistics and delivery optimization expert. Generate a compelling blog post topic about ${category} that would be valuable for businesses looking to improve their delivery operations.`
      }
    ],
    temperature: 0.7,
    max_tokens: 50
  });

  return completion.choices[0].message.content || '';
}

async function generateOutline(topic: string): Promise<string[]> {
  const completion = await openai.chat.completions.create({
    model: 'gpt-4',
    messages: [
      {
        role: 'system',
        content: 'You are a content strategist specializing in logistics and delivery optimization.'
      },
      {
        role: 'user',
        content: `Create a detailed outline for a blog post about: ${topic}. Include 4-6 main sections with subpoints.`
      }
    ],
    temperature: 0.7,
    max_tokens: 300
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
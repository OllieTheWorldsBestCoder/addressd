import { OpenAI } from 'openai';
import { BlogPost } from '../types/blog';
import { createBlogPost } from './blog';
import slugify from 'slugify';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const TOPICS = [
  'Improving delivery success rates',
  'Reducing failed deliveries',
  'Clear location descriptions',
  'Last-mile delivery optimization',
  'Business location accessibility',
  'Customer delivery experience',
  'Delivery driver navigation',
  'Location guidance best practices'
];

export async function generateBlogPost(): Promise<string> {
  try {
    // 1. Select a random topic
    const topic = TOPICS[Math.floor(Math.random() * TOPICS.length)];

    // 2. Generate content
    const contentCompletion = await openai.chat.completions.create({
      model: "gpt4o-mini",
      messages: [
        {
          role: "system",
          content: "You are an expert in delivery optimization and location guidance."
        },
        {
          role: "user",
          content: `Write a detailed blog post about ${topic}. Include practical tips and real-world examples.`
        }
      ],
      temperature: 0.7,
      max_tokens: 2000
    });

    const content = {
      content: contentCompletion.choices[0]?.message?.content || '',
      topic
    };

    // 3. Generate SEO metadata
    const seoCompletion = await openai.chat.completions.create({
      model: "gpt4o-mini",
      messages: [
        {
          role: "system",
          content: "You are an SEO expert. Generate optimized metadata for blog posts. Format your response as a JSON object with these exact fields: title, description, keywords. Do not include any other text or formatting."
        },
        {
          role: "user",
          content: `Generate SEO metadata for this blog post about ${topic}:\n\n${content.content.substring(0, 500)}...`
        }
      ],
      temperature: 0.3,
      max_tokens: 500
    });

    const seoContent = seoCompletion.choices[0]?.message?.content || '';
    let seoData;
    try {
      // Try parsing the raw response first
      seoData = JSON.parse(seoContent);
    } catch (e) {
      // If that fails, try cleaning up the response
      const cleanedContent = seoContent
        .replace(/```json\n?|\n?```/g, '') // Remove code blocks
        .replace(/^[^{]*({.*})[^}]*$/, '$1') // Extract JSON object
        .trim();
      try {
        seoData = JSON.parse(cleanedContent);
      } catch (e2) {
        console.error('Failed to parse SEO data:', e2);
        // Fallback to default values
        seoData = {
          title: `${topic} - A Comprehensive Guide`,
          description: content.content.substring(0, 160).trim(),
          keywords: topic.toLowerCase().split(' ').join(',')
        };
      }
    }
    
    // 4. Create blog post
    const post: Omit<BlogPost, 'id'> = {
      title: seoData.title,
      slug: slugify(seoData.title, { lower: true, strict: true }),
      content: content.content,
      excerpt: seoData.description.substring(0, 160),
      publishedAt: new Date(),
      updatedAt: new Date(),
      author: 'addressd Team',
      tags: seoData.keywords.split(',').map((k: string) => k.trim()),
      categories: ['Delivery Optimization', 'Location Guidance'],
      metaTitle: seoData.title,
      metaDescription: seoData.description,
      keywords: seoData.keywords.split(',').map((k: string) => k.trim()),
      views: 0,
      likes: 0,
      isGenerated: true,
      published: true,
      generationPrompt: topic,
      lastOptimizedAt: new Date()
    };

    // 5. Save to database
    const postId = await createBlogPost(post);
    return postId;

  } catch (error) {
    console.error('Error generating blog post:', error);
    throw error;
  }
}

export async function optimizeBlogPost(post: BlogPost): Promise<Partial<BlogPost>> {
  try {
    // Generate optimized content
    const optimizationCompletion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are an expert in SEO and content optimization."
        },
        {
          role: "user",
          content: `Optimize this blog post for SEO and readability:\n\n${post.content}`
        }
      ],
      temperature: 0.3,
      max_tokens: 2000
    });

    const optimizedContent = optimizationCompletion.choices[0]?.message?.content || post.content;

    // Generate new metadata
    const seoCompletion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are an SEO expert. Generate optimized metadata for blog posts. Return your response in this format: {title: string, description: string, keywords: string}"
        },
        {
          role: "user",
          content: `Generate SEO metadata (title, description, keywords) for this blog post:\n\n${optimizedContent.substring(0, 500)}...`
        }
      ],
      temperature: 0.3,
      max_tokens: 500
    });

    const seoContent = seoCompletion.choices[0]?.message?.content || '';
    const seoData = JSON.parse(seoContent.replace(/```json\n?|\n?```/g, ''));

    return {
      content: optimizedContent,
      metaTitle: seoData.title,
      metaDescription: seoData.description,
      keywords: seoData.keywords.split(',').map((k: string) => k.trim()),
      lastOptimizedAt: new Date()
    };

  } catch (error) {
    console.error('Error optimizing blog post:', error);
    throw error;
  }
} 
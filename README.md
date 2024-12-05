## Blog Content Generation

The blog system includes automated content generation and optimization using OpenAI's GPT-4. Two cron jobs handle this functionality:

1. **Generate Blog Posts** - Creates new blog posts daily
2. **Optimize Blog Posts** - Optimizes existing posts for SEO monthly

### Setting up Cron Jobs

1. Set the following environment variables:
   ```
   OPENAI_API_KEY=your_openai_api_key
   CRON_SECRET=your_cron_secret  # A random string to secure cron endpoints
   ```

2. Configure cron jobs in your hosting platform (e.g., Vercel):

   **Generate Blog Posts (Daily)**
   ```bash
   # Run daily at 2 AM UTC
   0 2 * * * curl -X POST https://your-domain.com/api/cron/generate-blog-post \
     -H "x-cron-secret: your_cron_secret"
   ```

   **Optimize Blog Posts (Monthly)**
   ```bash
   # Run on the 1st of each month at 3 AM UTC
   0 3 1 * * curl -X POST https://your-domain.com/api/cron/optimize-blog-posts \
     -H "x-cron-secret: your_cron_secret"
   ```

3. Monitor the cron job logs in your hosting platform's dashboard.

### Content Generation Settings

The content generation system is configured to:

- Generate SEO-optimized content focused on delivery optimization and logistics
- Include relevant keywords and meta descriptions
- Create engaging, informative articles with proper structure
- Optimize existing content periodically for better search rankings

You can customize the topics and keywords in `src/services/content-generation.ts`. 
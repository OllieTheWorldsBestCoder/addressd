const fs = require('fs');
const path = require('path');
const terser = require('terser');

// Read the base URL from environment
const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;
if (!baseUrl) {
  console.error('NEXT_PUBLIC_BASE_URL environment variable is not set');
  process.exit(1);
}

async function buildEmbed() {
  try {
    // Read the embed.js template
    const embedPath = path.join(__dirname, '../public/embed.js');
    const embedContent = fs.readFileSync(embedPath, 'utf8');

    // Replace the placeholder with the actual base URL
    const processedContent = embedContent.replace('__ADDRESSD_BASE_URL__', baseUrl);

    // Minify the code
    const minified = await terser.minify(processedContent, {
      sourceMap: {
        filename: 'embed.js',
        url: 'embed.js.map'
      },
      compress: {
        dead_code: true,
        drop_console: false, // Keep console.error for debugging
        drop_debugger: true
      },
      format: {
        comments: false
      }
    });

    if (minified.error) {
      throw minified.error;
    }

    // Write minified code
    fs.writeFileSync(embedPath, minified.code);

    // Write source map if generated
    if (minified.map) {
      fs.writeFileSync(path.join(__dirname, '../public/embed.js.map'), minified.map);
    }

    console.log('Successfully processed and minified embed.js with base URL:', baseUrl);
  } catch (error) {
    console.error('Error processing embed.js:', error);
    process.exit(1);
  }
}

buildEmbed(); 
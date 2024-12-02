import { useState } from 'react';
import Head from 'next/head';
import Layout from '../components/Layout';
import { FiCode, FiBox, FiGift, FiCopy, FiCheck } from 'react-icons/fi';
import { motion } from 'framer-motion';

const NEW_ADDRESS_POINTS = 0.05;
const EXISTING_ADDRESS_POINTS = NEW_ADDRESS_POINTS / 4;

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5
    }
  }
};

export default function Docs() {
  const [copiedSection, setCopiedSection] = useState<string | null>(null);

  const handleCopy = async (text: string, section: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedSection(section);
      setTimeout(() => setCopiedSection(null), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const CodeBlock = ({ code, language = 'bash', section }: { code: string, language?: string, section: string }) => (
    <div className="relative">
      <pre className={`language-${language} bg-gray-900 text-gray-100 rounded-lg p-4 overflow-x-auto`}>
        <code>{code}</code>
      </pre>
      <button
        onClick={() => handleCopy(code, section)}
        className="absolute top-2 right-2 p-2 bg-gray-800 rounded-md hover:bg-gray-700 transition-colors"
      >
        {copiedSection === section ? <FiCheck className="text-green-400" /> : <FiCopy className="text-gray-400" />}
      </button>
    </div>
  );

  return (
    <Layout>
      <Head>
        <title>Documentation - Addressd</title>
        <meta name="description" content="Learn how to integrate Addressd's delivery optimization and natural language directions into your applications." />
      </Head>

      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white pt-20 pb-32">
        <div className="container mx-auto px-4">
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="max-w-4xl mx-auto space-y-12"
          >
            {/* Header */}
            <motion.div variants={itemVariants} className="text-center">
              <h1 className="text-4xl font-bold text-gray-900 mb-4">Documentation</h1>
              <p className="text-xl text-gray-600">
                Learn how to integrate Addressd's delivery optimization and natural language directions into your applications.
              </p>
            </motion.div>

            {/* Delivery API Section */}
            <motion.section variants={itemVariants} className="space-y-6">
              <div className="flex items-center space-x-3">
                <FiCode className="w-6 h-6 text-blue-500" />
                <h2 className="text-2xl font-bold text-gray-900">Delivery API</h2>
              </div>
              <p className="text-gray-600">
                Optimize your delivery operations with our API endpoints.
              </p>

              <h3 className="text-lg font-semibold text-gray-800">Authentication</h3>
              <p className="text-gray-600">
                Include your API token in the Authorization header of your requests:
              </p>
              <CodeBlock
                section="auth"
                code={`Authorization: Bearer your_api_token_here`}
              />

              <h3 className="text-lg font-semibold text-gray-800 mt-6">Get Delivery Directions</h3>
              <p className="text-gray-600">
                Generate natural language directions for a specific address:
              </p>
              <CodeBlock
                section="delivery"
                language="bash"
                code={`curl -X POST https://api.addressd.app/v1/address/validate \\
  -H "Authorization: Bearer your_api_token_here" \\
  -H "Content-Type: application/json" \\
  -d '{
    "address": "123 Main St, City, Country"
  }'`}
              />

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
                <h4 className="font-semibold text-blue-900 mb-2">Response Format</h4>
                <CodeBlock
                  section="response"
                  language="json"
                  code={`{
  "formattedAddress": "123 Main St, City, Country",
  "summary": "The entrance is on the north side of Main St...",
  "uploadLink": "/upload/abc123",
  "addressId": "abc123"
}`}
                />
              </div>

              <h3 className="text-lg font-semibold text-gray-800 mt-8">Error Handling</h3>
              <div className="space-y-4">
                <p className="text-gray-600">All endpoints return consistent error responses:</p>
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <h4 className="font-semibold text-red-900 mb-2">Error Response Format</h4>
                  <CodeBlock
                    section="error"
                    language="json"
                    code={`{
  "error": "Error message here",
  "details": "Additional error details (in development)"
}`}
                  />
                </div>
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                  <h4 className="font-semibold text-orange-900 mb-2">Common Error Codes</h4>
                  <ul className="list-disc list-inside text-orange-800 space-y-2">
                    <li>400 - Invalid request (missing fields, invalid format)</li>
                    <li>401 - Unauthorized (missing or invalid API key)</li>
                    <li>405 - Method not allowed</li>
                    <li>500 - Internal server error</li>
                  </ul>
                </div>
              </div>

              <h3 className="text-lg font-semibold text-gray-800 mt-8">CORS Support</h3>
              <p className="text-gray-600">
                All API endpoints support CORS and handle preflight requests automatically.
                The following headers are included in responses:
              </p>
              <CodeBlock
                section="cors"
                language="text"
                code={`Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: GET, POST, OPTIONS
Access-Control-Allow-Headers: Content-Type, Authorization
Access-Control-Max-Age: 86400`}
              />

              <h3 className="text-lg font-semibold text-gray-800 mt-8">Rate Limiting</h3>
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <table className="min-w-full">
                  <thead>
                    <tr>
                      <th className="text-left text-gray-600 font-semibold">Plan</th>
                      <th className="text-left text-gray-600 font-semibold">Rate Limit</th>
                      <th className="text-left text-gray-600 font-semibold">Burst Limit</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="py-2">API Basic</td>
                      <td>1,000 requests/day</td>
                      <td>50 requests/minute</td>
                    </tr>
                    <tr>
                      <td className="py-2">API Pro</td>
                      <td>10,000 requests/day</td>
                      <td>100 requests/minute</td>
                    </tr>
                    <tr>
                      <td className="py-2">Enterprise</td>
                      <td>Custom</td>
                      <td>Custom</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <h3 className="text-lg font-semibold text-gray-800 mt-8">Contribute Directions</h3>
              <p className="text-gray-600">
                Add or update directions for an address:
              </p>
              <CodeBlock
                section="contribute"
                language="bash"
                code={`curl -X POST https://api.addressd.app/v1/address/contribute \\
  -H "Authorization: Bearer your_api_token_here" \\
  -H "Content-Type: application/json" \\
  -d '{
    "address": "123 Main St, City, Country",
    "description": "The building has a distinctive blue awning..."
  }'`}
              />

              <div className="bg-green-50 border border-green-200 rounded-lg p-4 mt-4">
                <h4 className="font-semibold text-green-900 mb-2">Response Format</h4>
                <CodeBlock
                  section="contribute-response"
                  language="json"
                  code={`{
  "addressId": "abc123",
  "isNewAddress": false,
  "pointsEarned": 0.0125
}`}
                />
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mt-4">
                <h4 className="font-semibold text-yellow-900 mb-2">Points System</h4>
                <ul className="list-disc list-inside text-yellow-800 space-y-2">
                  <li>New location description: {NEW_ADDRESS_POINTS} credits</li>
                  <li>Improving existing description: {EXISTING_ADDRESS_POINTS} credits</li>
                </ul>
              </div>
            </motion.section>

            {/* Embed Section */}
            <motion.section variants={itemVariants} className="space-y-6 mt-16">
              <div className="flex items-center space-x-3">
                <FiBox className="w-6 h-6 text-purple-500" />
                <h2 className="text-2xl font-bold text-gray-900">Embed Integration</h2>
              </div>
              <p className="text-gray-600">
                Add natural language directions to your website with our embed widget.
              </p>

              <h3 className="text-lg font-semibold text-gray-800">Quick Start</h3>
              <p className="text-gray-600">
                Add this code to your website where you want the directions widget to appear:
              </p>
              <CodeBlock
                section="embed"
                language="html"
                code={`<!-- Add the Addressd script -->
<script src="https://addressd.app/embed.js"></script>

<!-- Add the directions widget -->
<div id="addressd-directions"></div>

<!-- Initialize with your configuration -->
<script>
  new AddressdDirections({
    element: '#addressd-directions',
    apiKey: 'your_api_key',
    address: '123 Main St, City',
    theme: 'light',  // or 'dark'
    language: 'en'   // default: 'en'
  });
</script>`}
              />

              <h3 className="text-lg font-semibold text-gray-800 mt-8">Configuration Options</h3>
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <CodeBlock
                  section="config"
                  language="javascript"
                  code={`{
  // Required
  element: '#addressd-directions',  // CSS selector for the container
  apiKey: 'your_api_key',          // Your API key
  address: '123 Main St, City',    // Address to show directions for

  // Optional
  theme: 'light',                  // 'light' or 'dark'
  language: 'en',                  // Language code
  width: '100%',                   // Container width
  height: 'auto',                  // Container height
  showMap: true,                   // Show map preview
  mapType: 'roadmap'              // 'roadmap' or 'satellite'
}`}
                />
              </div>

              <h3 className="text-lg font-semibold text-gray-800 mt-8">Events</h3>
              <div className="space-y-4">
                <p className="text-gray-600">The widget emits events you can listen to:</p>
                <ul className="list-disc list-inside text-gray-600 space-y-2">
                  <li><code>loaded</code> - When the directions are loaded</li>
                  <li><code>error</code> - When an error occurs</li>
                  <li><code>feedback</code> - When user provides feedback</li>
                </ul>
                <CodeBlock
                  section="events"
                  language="javascript"
                  code={`const widget = new AddressdDirections({...});

widget.on('loaded', (data) => {
  console.log('Directions loaded:', data);
});

widget.on('error', (error) => {
  console.error('Error:', error);
});

widget.on('feedback', (feedback) => {
  console.log('User feedback:', feedback);
});`}
                />
              </div>

              <h3 className="text-lg font-semibold text-gray-800 mt-8">Live Example</h3>
              <div className="bg-white rounded-lg shadow-lg p-6 mt-4">
                <div className="bg-gray-50 rounded-xl p-6">
                  <div className="flex items-center mb-4">
                    <div className="w-3 h-3 rounded-full bg-red-400 mr-2"></div>
                    <div className="w-3 h-3 rounded-full bg-yellow-400 mr-2"></div>
                    <div className="w-3 h-3 rounded-full bg-green-400"></div>
                  </div>
                  <div className="space-y-4">
                    <h4 className="text-lg font-semibold">Delivery Instructions</h4>
                    <p className="text-gray-600 text-sm leading-relaxed">
                      The entrance is on the north side of Main Street. Look for the blue awning 
                      next to the coffee shop. The delivery entrance is through the side alley.
                    </p>
                    <div className="flex items-center text-sm text-gray-500">
                      <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      123 Main Street, City
                    </div>
                  </div>
                </div>
              </div>
            </motion.section>

            {/* Contribute API Section */}
            <motion.section variants={itemVariants} className="space-y-6">
              <div className="flex items-center space-x-3">
                <FiGift className="w-6 h-6 text-green-500" />
                <h2 className="text-2xl font-bold text-gray-900">Contribute API</h2>
              </div>
              <p className="text-gray-600">
                Help improve our database by contributing detailed location descriptions. Earn credits for your contributions.
              </p>

              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-800">Submit a Contribution</h3>
                <CodeBlock
                  section="contribute"
                  language="bash"
                  code={`curl -X POST https://api.addressd.app/v1/contribute \\
  -H "Authorization: Bearer your_api_token_here" \\
  -H "Content-Type: application/json" \\
  -d '{
    "address": "123 Main St, City, Country",
    "description": "The building has a distinctive blue awning...",
    "landmarks": ["Blue awning", "Corner cafe"],
    "accessPoints": ["Main entrance on Main St", "Service entrance in alley"]
  }'`}
                />

                <div className="bg-green-50 border border-green-200 rounded-lg p-4 mt-4">
                  <h4 className="font-semibold text-green-900 mb-2">Contribution Credits</h4>
                  <ul className="list-disc list-inside text-green-800 space-y-2">
                    <li>New location description: 0.05 credits</li>
                    <li>Improving existing description: 0.0125 credits</li>
                    <li>Credits can be used to reduce API usage costs</li>
                  </ul>
                </div>
              </div>
            </motion.section>

            {/* Rate Limits Section */}
            <motion.section variants={itemVariants} className="space-y-4">
              <h2 className="text-2xl font-bold text-gray-900">Rate Limits</h2>
              <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Plan</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rate Limit</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Burst Limit</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    <tr>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">API Basic</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">1,000 requests/day</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">50 requests/minute</td>
                    </tr>
                    <tr>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">API Pro</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">10,000 requests/day</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">100 requests/minute</td>
                    </tr>
                    <tr>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">Enterprise</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">Custom</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">Custom</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </motion.section>
          </motion.div>
        </div>
      </div>
    </Layout>
  );
} 
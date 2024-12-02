import { useState } from 'react';
import Head from 'next/head';
import Layout from '../components/Layout';
import { FiCode, FiBox, FiGift, FiCopy, FiCheck } from 'react-icons/fi';
import { motion } from 'framer-motion';

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
                Optimize your delivery operations with natural language directions. Our API helps drivers find locations more efficiently.
              </p>
              
              <div className="space-y-4">
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
                  code={`curl -X POST https://api.addressd.app/v1/directions \\
  -H "Authorization: Bearer your_api_token_here" \\
  -H "Content-Type: application/json" \\
  -d '{
    "address": "123 Main St, City, Country",
    "includeDetails": true
  }'`}
                />

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
                  <h4 className="font-semibold text-blue-900 mb-2">Response Format</h4>
                  <CodeBlock
                    section="response"
                    language="json"
                    code={`{
  "directions": {
    "text": "The building is on the north side of Main St...",
    "landmarks": ["Corner store", "Red brick building"],
    "accessPoints": ["Main entrance", "Side door"]
  },
  "location": {
    "formatted_address": "123 Main St, City, Country",
    "coordinates": {
      "lat": 51.5074,
      "lng": -0.1278
    }
  }
}`}
                  />
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

            {/* Embed Demo Section */}
            <motion.section variants={itemVariants} className="space-y-6">
              <div className="flex items-center space-x-3">
                <FiBox className="w-6 h-6 text-purple-500" />
                <h2 className="text-2xl font-bold text-gray-900">Embed Integration</h2>
              </div>
              <p className="text-gray-600">
                Add natural language directions to your website with our easy-to-use embed code.
              </p>

              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-800">Basic Implementation</h3>
                <CodeBlock
                  section="embed"
                  language="html"
                  code={`<script src="https://embed.addressd.app/v1/directions.js"></script>

<div id="addressd-directions" data-address="123 Main St, City, Country"></div>

<script>
  AddressdDirections.init('your_embed_token_here');
</script>`}
                />

                <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mt-4">
                  <h4 className="font-semibold text-purple-900 mb-2">Customization Options</h4>
                  <CodeBlock
                    section="customize"
                    language="html"
                    code={`<div 
  id="addressd-directions" 
  data-address="123 Main St, City, Country"
  data-theme="light"
  data-language="en"
  data-show-map="true"
></div>`}
                  />
                </div>

                <div className="mt-8">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">Live Demo</h3>
                  <div className="border border-gray-200 rounded-lg p-6 bg-white">
                    {/* Add your live demo component here */}
                    <p className="text-gray-600 text-center">Demo component will be added here</p>
                  </div>
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
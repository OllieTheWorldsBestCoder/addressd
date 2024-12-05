import Head from 'next/head';
import { motion } from 'framer-motion';
import Layout from '../components/Layout';
import { FiMapPin, FiGlobe, FiCode, FiBarChart2, FiUsers, FiShield, FiCpu, FiEdit3, FiZap, FiAperture, FiTrendingUp } from 'react-icons/fi';

interface Feature {
  title: string;
  description: string;
  icon: JSX.Element;
  category: 'ai' | 'integration' | 'analytics' | 'community';
  highlight?: boolean;
}

const features: Feature[] = [
  {
    title: "AI-Powered Natural Language",
    description: "Our advanced AI transforms addresses into natural, human-friendly directions that anyone can follow. It understands landmarks, local context, and the most intuitive navigation points.",
    icon: <FiAperture className="w-6 h-6" />,
    category: 'ai',
    highlight: true
  },
  {
    title: "Smart Context Analysis",
    description: "Our AI analyzes the surrounding area to identify the most helpful landmarks and navigation points, making your location easier to find.",
    icon: <FiZap className="w-6 h-6" />,
    category: 'ai',
    highlight: true
  },
  {
    title: "Continuous Learning",
    description: "The AI system learns from user feedback and contributions, automatically improving directions for better accuracy over time.",
    icon: <FiTrendingUp className="w-6 h-6" />,
    category: 'ai',
    highlight: true
  },
  {
    title: "Instant Website Integration",
    description: "Add our smart location widget to your website with a simple embed code. The widget automatically adapts to your site's theme.",
    icon: <FiCode className="w-6 h-6" />,
    category: 'integration'
  },
  {
    title: "Multi-Platform Support",
    description: "Works seamlessly with all major website platforms including WordPress, Shopify, Wix, and custom sites.",
    icon: <FiGlobe className="w-6 h-6" />,
    category: 'integration'
  },
  {
    title: "Smart Analytics",
    description: "Track how visitors interact with your directions and understand which descriptions are most effective.",
    icon: <FiBarChart2 className="w-6 h-6" />,
    category: 'analytics'
  },
  {
    title: "Community Enhancement",
    description: "Combine AI-generated descriptions with community contributions for the most accurate directions possible.",
    icon: <FiUsers className="w-6 h-6" />,
    category: 'community'
  },
  {
    title: "Real-Time Updates",
    description: "Update your location description anytime through your dashboard. Changes are instantly reflected everywhere.",
    icon: <FiEdit3 className="w-6 h-6" />,
    category: 'integration'
  }
];

const FeatureCard = ({ feature }: { feature: Feature }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true }}
    transition={{ duration: 0.5 }}
    className={`p-6 rounded-xl shadow-sm hover:shadow-md transition-all duration-300 border ${
      feature.highlight 
        ? 'bg-gradient-to-br from-violet-50 to-white border-violet-200' 
        : 'bg-white border-gray-100'
    }`}
  >
    <div className={`w-12 h-12 rounded-lg flex items-center justify-center mb-4 ${
      feature.category === 'ai' ? 'bg-violet-100' : 'bg-primary/10'
    }`}>
      <div className={feature.category === 'ai' ? 'text-violet-600' : 'text-primary'}>
        {feature.icon}
      </div>
    </div>
    <h3 className="text-xl font-semibold text-gray-900 mb-2">
      {feature.title}
    </h3>
    <p className="text-gray-600">
      {feature.description}
    </p>
  </motion.div>
);

const AIDemo = () => (
  <div className="bg-gradient-to-br from-violet-600 to-indigo-600 rounded-2xl p-8 my-16 text-white">
    <div className="max-w-3xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
      >
        <h2 className="text-3xl font-bold mb-8 text-center">See Our AI in Action</h2>
        <div className="bg-white/10 backdrop-blur rounded-lg p-6 space-y-6">
          <div>
            <div className="text-sm text-white/80 mb-2">Original Address</div>
            <div className="text-lg">123 Business Street, London, EC1A 1BB</div>
          </div>
          <div className="w-full h-px bg-white/20" />
          <div>
            <div className="text-sm text-white/80 mb-2">AI-Enhanced Description</div>
            <div className="text-lg">
              "Located on Business Street, just past the historic Red Lion pub. Look for the modern glass building with blue awnings. The entrance is on the left side, next to the 24-hour convenience store. There's a bus stop directly outside marked 'City Center'."
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  </div>
);

export default function Features() {
  return (
    <Layout>
      <Head>
        <title>AI-Powered Features - addressd</title>
        <meta 
          name="description" 
          content="Discover how addressd uses advanced AI to make your business location easy to find with smart, natural language directions" 
        />
      </Head>

      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white pt-20 pb-32">
        <div className="container mx-auto px-4">
          {/* Hero Section */}
          <div className="max-w-4xl mx-auto text-center mb-16">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="inline-block"
            >
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-violet-100 text-violet-800 mb-4">
                <FiZap className="mr-1" />
                Powered by Advanced AI
              </span>
            </motion.div>
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-4xl font-bold text-gray-900 mb-6"
            >
              Transform Complex Addresses into Clear Directions
            </motion.h1>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="text-xl text-gray-600"
            >
              Our AI technology understands locations like a local, creating natural directions that make sense to everyone
            </motion.p>
          </div>

          {/* AI Demo Section */}
          <AIDemo />

          {/* Features Grid */}
          <div className="max-w-7xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {features.map((feature, index) => (
                <FeatureCard key={index} feature={feature} />
              ))}
            </div>
          </div>

          {/* Stats Section */}
          <div className="max-w-4xl mx-auto mt-20 grid grid-cols-1 md:grid-cols-3 gap-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="bg-white p-6 rounded-xl shadow-sm text-center"
            >
              <div className="text-4xl font-bold text-violet-600 mb-2">95%</div>
              <div className="text-gray-600">Accuracy Rate</div>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="bg-white p-6 rounded-xl shadow-sm text-center"
            >
              <div className="text-4xl font-bold text-violet-600 mb-2">500k+</div>
              <div className="text-gray-600">Locations Analyzed</div>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="bg-white p-6 rounded-xl shadow-sm text-center"
            >
              <div className="text-4xl font-bold text-violet-600 mb-2">24/7</div>
              <div className="text-gray-600">AI Learning</div>
            </motion.div>
          </div>

          {/* CTA Section */}
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="max-w-4xl mx-auto mt-20 text-center"
          >
            <h2 className="text-3xl font-bold text-gray-900 mb-6">
              Experience the Power of AI
            </h2>
            <p className="text-xl text-gray-600 mb-8">
              Join thousands of businesses using AI to improve their findability
            </p>
            <div className="flex justify-center gap-4">
              <a
                href="/signup"
                className="inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-violet-600 hover:bg-violet-700 transition-colors"
              >
                Try AI-Powered Directions
              </a>
              <a
                href="/pricing"
                className="inline-flex items-center justify-center px-6 py-3 border border-gray-300 text-base font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 transition-colors"
              >
                View Pricing
              </a>
            </div>
          </motion.div>
        </div>
      </div>
    </Layout>
  );
} 
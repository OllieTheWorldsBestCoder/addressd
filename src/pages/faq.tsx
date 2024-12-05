import { useState } from 'react';
import Head from 'next/head';
import { motion, AnimatePresence } from 'framer-motion';
import Layout from '../components/Layout';
import { FiChevronDown, FiChevronUp } from 'react-icons/fi';

interface FAQItem {
  question: string;
  answer: string;
  category: 'general' | 'technical' | 'pricing' | 'integration';
}

const faqs: FAQItem[] = [
  {
    question: "What is addressd?",
    answer: "addressd is a service that helps businesses improve their location findability by providing clear, natural language directions and location descriptions. We use AI to generate human-friendly directions that make it easier for customers and delivery drivers to find your business.",
    category: "general"
  },
  {
    question: "How does the embed feature work?",
    answer: "The embed feature allows you to add a location description widget to your website. Simply copy the embed code from your dashboard and paste it into your website's HTML. The widget will display clear directions to your business location, making it easier for customers to find you.",
    category: "technical"
  },
  {
    question: "Can I customize the appearance of the embed widget?",
    answer: "Yes, the embed widget automatically adapts to your website's theme and can be further customized using CSS. You can modify the styling to match your brand colors and design preferences.",
    category: "technical"
  },
  {
    question: "How much does it cost?",
    answer: "We offer flexible pricing options starting at £3/month for a single location embed. For businesses with multiple locations or API access needs, please visit our pricing page or contact us for custom enterprise solutions.",
    category: "pricing"
  },
  {
    question: "Do you offer a free trial?",
    answer: "Yes, you can try our service by generating a sample location description before subscribing. This allows you to see the quality and value of our service firsthand.",
    category: "pricing"
  },
  {
    question: "How accurate are the directions?",
    answer: "Our directions are generated using a combination of AI and human contributions. We continuously improve accuracy through user feedback and regular updates. The descriptions focus on practical landmarks and clear navigation points that make locations easier to find.",
    category: "general"
  },
  {
    question: "Can I update the location description?",
    answer: "Yes, you can update your location description at any time through your dashboard. You can also enable community contributions to gather additional helpful details from customers and delivery drivers.",
    category: "technical"
  },
  {
    question: "How do I integrate addressd with my existing website?",
    answer: "Integration is simple - just copy the embed code from your dashboard and paste it into your website where you want the directions to appear. We support all major website platforms including WordPress, Shopify, Wix, and custom sites.",
    category: "integration"
  },
  {
    question: "Do you support multiple languages?",
    answer: "Currently, we support English language descriptions. We're working on adding support for additional languages in the future.",
    category: "general"
  },
  {
    question: "How can I contribute location descriptions?",
    answer: "You can contribute descriptions through our upload page. Each quality contribution earns points that can be used for discounts on our services. We review all contributions to ensure accuracy and helpfulness.",
    category: "general"
  }
];

export default function FAQ() {
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [openItems, setOpenItems] = useState<Set<number>>(new Set());

  const categories = [
    { id: 'all', name: 'All Questions' },
    { id: 'general', name: 'General' },
    { id: 'technical', name: 'Technical' },
    { id: 'pricing', name: 'Pricing' },
    { id: 'integration', name: 'Integration' }
  ];

  const filteredFaqs = activeCategory === 'all' 
    ? faqs 
    : faqs.filter(faq => faq.category === activeCategory);

  const toggleItem = (index: number) => {
    const newOpenItems = new Set(openItems);
    if (newOpenItems.has(index)) {
      newOpenItems.delete(index);
    } else {
      newOpenItems.add(index);
    }
    setOpenItems(newOpenItems);
  };

  return (
    <Layout>
      <Head>
        <title>FAQ - addressd</title>
        <meta name="description" content="Frequently asked questions about addressd - Location descriptions and directions made simple" />
      </Head>

      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white pt-20 pb-32">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-4xl font-bold text-gray-900 mb-8 text-center"
            >
              Frequently Asked Questions
            </motion.h1>

            {/* Category Filter */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="flex flex-wrap justify-center gap-2 mb-12"
            >
              {categories.map(category => (
                <button
                  key={category.id}
                  onClick={() => setActiveCategory(category.id)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-colors
                    ${activeCategory === category.id
                      ? 'bg-primary text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                >
                  {category.name}
                </button>
              ))}
            </motion.div>

            {/* FAQ Items */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="space-y-4"
            >
              {filteredFaqs.map((faq, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="border border-gray-200 rounded-lg overflow-hidden"
                >
                  <button
                    onClick={() => toggleItem(index)}
                    className="w-full px-6 py-4 text-left flex justify-between items-center hover:bg-gray-50"
                  >
                    <span className="font-medium text-gray-900">{faq.question}</span>
                    {openItems.has(index) ? (
                      <FiChevronUp className="text-gray-500" />
                    ) : (
                      <FiChevronDown className="text-gray-500" />
                    )}
                  </button>
                  
                  <AnimatePresence>
                    {openItems.has(index) && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="px-6 py-4 bg-gray-50"
                      >
                        <p className="text-gray-600">{faq.answer}</p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              ))}
            </motion.div>

            {/* Contact Section */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="mt-16 text-center"
            >
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                Still have questions?
              </h2>
              <p className="text-gray-600 mb-8">
                We're here to help. Contact us for more information about our services.
              </p>
              <a
                href="mailto:support@addressd.app"
                className="inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-primary hover:bg-primary-dark transition-colors"
              >
                Contact Support
              </a>
            </motion.div>
          </div>
        </div>
      </div>
    </Layout>
  );
} 
import Head from 'next/head';
import { motion } from 'framer-motion';
import Layout from '../components/Layout';
import { FiMail } from 'react-icons/fi';

export default function Careers() {
  return (
    <Layout>
      <Head>
        <title>Careers - addressd</title>
        <meta 
          name="description" 
          content="Join the addressd team and help make location finding easier for everyone" 
        />
      </Head>

      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white pt-20 pb-32">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            {/* Hero Section */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center mb-16"
            >
              <h1 className="text-4xl font-bold text-gray-900 mb-6">
                Join Our Mission
              </h1>
              <p className="text-xl text-gray-600 mb-8">
                Help us revolutionize how businesses communicate their locations
              </p>
            </motion.div>

            {/* Currently Not Hiring Section */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-white rounded-2xl shadow-lg p-8 mb-16 text-center"
            >
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                We're Not Currently Hiring
              </h2>
              <p className="text-gray-600 mb-8">
                While we don't have any open positions at the moment, we're always interested in 
                connecting with talented individuals who are passionate about improving location 
                findability and AI technology.
              </p>
              <div className="inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-primary hover:bg-primary-dark transition-colors">
                <FiMail className="mr-2" />
                <a href="mailto:careers@addressd.app">Contact Us</a>
              </div>
            </motion.div>

            {/* Values Section */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="bg-white rounded-xl p-6 shadow-sm"
              >
                <h3 className="text-xl font-semibold text-gray-900 mb-3">
                  Innovation First
                </h3>
                <p className="text-gray-600">
                  We're pushing the boundaries of AI and location technology to solve real-world problems.
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="bg-white rounded-xl p-6 shadow-sm"
              >
                <h3 className="text-xl font-semibold text-gray-900 mb-3">
                  User-Focused
                </h3>
                <p className="text-gray-600">
                  Everything we build is designed to make our users' lives easier and more efficient.
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="bg-white rounded-xl p-6 shadow-sm"
              >
                <h3 className="text-xl font-semibold text-gray-900 mb-3">
                  Continuous Growth
                </h3>
                <p className="text-gray-600">
                  We believe in learning, adapting, and growing together as technology evolves.
                </p>
              </motion.div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
} 
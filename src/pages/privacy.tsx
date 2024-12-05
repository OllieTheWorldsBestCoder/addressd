import Head from 'next/head';
import { motion } from 'framer-motion';
import Layout from '../components/Layout';

export default function Privacy() {
  return (
    <Layout>
      <Head>
        <title>Privacy Policy - addressd</title>
        <meta 
          name="description" 
          content="addressd privacy policy - Learn how we protect and handle your data" 
        />
      </Head>

      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white pt-20 pb-32">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="prose prose-lg max-w-none"
            >
              <h1>Privacy Policy</h1>
              <p className="lead">
                Last updated: {new Date().toLocaleDateString()}
              </p>

              <h2>1. Introduction</h2>
              <p>
                addressd ("we", "our", or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our location description service, API, and website (collectively, the "Service").
              </p>

              <h2>2. Information We Collect</h2>
              <h3>2.1 Information You Provide</h3>
              <ul>
                <li>Account information (email, name, business details)</li>
                <li>Business location data and descriptions</li>
                <li>Payment information (processed securely through Stripe)</li>
                <li>API usage data and credentials</li>
                <li>User-generated content and contributions</li>
              </ul>

              <h3>2.2 Automatically Collected Information</h3>
              <ul>
                <li>Usage data and analytics</li>
                <li>API request logs</li>
                <li>Device and browser information</li>
                <li>IP addresses and location data</li>
              </ul>

              <h2>3. How We Use Your Information</h2>
              <ul>
                <li>To provide and maintain our Service</li>
                <li>To process your transactions</li>
                <li>To improve our AI and location services</li>
                <li>To send you service updates and notifications</li>
                <li>To monitor and analyze usage patterns</li>
                <li>To prevent fraud and abuse</li>
              </ul>

              <h2>4. Data Storage and Security</h2>
              <p>
                We use industry-standard security measures to protect your data. Your information is stored securely on Google Cloud Platform and Firebase infrastructure. We implement appropriate technical and organizational measures to maintain the security of your data.
              </p>

              <h2>5. Data Sharing and Third Parties</h2>
              <p>
                We may share your information with:
              </p>
              <ul>
                <li>Service providers (e.g., Stripe for payments, Google for maps)</li>
                <li>Analytics partners to improve our service</li>
                <li>Law enforcement when required by law</li>
              </ul>

              <h2>6. API Data Usage</h2>
              <p>
                When you use our API:
              </p>
              <ul>
                <li>We collect usage metrics and logs</li>
                <li>We monitor API calls for security and billing</li>
                <li>We store API request data for troubleshooting</li>
                <li>We use API data to improve our services</li>
              </ul>

              <h2>7. Your Rights</h2>
              <p>
                You have the right to:
              </p>
              <ul>
                <li>Access your personal data</li>
                <li>Correct inaccurate data</li>
                <li>Request data deletion</li>
                <li>Export your data</li>
                <li>Opt-out of marketing communications</li>
              </ul>

              <h2>8. Data Retention</h2>
              <p>
                We retain your data for as long as your account is active or as needed to provide you services. We may retain certain data as required by law or for legitimate business purposes.
              </p>

              <h2>9. Children's Privacy</h2>
              <p>
                Our Service is not directed to children under 13. We do not knowingly collect personal information from children under 13.
              </p>

              <h2>10. Changes to This Policy</h2>
              <p>
                We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the "Last updated" date.
              </p>

              <h2>11. Contact Us</h2>
              <p>
                If you have any questions about this Privacy Policy, please contact us at:
              </p>
              <ul>
                <li>Email: privacy@addressd.app</li>
                <li>Address: [Your Business Address]</li>
              </ul>
            </motion.div>
          </div>
        </div>
      </div>
    </Layout>
  );
} 
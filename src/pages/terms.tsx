import Head from 'next/head';
import { motion } from 'framer-motion';
import Layout from '../components/Layout';

export default function Terms() {
  return (
    <Layout>
      <Head>
        <title>Terms of Service - addressd</title>
        <meta 
          name="description" 
          content="addressd terms of service - Our commitment to you and your obligations" 
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
              <h1>Terms of Service</h1>
              <p className="lead">
                Last updated: {new Date().toLocaleDateString()}
              </p>

              <h2>1. Agreement to Terms</h2>
              <p>
                By accessing or using addressd's services, including our API, website, and location description services (the "Service"), you agree to be bound by these Terms of Service ("Terms"). If you disagree with any part of the terms, you may not access the Service.
              </p>

              <h2>2. Description of Service</h2>
              <p>
                addressd provides AI-powered location description services, including but not limited to:
              </p>
              <ul>
                <li>Location description generation and management</li>
                <li>API access for location data</li>
                <li>Embeddable location widgets</li>
                <li>User contribution systems</li>
              </ul>

              <h2>3. API Terms</h2>
              <h3>3.1 API Usage</h3>
              <p>
                When using our API, you agree to:
              </p>
              <ul>
                <li>Use API keys securely and not share them</li>
                <li>Respect rate limits and usage quotas</li>
                <li>Not attempt to reverse engineer the API</li>
                <li>Maintain reasonable security measures</li>
                <li>Not use the API for any illegal purposes</li>
              </ul>

              <h3>3.2 API Availability</h3>
              <p>
                While we strive for high availability, we do not guarantee uninterrupted access to the API. We reserve the right to modify, suspend, or discontinue the API service at any time.
              </p>

              <h2>4. User Accounts</h2>
              <p>
                You are responsible for:
              </p>
              <ul>
                <li>Maintaining the confidentiality of your account</li>
                <li>All activities that occur under your account</li>
                <li>Notifying us of any unauthorized use</li>
                <li>Ensuring your account information is accurate</li>
              </ul>

              <h2>5. Payment Terms</h2>
              <p>
                For paid services:
              </p>
              <ul>
                <li>Payments are processed through Stripe</li>
                <li>Subscriptions auto-renew unless cancelled</li>
                <li>Refunds are handled case-by-case</li>
                <li>Prices may change with notice</li>
              </ul>

              <h2>6. Content and Data</h2>
              <h3>6.1 Your Content</h3>
              <p>
                You retain rights to content you provide but grant us license to use it for our services. You are responsible for ensuring you have the right to share any content.
              </p>

              <h3>6.2 Our Content</h3>
              <p>
                Our service, including AI-generated content, is protected by copyright and other laws. You may not copy or modify it except as allowed by these Terms.
              </p>

              <h2>7. Acceptable Use</h2>
              <p>
                You agree not to:
              </p>
              <ul>
                <li>Use the service for any illegal purpose</li>
                <li>Share inappropriate or harmful content</li>
                <li>Attempt to gain unauthorized access</li>
                <li>Interfere with the service's operation</li>
                <li>Resell the service without permission</li>
              </ul>

              <h2>8. Termination</h2>
              <p>
                We may terminate or suspend your account at any time for violations of these Terms. Upon termination, your right to use the Service will immediately cease.
              </p>

              <h2>9. Limitation of Liability</h2>
              <p>
                We are not liable for any indirect, incidental, special, consequential, or punitive damages resulting from your use of the service.
              </p>

              <h2>10. Changes to Terms</h2>
              <p>
                We may modify these Terms at any time. We will notify you of significant changes by posting an update on our website.
              </p>

              <h2>11. Contact Information</h2>
              <p>
                For questions about these Terms, please contact us at:
              </p>
              <ul>
                <li>Email: legal@addressd.app</li>
                <li>Address: [Your Business Address]</li>
              </ul>
            </motion.div>
          </div>
        </div>
      </div>
    </Layout>
  );
} 
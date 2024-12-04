import { useRouter } from 'next/router';
import { useState, useEffect } from 'react';
import { doc, updateDoc, arrayUnion, getDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { Contribution, Address } from '../../types/address';
import Head from 'next/head';
import { useAuth } from '../../hooks/useAuth';
import { User } from '../../types/user';
import { FiAward, FiMapPin, FiStar } from 'react-icons/fi';
import Link from 'next/link';

const NEW_ADDRESS_POINTS = 0.05;
const EXISTING_ADDRESS_POINTS = NEW_ADDRESS_POINTS / 4;

export default function UploadPage() {
  const router = useRouter();
  const { addressId } = router.query;
  const [content, setContent] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [summaryStatus, setSummaryStatus] = useState<'idle' | 'generating' | 'done'>('idle');
  const [address, setAddress] = useState<Address | null>(null);
  const { user: firebaseUser } = useAuth();
  const [user, setUser] = useState<User | null>(null);
  const [pointsEarned, setPointsEarned] = useState<number | null>(null);

  useEffect(() => {
    async function loadAddress() {
      if (addressId && typeof addressId === 'string') {
        const addressDoc = await getDoc(doc(db, 'addresses', addressId));
        if (addressDoc.exists()) {
          setAddress(addressDoc.data() as Address);
        }
      }
    }
    loadAddress();
  }, [addressId]);

  useEffect(() => {
    async function loadUser() {
      if (firebaseUser) {
        const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
        if (userDoc.exists()) {
          setUser({ id: userDoc.id, ...userDoc.data() } as User);
        }
      }
    }
    loadUser();
  }, [firebaseUser]);

  const generateSummary = async (addressId: string) => {
    setSummaryStatus('generating');
    try {
      const response = await fetch('/api/address/generate-summary', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ addressId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate summary');
      }

      setSummaryStatus('done');
      return data;
    } catch (error) {
      console.error('Error generating summary:', error);
      setSummaryStatus('idle');
      setErrorMessage(error instanceof Error ? error.message : 'Failed to generate summary');
      return null;
    }
  };

  const handleContribute = async () => {
    if (!content.trim() || !addressId || typeof addressId !== 'string') {
      setErrorMessage('Please enter some content');
      return;
    }

    setStatus('loading');
    try {
      const addressRef = doc(db, 'addresses', addressId);
      const addressDoc = await getDoc(addressRef);

      if (!addressDoc.exists()) {
        throw new Error('Address not found');
      }

      const address = addressDoc.data() as Address;
      const isFirstDescription = !address.descriptions || address.descriptions.length === 0;

      const contribution: Contribution = {
        content: content.trim(),
        createdAt: new Date(),
        userId: user?.id || null
      };

      await updateDoc(addressRef, {
        descriptions: arrayUnion(contribution),
        updatedAt: new Date()
      });

      // Update user points if authenticated
      if (user) {
        const points = isFirstDescription ? NEW_ADDRESS_POINTS : EXISTING_ADDRESS_POINTS;
        await updateDoc(doc(db, 'users', user.id), {
          contributionPoints: user.contributionPoints ? user.contributionPoints + points : points,
          updatedAt: new Date()
        });
        setPointsEarned(points);
      }

      // Generate summary for first description
      if (isFirstDescription) {
        const summaryResult = await generateSummary(addressId);
        if (!summaryResult) {
          setErrorMessage('Contribution added but summary generation failed');
          setStatus('error');
          return;
        }
      }

      setStatus('success');
      setContent('');
    } catch (error) {
      console.error('Error in handleContribute:', error);
      setStatus('error');
      setErrorMessage(error instanceof Error ? error.message : 'Failed to add contribution');
    }
  };

  return (
    <>
      <Head>
        <title>Contribute Description - addressd</title>
        <meta name="description" content="Help improve delivery success rates by contributing detailed location descriptions" />
      </Head>

      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white py-12 px-4">
        <div className="max-w-3xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              Help Others Find This Location
            </h1>
            {address && (
              <div className="flex items-center justify-center text-lg text-gray-600 mb-6">
                <FiMapPin className="mr-2" />
                {address.formattedAddress}
              </div>
            )}
            <p className="text-gray-600 max-w-2xl mx-auto">
              Your detailed description helps delivery drivers and visitors find this location easily. 
              Earn rewards for your contributions and help build a better addressing system.
            </p>
          </div>

          {/* Contribution Box */}
          <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
            <div className="mb-6">
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                Location Description
              </label>
              <textarea
                id="description"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:ring-opacity-20 transition-all"
                rows={6}
                placeholder="Describe how to find this location... (e.g., 'The entrance is on the side street, look for the blue awning...')"
              />
              <p className="mt-2 text-sm text-gray-500">
                Include helpful details like landmarks, entrance locations, or specific directions that would help someone find this place.
              </p>
            </div>

            {/* Points Info */}
            <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 mb-6">
              <div className="flex items-center text-blue-800 mb-2">
                <FiAward className="mr-2" />
                <h3 className="font-semibold">Earn Rewards</h3>
              </div>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• First description for a location: {NEW_ADDRESS_POINTS} credits</li>
                <li>• Additional descriptions: {EXISTING_ADDRESS_POINTS} credits</li>
                <li>• Credits reduce your API usage costs</li>
              </ul>
            </div>

            {!user && (
              <div className="bg-yellow-50 border border-yellow-100 rounded-lg p-4 mb-6">
                <div className="flex items-center text-yellow-800 mb-2">
                  <FiStar className="mr-2" />
                  <h3 className="font-semibold">Sign Up to Earn Rewards</h3>
                </div>
                <p className="text-sm text-yellow-700 mb-3">
                  Create an account to track your contributions and earn rewards.
                </p>
                <Link
                  href="/signup"
                  className="inline-block bg-yellow-500 text-white px-4 py-2 rounded-lg text-sm hover:bg-yellow-600 transition-colors"
                >
                  Sign Up Now
                </Link>
              </div>
            )}

            <button
              onClick={handleContribute}
              className="w-full bg-blue-600 text-white rounded-lg px-4 py-3 font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={status === 'loading' || !content.trim()}
            >
              {status === 'loading' ? 'Contributing...' : 'Submit Description'}
            </button>

            {status === 'success' && (
              <div className="mt-4 bg-green-50 border border-green-100 rounded-lg p-4">
                <div className="text-green-800 font-medium mb-2">
                  Thank you for your contribution!
                </div>
                {pointsEarned && (
                  <p className="text-sm text-green-700">
                    You earned {pointsEarned} credits for this contribution.
                  </p>
                )}
                {summaryStatus === 'generating' && (
                  <p className="text-sm text-green-700 mt-2">
                    Generating location summary... (this may take a few seconds)
                  </p>
                )}
                {summaryStatus === 'done' && (
                  <p className="text-sm text-green-700 mt-2">
                    Location summary has been updated!
                  </p>
                )}
              </div>
            )}

            {status === 'error' && (
              <div className="mt-4 bg-red-50 border border-red-100 rounded-lg p-4">
                <p className="text-red-800">{errorMessage}</p>
              </div>
            )}
          </div>

          {/* Existing Descriptions */}
          {address?.descriptions && address.descriptions.length > 0 && (
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                Existing Descriptions
              </h2>
              <div className="space-y-4">
                {address.descriptions.map((desc, index) => (
                  <div key={index} className="border-l-4 border-blue-200 pl-4 py-2">
                    <p className="text-gray-700">{desc.content}</p>
                    <p className="text-sm text-gray-500 mt-1">
                      Added {new Date(desc.createdAt as any).toLocaleDateString()}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
} 
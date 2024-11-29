import { useRouter } from 'next/router';
import { useState } from 'react';
import { doc, updateDoc, arrayUnion, getDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import styles from '../../styles/Upload.module.css';
import { Contribution, Address } from '../../types/address';

export default function UploadPage() {
  const router = useRouter();
  const { addressId } = router.query;
  const [content, setContent] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [summaryStatus, setSummaryStatus] = useState<'idle' | 'generating' | 'done'>('idle');

  const generateSummary = async (addressId: string) => {
    setSummaryStatus('generating');
    try {
      console.log('Starting summary generation for address:', addressId);
      const response = await fetch('/api/address/generate-summary', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ addressId }),
      });

      const data = await response.json();
      console.log('Summary generation response:', data);

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate summary');
      }

      console.log('Summary generated successfully:', data);
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
      console.log('Current address data:', address);
      
      const isFirstDescription = !address.descriptions || address.descriptions.length === 0;
      console.log('Is first description:', isFirstDescription);

      const contribution: Contribution = {
        content: content.trim(),
        createdAt: new Date(),
      };

      // First update the descriptions
      await updateDoc(addressRef, {
        descriptions: arrayUnion(contribution)
      });
      console.log('Added contribution to address');

      // If this is the first description, generate summary
      if (isFirstDescription) {
        console.log('Attempting to generate first summary');
        const summaryResult = await generateSummary(addressId);
        
        if (!summaryResult) {
          console.error('Failed to generate initial summary');
          setErrorMessage('Contribution added but summary generation failed');
          setStatus('error');
          return;
        }
        console.log('Successfully generated first summary:', summaryResult);
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
    <div className={styles.container}>
      <div className={styles.uploadBox}>
        <textarea
          className={styles.textArea}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Share your contribution..."
          rows={5}
        />
        <button
          className={styles.contributeButton}
          onClick={handleContribute}
          disabled={status === 'loading'}
        >
          {status === 'loading' ? 'Contributing...' : 'Contribute'}
        </button>
        {status === 'success' && (
          <div className={styles.successMessage}>
            <p>Thank you for your contribution!</p>
            {summaryStatus === 'generating' && (
              <p className={styles.summaryStatus}>
                Generating summary... (this may take a few seconds)
              </p>
            )}
            {summaryStatus === 'done' && (
              <p className={styles.summaryStatus}>
                Summary has been generated!
              </p>
            )}
          </div>
        )}
        {status === 'error' && (
          <p className={styles.errorMessage}>{errorMessage}</p>
        )}
      </div>
    </div>
  );
} 
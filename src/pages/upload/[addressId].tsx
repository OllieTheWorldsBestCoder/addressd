import { useRouter } from 'next/router';
import { useState } from 'react';
import { doc, updateDoc, arrayUnion, getDoc, FieldValue } from 'firebase/firestore';
import { db } from '../../config/firebase';
import styles from '../../styles/Upload.module.css';
import { Contribution } from '../../types/address';

export default function UploadPage() {
  const router = useRouter();
  const { addressId } = router.query;
  const [content, setContent] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

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

      const contribution: Contribution = {
        content: content.trim(),
        createdAt: new Date(),
      };

      await updateDoc(addressRef, {
        descriptions: arrayUnion(contribution)
      });

      setStatus('success');
      setContent('');
    } catch (error) {
      console.error('Error adding contribution:', error);
      setStatus('error');
      setErrorMessage('Failed to add contribution');
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
          <p className={styles.successMessage}>Thank you for your contribution!</p>
        )}
        {status === 'error' && (
          <p className={styles.errorMessage}>{errorMessage}</p>
        )}
      </div>
    </div>
  );
} 
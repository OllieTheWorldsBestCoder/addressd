import { useState } from 'react';
import styles from '../styles/AddressFeedback.module.css';

interface Props {
  addressId: string;
  inputAddress: string;
  matchedAddress: string;
}

export default function AddressFeedback({ addressId, inputAddress, matchedAddress }: Props) {
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const submitFeedback = async (isPositive: boolean) => {
    if (loading || submitted) return;
    
    setLoading(true);
    try {
      const response = await fetch('/api/address/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          addressId,
          isPositive,
          inputAddress,
          matchedAddress,
        }),
      });

      if (response.ok) {
        setSubmitted(true);
      }
    } catch (error) {
      console.error('Error submitting feedback:', error);
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className={styles.container}>
        <p className={styles.thankYou}>Thanks for your feedback!</p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <p className={styles.question}>Was this address match helpful?</p>
      <div className={styles.buttons}>
        <button
          onClick={() => submitFeedback(true)}
          className={`${styles.button} ${styles.thumbsUp}`}
          disabled={loading}
        >
          👍
        </button>
        <button
          onClick={() => submitFeedback(false)}
          className={`${styles.button} ${styles.thumbsDown}`}
          disabled={loading}
        >
          👎
        </button>
      </div>
    </div>
  );
} 
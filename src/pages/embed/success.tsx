import { useEffect } from 'react';
import { useRouter } from 'next/router';

export default function Success() {
  const router = useRouter();
  const { session_id } = router.query;

  useEffect(() => {
    if (session_id) {
      // Verify the session and create the embed
      fetch('/api/verify-embed-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: session_id }),
      })
      .then(response => response.json())
      .then(data => {
        if (data.success) {
          router.push('/profile');
        }
      })
      .catch(error => {
        console.error('Error:', error);
      });
    }
  }, [session_id]);

  return (
    <div>
      <h1>Setting up your embed...</h1>
      <p>Please wait while we process your subscription.</p>
    </div>
  );
} 
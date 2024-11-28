import { useState } from 'react';
import { db } from '../config/firebase';
import { collection, doc, setDoc } from 'firebase/firestore';
import { User } from '../types/user';
import styles from '../styles/Signup.module.css';
import crypto from 'crypto';

export default function Signup() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState<{token: string} | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess(null);

    try {
      // Generate a secure random token
      const authToken = crypto.randomBytes(32).toString('hex');
      
      // Create user ID from email
      const userId = email.toLowerCase().replace(/[^a-z0-9]/g, '-');
      
      const newUser: User = {
        id: userId,
        name,
        email,
        authToken,
        summaryCount: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Add to Firestore
      await setDoc(doc(db, 'users', userId), newUser);
      
      setSuccess({ token: authToken });
    } catch (error) {
      console.error('Error creating user:', error);
      setError('Failed to create user. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <main className={styles.main}>
        <h1 className={styles.title}>Sign Up for API Access</h1>
        
        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.formGroup}>
            <label htmlFor="name">Name</label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className={styles.input}
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className={styles.input}
            />
          </div>

          <button 
            type="submit" 
            className={styles.button}
            disabled={loading || !name || !email}
          >
            {loading ? 'Creating...' : 'Get API Token'}
          </button>
        </form>

        {error && <p className={styles.error}>{error}</p>}
        
        {success && (
          <div className={styles.success}>
            <h2>🎉 Account Created Successfully!</h2>
            <p>Your API Token:</p>
            <code className={styles.token}>{success.token}</code>
            <p className={styles.instructions}>
              Store this token securely. You'll need it to make API requests.
              <br />
              Example usage:
            </p>
            <pre className={styles.code}>
              {`curl -X POST \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer ${success.token}" \\
  -d '{"address": "Your Address"}' \\
  ${process.env.NEXT_PUBLIC_BASE_URL}/api/address/validate`}
            </pre>
          </div>
        )}
      </main>
    </div>
  );
} 
import type { AppProps } from 'next/app';
import '../styles/globals.css';
import { useEffect } from 'react';

function MyApp({ Component, pageProps }: AppProps) {
  useEffect(() => {
    // Force a cache bust on client-side
    if (typeof window !== 'undefined') {
      window.history.replaceState(
        null, 
        '', 
        `${window.location.pathname}?v=${Date.now()}`
      );
    }
  }, []);

  return <Component {...pageProps} />;
}

export default MyApp; 
import type { AppProps } from 'next/app';
import '../styles/globals.css';
import { useEffect } from 'react';

function MyApp({ Component, pageProps }: AppProps) {
  useEffect(() => {
    // Only update URL if it doesn't already have a version parameter
    if (typeof window !== 'undefined' && !window.location.search.includes('v=')) {
      const newUrl = new URL(window.location.href);
      newUrl.searchParams.set('v', Date.now().toString());
      window.history.replaceState(
        window.history.state, 
        '', 
        newUrl.toString()
      );
    }
  }, []);

  // Wrap the component in a div to ensure consistent rendering
  return (
    <div suppressHydrationWarning>
      <Component {...pageProps} />
    </div>
  );
}

export default MyApp; 
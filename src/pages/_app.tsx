import { AppProps } from 'next/app';
import Script from 'next/script';
import { Analytics } from '@vercel/analytics/react';
import Head from 'next/head';
import '../styles/globals.css';
import '../styles/prism.css';

export default function App({ Component, pageProps }: AppProps) {
  return (
    <>
      <Head>
        <link rel="icon" type="image/png" href="/images/addressd-logo.png" />
        <link rel="apple-touch-icon" href="/images/addressd-logo.png" />
      </Head>
      <Script
        src={`https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&libraries=places`}
        strategy="lazyOnload"
        id="google-maps"
      />
      <Script
        src="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/prism.min.js"
        strategy="lazyOnload"
        id="prism-core"
      />
      <Script
        src="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/components/prism-bash.min.js"
        strategy="lazyOnload"
        id="prism-bash"
      />
      <Script
        src="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/components/prism-json.min.js"
        strategy="lazyOnload"
        id="prism-json"
      />
      <Component {...pageProps} />
      <Analytics />
    </>
  );
} 
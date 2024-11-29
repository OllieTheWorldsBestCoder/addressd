import type { AppProps } from 'next/app';
import Script from 'next/script';
import '../styles/globals.css';

function MyApp({ Component, pageProps }: AppProps) {
  return (
    <>
      <Script
        src={`https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&libraries=places`}
        strategy="lazyOnload"
        id="google-maps"
      />
      <Component {...pageProps} />
    </>
  );
}

export default MyApp; 
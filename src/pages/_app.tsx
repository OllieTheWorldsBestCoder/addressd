import { AppProps } from 'next/app';
import Script from 'next/script';
import '../styles/globals.css';
import '../styles/prism.css';

export default function App({ Component, pageProps }: AppProps) {
  return (
    <>
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
    </>
  );
} 
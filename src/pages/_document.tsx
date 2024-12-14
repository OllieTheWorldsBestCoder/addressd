import { Html, Head, Main, NextScript } from 'next/document';

export default function Document() {
  return (
    <Html>
      <Head>
        <meta httpEquiv="Cache-Control" content="no-cache, no-store, must-revalidate" />
        <meta httpEquiv="Pragma" content="no-cache" />
        <meta httpEquiv="Expires" content="0" />
        <script async src="https://js.stripe.com/v3/pricing-table.js"></script>
        <script id="vtag-ai-js" async src="https://r2.leadsy.ai/tag.js" data-pid="fXOCeYg5ZZPGhi7a" data-version="062024"></script>
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
import { useEffect } from 'react';
import styles from '../styles/PricingTable.module.css';

// Declare the custom element type
declare global {
  namespace JSX {
    interface IntrinsicElements {
      'stripe-pricing-table': React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement> & {
          'pricing-table-id': string;
          'publishable-key': string;
        },
        HTMLElement
      >;
    }
  }
}

export function PricingTable() {
  useEffect(() => {
    // Load Stripe pricing table script
    const script = document.createElement('script');
    script.src = 'https://js.stripe.com/v3/pricing-table.js';
    script.async = true;
    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
    };
  }, []);

  return (
    <div className={styles.container}>
      <stripe-pricing-table 
        pricing-table-id={process.env.NEXT_PUBLIC_STRIPE_PRICING_TABLE_ID!}
        publishable-key={process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!}
      >
      </stripe-pricing-table>
    </div>
  );
} 
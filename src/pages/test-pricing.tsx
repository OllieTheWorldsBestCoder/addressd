export default function TestPricing() {
  return (
    <div>
      <h1>Test Pricing Table</h1>
      <stripe-pricing-table 
        pricing-table-id={process.env.NEXT_PUBLIC_STRIPE_PRICING_TABLE_ID!}
        publishable-key={process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!}
      >
      </stripe-pricing-table>
    </div>
  );
} 
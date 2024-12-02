import React from 'react';
import '../types/stripe'; // Import the type definitions

interface PricingTableProps {
  userId?: string;
  userEmail?: string;
}

export default function PricingTable({ userId, userEmail }: PricingTableProps) {
  return (
    <stripe-pricing-table
      pricing-table-id={process.env.NEXT_PUBLIC_STRIPE_PRICING_TABLE_ID || ''}
      publishable-key={process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || ''}
      client-reference-id={userId}
      customer-email={userEmail}
    />
  );
} 
export enum PlanType {
  EMBED = 'embed',
  API = 'api',
  ENTERPRISE = 'enterprise'
}

export interface EmbedPlan {
  type: PlanType.EMBED;
  priceMonthly: number;  // £3
  priceYearly: number;   // £20
  currentPrice: number;  // Current active price based on billing period
  billingPeriod: 'monthly' | 'yearly';
  startDate: Date;
  currentPeriodEnd?: Date;  // When the current billing period ends
  endDate?: Date;  // When the subscription ends (if cancelled)
  status: 'active' | 'cancelled' | 'past_due' | 'cancelling';
  stripeSubscriptionId?: string;
  addressId: string;  // Link to the specific embed address
}

export interface ApiPlan {
  type: PlanType.API;
  minimumSpend: number;  // £50
  ratePerCall: number;   // £0.005
  currentUsage: number;
  billingStartDate: Date;
  contributionPoints: number;
  status: 'active' | 'cancelled' | 'past_due' | 'cancelling';
  stripeSubscriptionId?: string;
}

export interface EnterprisePlan {
  type: PlanType.ENTERPRISE;
  customRatePerCall?: number;
  customMinimumSpend?: number;
  customEmbedPrice?: number;
  startDate: Date;
  status: 'active' | 'cancelled' | 'past_due' | 'cancelling';
  stripeSubscriptionId?: string;
}

export type BillingPlan = EmbedPlan | ApiPlan | EnterprisePlan; 
import { track } from '@vercel/analytics';

// Pricing and subscription events
export const trackPricingView = (plan: string) => {
  track('pricing_view', { plan });
};

export const trackPricingToggle = (period: 'monthly' | 'yearly') => {
  track('pricing_toggle', { period });
};

export const trackCheckoutStart = (plan: string, period: 'monthly' | 'yearly', amount: number) => {
  track('checkout_start', { plan, period, amount });
};

export const trackCheckoutSuccess = (plan: string, period: 'monthly' | 'yearly', amount: number) => {
  track('checkout_success', { plan, period, amount });
};

export const trackCheckoutError = (error: string) => {
  track('checkout_error', { error });
};

export const trackSubscriptionCancelled = (plan: string, reason?: string) => {
  track('subscription_cancelled', { plan, reason: reason || 'unspecified' });
};

export const trackSubscriptionRenewed = (plan: string, period: 'monthly' | 'yearly', amount: number) => {
  track('subscription_renewed', { plan, period, amount });
};

// Embed events
export const trackEmbedCreated = (addressId: string) => {
  track('embed_created', { addressId });
};

export const trackEmbedView = (addressId: string, embedId: string) => {
  track('embed_view', { addressId, embedId });
};

export const trackEmbedInteraction = (addressId: string, embedId: string, interactionType: 'directions' | 'copy' | 'share') => {
  track('embed_interaction', { addressId, embedId, interactionType });
};

export const trackEmbedInstalled = (addressId: string, embedId: string, domain: string) => {
  track('embed_installed', { addressId, embedId, domain });
};

// Address events
export const trackAddressCreated = () => {
  track('address_created');
};

export const trackAddressUpdated = (addressId: string) => {
  track('address_updated', { addressId });
};

export const trackAddressDeleted = (addressId: string) => {
  track('address_deleted', { addressId });
};

export const trackAddressDescriptionGenerated = (addressId: string) => {
  track('address_description_generated', { addressId });
};

// User engagement events
export const trackDashboardView = () => {
  track('dashboard_view');
};

export const trackAPIKeyGenerated = () => {
  track('api_key_generated');
};

export const trackDocumentationView = (section: string) => {
  track('documentation_view', { section });
};

// Conversion funnel events
export const trackSignupStart = (source: string) => {
  track('signup_start', { source });
};

export const trackSignupComplete = (source: string) => {
  track('signup_complete', { source });
};

export const trackFeatureUsage = (feature: string, action: string) => {
  track('feature_usage', { feature, action });
};

// Revenue metrics
export const trackMRRChange = (type: 'increase' | 'decrease', amount: number, reason: string) => {
  track('mrr_change', { type, amount, reason });
};

export const trackRefundIssued = (amount: number, reason: string) => {
  track('refund_issued', { amount, reason });
}; 
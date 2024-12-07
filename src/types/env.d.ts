declare namespace NodeJS {
  interface ProcessEnv {
    STRIPE_SECRET_KEY: string;
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: string;
    STRIPE_EMBED_MONTHLY_PRICE_ID: string;
    NEXT_PUBLIC_BASE_URL: string;
    MAPBOX_ACCESS_TOKEN: string;
  }
} 
function required(name: string): string {
  const v = process.env[name];
  if (!v) {
    throw new Error(`Missing required env var ${name}. See .env.example.`);
  }
  return v;
}

export const env = {
  supabaseUrl: () => required("NEXT_PUBLIC_SUPABASE_URL"),
  supabaseAnonKey: () => required("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
  supabaseServiceRoleKey: () => required("SUPABASE_SERVICE_ROLE_KEY"),
  webOrigin: () => process.env.NEXT_PUBLIC_WEB_ORIGIN ?? process.env.WEB_ORIGIN ?? "http://localhost:3000",
  stripeSecretKey: () => required("STRIPE_SECRET_KEY"),
  stripeWebhookSecret: () => required("STRIPE_WEBHOOK_SECRET"),
  stripePriceCrew: () => required("STRIPE_PRICE_CREW"),
  stripePriceCompany: () => required("STRIPE_PRICE_COMPANY"),
  diginateApiKey: () => process.env.DIGINATE_API_KEY, // optional: unset means PDF fallback
  diginateApiBaseUrl: () => process.env.DIGINATE_API_BASE_URL ?? "https://api.diginate.com",
};

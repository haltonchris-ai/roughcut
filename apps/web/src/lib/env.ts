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
  // Public site address used in QR codes, feeds and links. On Vercel production,
  // never hand out localhost: fall back to the project's production domain.
  webOrigin: () => {
    const configured = (process.env.NEXT_PUBLIC_WEB_ORIGIN ?? process.env.WEB_ORIGIN ?? "").replace(/\/+$/, "");
    const prod = process.env.VERCEL_PROJECT_PRODUCTION_URL;
    if (process.env.VERCEL_ENV && prod && (!configured || /localhost|127\.0\.0\.1/.test(configured))) {
      return `https://${prod}`;
    }
    return configured || "http://localhost:3000";
  },
  stripeSecretKey: () => required("STRIPE_SECRET_KEY"),
  stripeWebhookSecret: () => required("STRIPE_WEBHOOK_SECRET"),
  stripePriceCrew: () => required("STRIPE_PRICE_CREW"),
  stripePriceCompany: () => required("STRIPE_PRICE_COMPANY"),
  // Where /get sends iPhone users: the TestFlight public link now, the App Store page later.
  iosAppUrl: () => process.env.IOS_APP_URL || undefined,
  diginateApiKey: () => process.env.DIGINATE_API_KEY, // optional: unset means PDF fallback
  diginateApiBaseUrl: () => process.env.DIGINATE_API_BASE_URL ?? "https://api.diginate.com",
};

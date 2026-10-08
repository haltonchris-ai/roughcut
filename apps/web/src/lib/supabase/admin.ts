import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";

// Service-role client. Bypasses RLS entirely. Server-only (the `server-only`
// import throws at build time if a client component ever pulls this in).
// Use ONLY for: signup (creating the company + first profile before a
// session exists), invite acceptance, the Stripe webhook, and super-admin
// actions. Every other read/write should go through supabase/server.ts so
// RLS is the thing actually enforcing access.
export function createAdminClient() {
  return createSupabaseClient(env.supabaseUrl(), env.supabaseServiceRoleKey(), {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

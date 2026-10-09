"use server";

import { redirect } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";

// Sends a password-reset email. Uses the implicit flow (tokens arrive in the
// link itself) so the link works even if the email is opened in a different
// browser or app than the one the request came from. The response never says
// whether the address has an account.
export async function requestPasswordReset(formData: FormData): Promise<void> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!email) redirect("/forgot-password?error=Enter your email address.");

  const supabase = createClient(env.supabaseUrl(), env.supabaseAnonKey(), {
    auth: { flowType: "implicit", persistSession: false, autoRefreshToken: false },
  });
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${env.webOrigin()}/reset-password`,
  });
  if (error && /rate limit|too many|seconds/i.test(error.message)) {
    redirect("/forgot-password?error=Too many requests. Wait a few minutes and try again.");
  }
  redirect("/forgot-password?sent=1");
}

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@roughcut/shared";

// Loads the signed-in user's profile for use in /app pages. Redirects to
// /login if there's no session, and away from /app entirely if the account
// is a platform_owner (who belongs at /admin) or has been disabled.
export async function requireCompanyProfile(): Promise<{ profile: Profile; supabase: Awaited<ReturnType<typeof createClient>> }> {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    redirect("/login?next=/app");
  }

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", userData.user.id).single<Profile>();

  if (!profile || profile.role === "platform_owner" || !profile.company_id) {
    redirect("/admin/login");
  }
  if (profile.disabled_at) {
    redirect("/login?error=" + encodeURIComponent("Your account has been disabled."));
  }

  return { profile, supabase };
}

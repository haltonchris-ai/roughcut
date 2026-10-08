import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@roughcut/shared";

// Platform owner is seeded once (PLATFORM_OWNER_EMAIL) and never a signup.
// is_platform_owner()-gated RLS policies mean the owner can use the normal
// session-bound client for reads across every company; writes that need to
// bypass RLS entirely (suspending a company's users, audit logging) still
// go through the admin client explicitly in each action.
export async function requirePlatformOwner(): Promise<{ profile: Profile; supabase: Awaited<ReturnType<typeof createClient>> }> {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    redirect("/admin/login");
  }

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", userData.user.id).single<Profile>();
  if (!profile || profile.role !== "platform_owner") {
    await supabase.auth.signOut();
    redirect("/admin/login?error=" + encodeURIComponent("Not a platform owner account."));
  }

  return { profile, supabase };
}

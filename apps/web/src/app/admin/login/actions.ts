"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@roughcut/shared";

export async function adminLogin(formData: FormData): Promise<void> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const fail = (message: string): never =>
    redirect(`/admin/login?error=${encodeURIComponent(message)}`);

  if (!email || !password) fail("Enter your email and password.");

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error || !data.user) fail("Incorrect email or password.");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", data.user!.id)
    .single<Profile>();

  if (!profile || profile.role !== "platform_owner") {
    await supabase.auth.signOut();
    fail("This account is not a platform owner.");
  }

  redirect("/admin/companies");
}

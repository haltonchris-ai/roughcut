"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

function failLogin(message: string, next: string): never {
  redirect(`/login?error=${encodeURIComponent(message)}&next=${encodeURIComponent(next)}`);
}

export async function login(formData: FormData): Promise<void> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "/app");

  if (!email || !password) {
    failLogin("Enter your email and password.", next);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    failLogin("Incorrect email or password.", next);
  }

  redirect(next.startsWith("/") ? next : "/app");
}

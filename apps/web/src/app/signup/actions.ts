"use server";

import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { getStripe, priceIdForPlan } from "@/lib/stripe";
import { env } from "@/lib/env";
import type { CompanyPlan } from "@roughcut/shared";

function failSignup(message: string): never {
  redirect(`/signup?error=${encodeURIComponent(message)}`);
}

export async function signup(formData: FormData): Promise<void> {
  const companyName = String(formData.get("companyName") ?? "").trim();
  const fullName = String(formData.get("fullName") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const plan = (String(formData.get("plan") ?? "free")) as CompanyPlan;

  if (!companyName || !fullName || !email || password.length < 8) {
    failSignup("Fill in every field; password needs at least 8 characters.");
  }
  if (!["free", "crew", "company"].includes(plan)) {
    failSignup("Invalid plan.");
  }

  const admin = createAdminClient();

  // 1. Company row. Free plan is active immediately; paid plans start
  // "incomplete" until Checkout completes and the webhook confirms payment.
  const { data: company, error: companyErr } = await admin
    .from("companies")
    .insert({ name: companyName, plan, subscription_status: plan === "free" ? "free" : "incomplete" })
    .select()
    .single();
  if (companyErr || !company) {
    failSignup("Could not create company. " + (companyErr?.message ?? ""));
  }

  // 2. Auth user. email_confirm: true because there's no transactional email
  // provider wired up yet (see DECISIONS.md) — signup logs the user straight in.
  const { data: created, error: userErr } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (userErr || !created.user) {
    await admin.from("companies").delete().eq("id", company.id);
    failSignup(userErr?.message ?? "Could not create account.");
  }

  // 3. Profile: company_admin, tied to the new company.
  const { error: profileErr } = await admin.from("profiles").insert({
    id: created.user.id,
    company_id: company.id,
    role: "company_admin",
    full_name: fullName,
  });
  if (profileErr) {
    await admin.auth.admin.deleteUser(created.user.id);
    await admin.from("companies").delete().eq("id", company.id);
    failSignup("Could not create profile. " + profileErr.message);
  }

  // 4. Sign the browser in (sets the session cookie via the anon client).
  const supabase = await createClient();
  const { error: signInErr } = await supabase.auth.signInWithPassword({ email, password });
  if (signInErr) {
    failSignup("Account created, but sign-in failed. Try logging in directly.");
  }

  // 5. Free plan: done. Paid plan: start Checkout.
  if (plan === "free") {
    redirect("/app");
  }

  const stripe = getStripe();
  const customer = await stripe.customers.create({
    email,
    name: companyName,
    metadata: { company_id: company.id },
  });

  await admin.from("companies").update({ stripe_customer_id: customer.id }).eq("id", company.id);

  const checkoutSession = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customer.id,
    line_items: [{ price: priceIdForPlan(plan as "crew" | "company"), quantity: 1 }],
    success_url: `${env.webOrigin()}/app?checkout=success`,
    cancel_url: `${env.webOrigin()}/app/billing?checkout=cancelled`,
    metadata: { company_id: company.id },
    subscription_data: { metadata: { company_id: company.id } },
  });

  if (!checkoutSession.url) {
    failSignup("Could not start checkout. Your account was created — try again from Billing.");
  }

  redirect(checkoutSession.url);
}

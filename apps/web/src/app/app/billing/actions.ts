"use server";

import { redirect } from "next/navigation";
import { requireCompanyProfile } from "@/lib/current-profile";
import { getStripe } from "@/lib/stripe";
import { env } from "@/lib/env";
import type { Company } from "@roughcut/shared";

export async function openBillingPortal(): Promise<void> {
  const { profile, supabase } = await requireCompanyProfile();
  if (profile.role !== "company_admin") {
    redirect("/app/billing");
  }

  const { data: company } = await supabase
    .from("companies")
    .select("*")
    .eq("id", profile.company_id)
    .single<Company>();

  if (!company?.stripe_customer_id) {
    redirect("/app/billing?error=" + encodeURIComponent("No billing account yet — upgrade from Pricing first."));
  }

  const stripe = getStripe();
  const portal = await stripe.billingPortal.sessions.create({
    customer: company.stripe_customer_id,
    return_url: `${env.webOrigin()}/app/billing`,
  });

  redirect(portal.url);
}

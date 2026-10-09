"use server";

import { redirect } from "next/navigation";
import { requireCompanyProfile } from "@/lib/current-profile";
import { getStripe, priceIdForPlan } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";
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

// Upgrade (or switch between paid plans) for a signed-in company.
//  - No live subscription yet: start a Stripe Checkout for that plan.
//  - Live subscription: swap the price in place (prorated); the webhook then
//    confirms the new plan.
export async function changePlan(formData: FormData): Promise<void> {
  const { profile, supabase } = await requireCompanyProfile();
  if (profile.role !== "company_admin") {
    redirect("/app/billing?error=" + encodeURIComponent("Only a company admin can change the plan."));
  }
  const plan = String(formData.get("plan") ?? "");
  if (plan !== "crew" && plan !== "company") {
    redirect("/app/billing");
  }

  const { data: company } = await supabase
    .from("companies")
    .select("*")
    .eq("id", profile.company_id)
    .single<Company>();
  if (!company) redirect("/app/billing");

  let checkoutUrl: string | null = null;
  let failure: string | null = null;
  try {
    const stripe = getStripe();
    const price = priceIdForPlan(plan);
    const admin = createAdminClient();
    const live =
      company.stripe_subscription_id && ["active", "trialing", "past_due"].includes(company.subscription_status);

    if (live) {
      const sub = await stripe.subscriptions.retrieve(company.stripe_subscription_id!);
      const item = sub.items.data[0];
      if (!item) throw new Error("subscription has no items");
      await stripe.subscriptions.update(sub.id, {
        items: [{ id: item.id, price }],
        proration_behavior: "create_prorations",
      });
      await admin.from("companies").update({ plan }).eq("id", company.id);
    } else {
      let customerId = company.stripe_customer_id;
      if (!customerId) {
        const { data: userData } = await supabase.auth.getUser();
        const customer = await stripe.customers.create({
          email: userData.user?.email ?? undefined,
          name: company.name,
          metadata: { company_id: company.id },
        });
        customerId = customer.id;
        await admin.from("companies").update({ stripe_customer_id: customerId }).eq("id", company.id);
      }
      const session = await stripe.checkout.sessions.create({
        mode: "subscription",
        customer: customerId,
        line_items: [{ price, quantity: 1 }],
        success_url: `${env.webOrigin()}/app/billing?checkout=success`,
        cancel_url: `${env.webOrigin()}/app/billing?checkout=cancelled`,
        metadata: { company_id: company.id },
        subscription_data: { metadata: { company_id: company.id } },
      });
      checkoutUrl = session.url;
    }
  } catch (err) {
    console.error("changePlan failed", err);
    failure = "Billing isn't available right now. Please try again shortly.";
  }

  if (failure) redirect("/app/billing?error=" + encodeURIComponent(failure));
  if (checkoutUrl) redirect(checkoutUrl);
  redirect("/app/billing?checkout=changed");
}

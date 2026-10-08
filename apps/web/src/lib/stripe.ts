import "server-only";
import Stripe from "stripe";
import { env } from "@/lib/env";

let stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (!stripe) {
    stripe = new Stripe(env.stripeSecretKey(), { apiVersion: "2025-02-24.acacia" });
  }
  return stripe;
}

export function priceIdForPlan(plan: "crew" | "company"): string {
  return plan === "crew" ? env.stripePriceCrew() : env.stripePriceCompany();
}

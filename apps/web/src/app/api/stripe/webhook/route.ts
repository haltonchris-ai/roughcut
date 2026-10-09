import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripe } from "@/lib/stripe";
import { env } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
import type { CompanyPlan } from "@roughcut/shared";

function planFromPriceId(priceId: string | undefined): CompanyPlan | null {
  if (!priceId) return null;
  if (priceId === process.env.STRIPE_PRICE_CREW) return "crew";
  if (priceId === process.env.STRIPE_PRICE_COMPANY) return "company";
  return null;
}

// Route handlers don't parse the body unless you ask them to, so req.text()
// here is the exact raw bytes Stripe signed — required for signature
// verification.
export async function POST(req: Request): Promise<NextResponse> {
  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "missing signature" }, { status: 400 });
  }

  const rawBody = await req.text();
  const stripe = getStripe();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, env.stripeWebhookSecret());
  } catch (err) {
    console.error("stripe webhook signature verification failed", err);
    return NextResponse.json({ error: "invalid signature" }, { status: 400 });
  }

  const admin = createAdminClient();

  async function resolveCompanyId(opts: {
    metadata?: Stripe.Metadata | null;
    customerId?: string | null;
  }): Promise<string | null> {
    if (opts.metadata?.company_id) return opts.metadata.company_id;
    if (opts.customerId) {
      const { data } = await admin
        .from("companies")
        .select("id")
        .eq("stripe_customer_id", opts.customerId)
        .maybeSingle();
      return data?.id ?? null;
    }
    return null;
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const companyId = await resolveCompanyId({
          metadata: session.metadata,
          customerId: typeof session.customer === "string" ? session.customer : session.customer?.id ?? null,
        });
        if (companyId && session.subscription) {
          const subscriptionId =
            typeof session.subscription === "string" ? session.subscription : session.subscription.id;
          const sub = await stripe.subscriptions.retrieve(subscriptionId);
          const paidPlan = planFromPriceId(sub.items.data[0]?.price?.id);
          await admin
            .from("companies")
            .update({
              ...(paidPlan ? { plan: paidPlan } : {}),
              stripe_subscription_id: subscriptionId,
              stripe_customer_id:
                typeof session.customer === "string" ? session.customer : session.customer?.id ?? undefined,
              subscription_status: sub.status,
            })
            .eq("id", companyId);
        }
        break;
      }

      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;
        const companyId = await resolveCompanyId({
          metadata: sub.metadata,
          customerId: typeof sub.customer === "string" ? sub.customer : sub.customer?.id ?? null,
        });
        if (companyId) {
          const plan = planFromPriceId(sub.items.data[0]?.price?.id);
          await admin
            .from("companies")
            .update({
              stripe_subscription_id: sub.id,
              subscription_status: sub.status,
              ...(plan ? { plan } : {}),
            })
            .eq("id", companyId);
        }
        break;
      }

      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const companyId = await resolveCompanyId({
          metadata: sub.metadata,
          customerId: typeof sub.customer === "string" ? sub.customer : sub.customer?.id ?? null,
        });
        if (companyId) {
          // Data is never deleted; the row stays readable but caps block writes.
          await admin.from("companies").update({ subscription_status: "canceled" }).eq("id", companyId);
        }
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const companyId = await resolveCompanyId({
          customerId: typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id ?? null,
        });
        if (companyId) {
          await admin.from("companies").update({ subscription_status: "past_due" }).eq("id", companyId);
        }
        break;
      }

      default:
        // Unhandled event types are intentionally ignored — spec lists
        // exactly these four.
        break;
    }
  } catch (err) {
    console.error("stripe webhook handler error", event.type, err);
    // Still 200: Stripe retries on non-2xx, and most failures here are our
    // own bug, not something a retry fixes. Logged for manual follow-up.
  }

  return NextResponse.json({ received: true });
}

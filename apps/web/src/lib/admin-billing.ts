import "server-only";
import { getStripe } from "@/lib/stripe";
import type Stripe from "stripe";

export interface CompanyBilling {
  mrrUsd: number | null;
  lastInvoiceStatus: string | null;
}

function toMonthly(amountCents: number, interval: Stripe.Price.Recurring.Interval, intervalCount: number): number {
  const perMonthFactor: Record<Stripe.Price.Recurring.Interval, number> = {
    day: 30,
    week: 4.345,
    month: 1,
    year: 1 / 12,
  };
  return (amountCents / 100) * (perMonthFactor[interval] / intervalCount);
}

// Reads straight from Stripe on every call — no second ledger, per spec
// ("Super admin revenue reads Stripe. Do not store a second ledger."). Fine
// for MVP company counts; if the admin company list grows large, this is the
// place to add caching.
export async function getCompanyBilling(stripeSubscriptionId: string | null): Promise<CompanyBilling> {
  if (!stripeSubscriptionId) {
    return { mrrUsd: null, lastInvoiceStatus: null };
  }

  const stripe = getStripe();
  try {
    const sub = await stripe.subscriptions.retrieve(stripeSubscriptionId, {
      expand: ["items.data.price", "latest_invoice"],
    });

    let mrrUsd = 0;
    for (const item of sub.items.data) {
      const price = item.price;
      if (price.recurring && price.unit_amount != null) {
        mrrUsd += toMonthly(price.unit_amount * (item.quantity ?? 1), price.recurring.interval, price.recurring.interval_count);
      }
    }

    const latestInvoice = sub.latest_invoice;
    const lastInvoiceStatus =
      typeof latestInvoice === "string" ? null : (latestInvoice as Stripe.Invoice | null)?.status ?? null;

    return { mrrUsd, lastInvoiceStatus };
  } catch (err) {
    console.error("stripe subscription lookup failed", err);
    return { mrrUsd: null, lastInvoiceStatus: null };
  }
}

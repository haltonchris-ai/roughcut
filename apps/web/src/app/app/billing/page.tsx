import Link from "next/link";
import { requireCompanyProfile } from "@/lib/current-profile";
import { openBillingPortal } from "./actions";
import { PLAN_LIMITS, PLAN_PRICING } from "@roughcut/shared";
import type { Company } from "@roughcut/shared";

const STATUS_STYLE: Record<string, string> = {
  free: "bg-line text-muted",
  active: "bg-good/15 text-good",
  trialing: "bg-good/15 text-good",
  past_due: "bg-warn/15 text-warn",
  unpaid: "bg-bad/15 text-bad",
  canceled: "bg-bad/15 text-bad",
  incomplete: "bg-warn/15 text-warn",
  incomplete_expired: "bg-bad/15 text-bad",
};

export default async function BillingPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { profile, supabase } = await requireCompanyProfile();
  const sp = await searchParams;

  const { data: company } = await supabase
    .from("companies")
    .select("*")
    .eq("id", profile.company_id)
    .single<Company>();

  if (!company) return null;

  const limits = PLAN_LIMITS[company.plan];
  const blocked = ["past_due", "unpaid", "canceled", "incomplete_expired"].includes(company.subscription_status);

  return (
    <div className="max-w-xl">
      <h1 className="text-2xl font-bold">Billing</h1>
      {sp.error && <p className="mt-3 text-sm text-bad">{sp.error}</p>}

      <div className="card mt-6 p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-lg font-semibold capitalize">{company.plan} plan</p>
            <p className="text-muted">
              {PLAN_PRICING[company.plan].monthlyUsd === 0
                ? "Free"
                : `$${PLAN_PRICING[company.plan].monthlyUsd}/mo`}
            </p>
          </div>
          <span
            className={
              "rounded-full px-3 py-1 text-xs font-medium " +
              (STATUS_STYLE[company.subscription_status] ?? "bg-line text-muted")
            }
          >
            {company.subscription_status.replace(/_/g, " ")}
          </span>
        </div>

        <ul className="mt-4 space-y-1 text-sm text-muted">
          <li>{limits.maxActiveJobs ?? "Unlimited"} active jobs</li>
          <li>{limits.maxBoxes ?? "Unlimited"} boxes</li>
          <li>{limits.maxUsers} users</li>
        </ul>

        {blocked && (
          <p className="mt-4 rounded-lg border border-bad/40 bg-bad/10 p-3 text-sm text-bad">
            Billing isn't current. Your data is safe and still readable, but new jobs, boxes, and invites are
            blocked until this is resolved.
          </p>
        )}

        <div className="mt-6 flex gap-3">
          {profile.role === "company_admin" && company.stripe_customer_id && (
            <form action={openBillingPortal}>
              <button type="submit" className="btn-primary">
                Manage billing
              </button>
            </form>
          )}
          {profile.role === "company_admin" && company.plan === "free" && (
            <Link href="/pricing" className="rounded-lg border border-line px-6 py-3 font-semibold hover:border-accent">
              Upgrade plan
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

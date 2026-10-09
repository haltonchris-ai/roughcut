import Link from "next/link";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import { PLAN_LIMITS, PLAN_PRICING, type CompanyPlan } from "@roughcut/shared";

const PLAN_COPY: Record<CompanyPlan, { tagline: string; cta: string }> = {
  free: { tagline: "Try one job before you commit.", cta: "Start free" },
  crew: { tagline: "For a crew running several jobs at once.", cta: "Start on Crew" },
  company: { tagline: "Unlimited jobs and boxes for growing shops.", cta: "Start on Company" },
};

export default function PricingPage() {
  const plans = Object.keys(PLAN_LIMITS) as CompanyPlan[];

  return (
    <>
      <SiteNav />
      <main className="mx-auto max-w-site px-6 py-16 sm:px-10">
        <span className="eyebrow">Pricing</span>
        <h1 className="mt-3 text-4xl">Pick the plan that fits your crew.</h1>
        <p className="mt-2 max-w-xl text-muted">
          Every plan includes unlimited scans. Free accounts can print their own labels from a ready-made PDF; Crew and
          Company can also have printed stickers shipped.
        </p>

        <div className="mt-10 grid gap-6 sm:grid-cols-3">
          {plans.map((plan) => {
            const limits = PLAN_LIMITS[plan];
            const price = PLAN_PRICING[plan].monthlyUsd;
            return (
              <div key={plan} className="card flex flex-col p-6">
                <h2 className="text-xl capitalize">{plan}</h2>
                <p className="mt-1 text-sm text-muted">{PLAN_COPY[plan].tagline}</p>
                <p className="mt-6 font-display text-4xl font-extrabold">${price}</p>
                <p className="text-sm text-muted">per month</p>

                <ul className="mt-6 flex-1 space-y-2 text-sm">
                  <li>{limits.maxActiveJobs ?? "Unlimited"} active jobs</li>
                  <li>{limits.maxBoxes ?? "Unlimited"} stickers (boxes)</li>
                  <li>{limits.maxUsers} team members</li>
                  <li>{limits.stickerShipping ? "Printed stickers shipped to you" : "PDF labels, print yourself"}</li>
                  <li>Offline scan + sync on mobile</li>
                </ul>

                <Link href={`/signup?plan=${plan}`} className="btn-primary mt-6 text-center">
                  {PLAN_COPY[plan].cta}
                </Link>
              </div>
            );
          })}
        </div>

        <p className="mt-10 text-sm text-muted">
          An active job is one with status "open." Canceled or past-due accounts stay readable but can't create new
          jobs, boxes, or invites until billing is current — nothing is ever deleted.
        </p>
      </main>
      <SiteFooter />
    </>
  );
}

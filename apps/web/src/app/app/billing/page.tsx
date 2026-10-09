import Link from "next/link";
import { requireCompanyProfile } from "@/lib/current-profile";
import { openBillingPortal, changePlan } from "./actions";
import { SubmitButton } from "@/components/submit-button";
import { getStickerUsage } from "@/lib/sticker-usage";
import { PLAN_LIMITS, PLAN_PRICING } from "@roughcut/shared";
import type { Company, CompanyPlan } from "@roughcut/shared";

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

const PLAN_COPY: Record<CompanyPlan, { tagline: string }> = {
  free: { tagline: "Try it on a few jobs." },
  crew: { tagline: "For a crew running several jobs at once." },
  company: { tagline: "Unlimited jobs and stickers for growing shops." },
};
const RANK: Record<CompanyPlan, number> = { free: 0, crew: 1, company: 2 };
const PLANS: CompanyPlan[] = ["free", "crew", "company"];
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

function Meter({ label, used, limit }: { label: string; used: number; limit: number | null }) {
  const pct = limit ? Math.min(100, Math.round((used / limit) * 100)) : 0;
  const hot = limit !== null && pct >= 80;
  return (
    <div>
      <div className="flex items-baseline justify-between text-sm">
        <span className="text-muted">{label}</span>
        <span className="font-semibold">
          {used} <span className="font-normal text-muted">of {limit ?? "unlimited"}</span>
        </span>
      </div>
      <div className="mt-1 h-2 overflow-hidden rounded-full bg-line">
        <div className={"h-full rounded-full " + (hot ? "bg-warn" : "bg-good")} style={{ width: limit ? `${pct}%` : "6%" }} />
      </div>
    </div>
  );
}

export default async function BillingPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; checkout?: string; reason?: string }>;
}) {
  const { profile, supabase } = await requireCompanyProfile();
  const sp = await searchParams;
  const isAdmin = profile.role === "company_admin";

  const { data: company } = await supabase
    .from("companies")
    .select("*")
    .eq("id", profile.company_id)
    .single<Company>();
  if (!company) return null;

  const [{ usage }, { count: activeJobs }, { count: users }] = await Promise.all([
    getStickerUsage(supabase, profile.company_id),
    supabase.from("jobs").select("id", { count: "exact", head: true }).eq("status", "open"),
    supabase.from("profiles").select("id", { count: "exact", head: true }).is("disabled_at", null),
  ]);

  const current = company.plan;
  const limits = PLAN_LIMITS[current];
  const price = PLAN_PRICING[current].monthlyUsd;
  const blocked = ["past_due", "unpaid", "canceled", "incomplete_expired"].includes(company.subscription_status);
  const nextPlan = RANK[current] < 2 ? PLANS[RANK[current] + 1]! : null;

  return (
    <div>
      <h1 className="text-2xl font-bold">Plan and billing</h1>
      <p className="mt-1 text-muted">See what you're using and pick the plan that fits.</p>

      {sp.error && <p className="mt-3 text-sm text-bad">{sp.error}</p>}
      {sp.checkout === "success" && (
        <p className="mt-4 rounded-lg border border-good/40 bg-good/10 p-3 text-sm text-good">
          Payment received. Your plan updates within a few seconds. Refresh if it still shows the old one.
        </p>
      )}
      {sp.checkout === "changed" && (
        <p className="mt-4 rounded-lg border border-good/40 bg-good/10 p-3 text-sm text-good">
          Plan changed. The new limits apply right away.
        </p>
      )}
      {sp.checkout === "cancelled" && (
        <p className="mt-4 rounded-lg border border-line p-3 text-sm text-muted">Checkout cancelled. Nothing was charged.</p>
      )}
      {sp.reason === "stickers" && (
        <p className="mt-4 rounded-lg border border-warn/40 bg-warn/10 p-3 text-sm">
          <span className="font-semibold text-warn">You need more stickers.</span>{" "}
          <span className="text-muted">Pick a plan below to unlock them, then go back to Stickers to place your order.</span>
        </p>
      )}
      {blocked && (
        <p className="mt-4 rounded-lg border border-bad/40 bg-bad/10 p-3 text-sm text-bad">
          Billing isn't current. Your data is safe and still readable, but new jobs, stickers and invites are blocked
          until this is resolved.
        </p>
      )}

      <section className="card mt-6 p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="eyebrow">Your plan</p>
            <h2 className="mt-1 text-2xl font-bold">{cap(current)}</h2>
            <p className="text-muted">{price === 0 ? "Free" : `$${price} per month`}</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <span
              className={
                "rounded-full px-3 py-1 text-xs font-medium " +
                (STATUS_STYLE[company.subscription_status] ?? "bg-line text-muted")
              }
            >
              {company.subscription_status.replace(/_/g, " ")}
            </span>
            {isAdmin && company.stripe_customer_id && (
              <form action={openBillingPortal}>
                <SubmitButton pendingText="Opening…" className="btn-outline">
                  Manage billing
                </SubmitButton>
              </form>
            )}
          </div>
        </div>

        <div className="mt-6 grid gap-5 sm:grid-cols-3">
          <Meter label="Stickers" used={usage.total} limit={limits.maxBoxes} />
          <Meter label="Active jobs" used={activeJobs ?? 0} limit={limits.maxActiveJobs} />
          <Meter label="Team members" used={users ?? 0} limit={limits.maxUsers} />
        </div>
        {isAdmin && nextPlan && (usage.level === "low" || usage.level === "out") && (
          <p className="mt-4 text-sm text-warn">
            You're {usage.level === "out" ? "out of" : "running low on"} stickers. Upgrade to {cap(nextPlan)} to unlock
            more.
          </p>
        )}
      </section>

      <section id="plans" className="mt-8 rounded-2xl bg-navy p-6 sm:p-8">
        <p className="eyebrow text-accent-soft">Plans</p>
        <h2 className="mt-1 text-2xl font-bold text-white">Upgrade when your crew grows.</h2>
        <p className="mt-2 max-w-xl text-sm text-white/70">
          One monthly plan covers your jobs, stickers and team. Every plan includes unlimited scans, and you can always
          print your own labels from a PDF.
        </p>

        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          {PLANS.map((plan) => {
            const l = PLAN_LIMITS[plan];
            const p = PLAN_PRICING[plan].monthlyUsd;
            const isCurrent = plan === current;
            const isUp = RANK[plan] > RANK[current];
            return (
              <div
                key={plan}
                className={
                  "relative flex flex-col rounded-xl bg-card p-5 " + (isCurrent ? "ring-2 ring-accent" : "")
                }
              >
                {isCurrent && (
                  <span className="absolute -top-3 left-5 rounded-full bg-accent px-3 py-0.5 text-xs font-semibold text-white">
                    Your plan
                  </span>
                )}
                <h3 className="text-lg font-bold">{cap(plan)}</h3>
                <p className="mt-0.5 text-sm text-muted">{PLAN_COPY[plan].tagline}</p>
                <p className="mt-4 font-display text-3xl font-extrabold">
                  ${p}
                  <span className="text-sm font-normal text-muted">/mo</span>
                </p>
                <ul className="mt-4 flex-1 space-y-1.5 text-sm text-muted">
                  <li>{l.maxActiveJobs ?? "Unlimited"} active jobs</li>
                  <li>{l.maxBoxes ?? "Unlimited"} stickers</li>
                  <li>{l.maxUsers} team members</li>
                  <li>{l.stickerShipping ? "Printed stickers shipped to you" : "PDF labels, print yourself"}</li>
                </ul>

                <div className="mt-5">
                  {isCurrent ? (
                    <span className="block rounded-lg bg-dim py-3 text-center text-sm font-semibold text-muted">
                      Current plan
                    </span>
                  ) : !isAdmin ? (
                    <span className="block text-center text-xs text-muted">Ask your company admin to change plans.</span>
                  ) : plan === "free" ? (
                    company.stripe_customer_id ? (
                      <form action={openBillingPortal}>
                        <SubmitButton pendingText="Opening…" className="btn-outline w-full">
                          Cancel in billing portal
                        </SubmitButton>
                      </form>
                    ) : null
                  ) : (
                    <form action={changePlan}>
                      <input type="hidden" name="plan" value={plan} />
                      <SubmitButton
                        pendingText="One moment…"
                        className={(isUp ? "btn-primary" : "btn-outline") + " w-full"}
                        confirmMessage={
                          isUp && company.stripe_subscription_id
                            ? `Upgrade to ${cap(plan)} for $${p}/mo? The difference is prorated.`
                            : !isUp
                              ? `Switch to ${cap(plan)} ($${p}/mo)? Your limits drop to that plan's.`
                              : undefined
                        }
                      >
                        {isUp ? `Upgrade to ${cap(plan)}` : `Switch to ${cap(plan)}`}
                      </SubmitButton>
                    </form>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        <p className="mt-5 text-xs text-white/60">
          Upgrades take effect immediately and are prorated. To downgrade or cancel, use the billing portal. Nothing you
          have created is ever deleted.{" "}
          <Link href="/pricing" className="underline">
            Full plan details
          </Link>
        </p>
      </section>
    </div>
  );
}

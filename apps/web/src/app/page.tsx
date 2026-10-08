import Link from "next/link";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import { PLAN_LIMITS, PLAN_PRICING } from "@roughcut/shared";

const steps = [
  {
    title: "Lay out the job",
    body:
      "The foreman walks the house once, specs every box — type, size, height, circuit, notes, a photo — and sticks a unique 2×5\" label on each location.",
  },
  {
    title: "Scan instead of guessing",
    body:
      "Installers come back later with no memory of the layout. They scan the sticker and the full spec is right there — no paper, no texting the foreman.",
  },
  {
    title: "Mark it done, for good",
    body: "Installed status never reverts. Admins watch job progress roll up in real time, even across crews.",
  },
];

export default function MarketingPage() {
  return (
    <>
      <SiteNav />
      <main>
        <section className="mx-auto max-w-page px-6 py-20">
          <p className="text-sm font-semibold uppercase tracking-wide text-accent">For electrical contractors</p>
          <h1 className="mt-4 max-w-2xl text-4xl font-bold leading-tight sm:text-5xl">
            Spec the box once. Scan the sticker forever.
          </h1>
          <p className="mt-6 max-w-xl text-lg text-muted">
            RoughCUT replaces the layout sheet that gets lost between the foreman and the installer. Every box gets a
            sticker. Every sticker knows its own spec.
          </p>
          <div className="mt-8 flex gap-4">
            <Link href="/signup" className="btn-primary">
              Start free
            </Link>
            <Link
              href="/pricing"
              className="rounded-lg border border-line px-6 py-3 font-semibold text-ink hover:border-accent"
            >
              See plans
            </Link>
          </div>
        </section>

        <section className="mx-auto max-w-page px-6 py-12">
          <div className="grid gap-6 sm:grid-cols-3">
            {steps.map((step, i) => (
              <div key={step.title} className="card p-6">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-accent text-sm font-bold text-bg">
                  {i + 1}
                </div>
                <h3 className="mt-4 font-semibold">{step.title}</h3>
                <p className="mt-2 text-sm text-muted">{step.body}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-page px-6 py-16">
          <h2 className="text-2xl font-bold">Three plans. Start free.</h2>
          <p className="mt-2 text-muted">A foreman can try one job before anyone pays anything.</p>
          <div className="mt-8 grid gap-6 sm:grid-cols-3">
            {(Object.keys(PLAN_LIMITS) as Array<keyof typeof PLAN_LIMITS>).map((plan) => (
              <div key={plan} className="card p-6">
                <h3 className="font-semibold capitalize">{plan}</h3>
                <p className="mt-1 text-2xl font-bold">
                  {PLAN_PRICING[plan].monthlyUsd === 0 ? "Free" : `$${PLAN_PRICING[plan].monthlyUsd}/mo`}
                </p>
                <ul className="mt-4 space-y-1 text-sm text-muted">
                  <li>{PLAN_LIMITS[plan].maxActiveJobs ?? "Unlimited"} active jobs</li>
                  <li>{PLAN_LIMITS[plan].maxBoxes ?? "Unlimited"} boxes</li>
                  <li>{PLAN_LIMITS[plan].maxUsers} users</li>
                  <li>{PLAN_LIMITS[plan].stickerShipping ? "Sticker shipping" : "PDF labels only"}</li>
                </ul>
              </div>
            ))}
          </div>
          <Link href="/pricing" className="mt-8 inline-block text-accent hover:underline">
            Full plan details →
          </Link>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}

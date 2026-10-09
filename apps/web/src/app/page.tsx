import Link from "next/link";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import { StickerGraphic } from "@/components/sticker-graphic";
import { VideoEmbed } from "@/components/video-embed";

const DEMO_VIDEO_ID = "VjLzdFwBTO8";
import { env } from "@/lib/env";
import { PLAN_LIMITS, PLAN_PRICING } from "@roughcut/shared";

const steps = [
  {
    title: "Foreman lays out the job",
    body: "Stick a RoughCUT QR on each box location, scan it, and enter the type, size, height, and any notes the installer needs.",
  },
  {
    title: "Details sync instantly",
    body: "Every box is tied to its own unique sticker the moment it's specced — visible to the whole crew, updatable anytime, even offline.",
  },
  {
    title: "Installers scan and go",
    body: "On site, installers scan the sticker and see exactly what to install — then mark it complete when it's done.",
  },
];

// Rendered per request so the sample QR always uses the live site address.
export const dynamic = "force-dynamic";

export default function MarketingPage() {
  const freeLimits = PLAN_LIMITS.free;

  return (
    <>
      <SiteNav />
      <main>
        {/* Hero */}
        <section className="mx-auto flex max-w-site flex-col items-center gap-14 px-6 pb-20 pt-16 sm:px-10 lg:flex-row lg:gap-16 lg:pb-24 lg:pt-24">
          <div className="flex flex-1 flex-col gap-6">
            <span className="eyebrow">Built for electrical crews</span>
            <h1 className="text-4xl leading-[1.05] sm:text-5xl lg:text-[56px]">Every box, exactly where it belongs.</h1>
            <p className="max-w-xl text-lg leading-relaxed text-muted">
              RoughCUT turns your foreman&apos;s rough-in layout into a scannable job record — so every installer knows
              the type, size, and height of every box without tracing a single line.
            </p>
            <div className="mt-2 flex flex-wrap gap-3.5">
              <Link href="/signup" className="btn-primary px-7">
                Start free
              </Link>
              <Link href="/#video" className="btn-outline px-7">
                Watch the demo
              </Link>
            </div>
            <p className="text-sm text-faint">
              Free plan: {freeLimits.maxActiveJobs} jobs and {freeLimits.maxBoxes} stickers. No card needed.
            </p>
          </div>
          <div className="flex flex-1 items-center justify-center">
            <StickerGraphic url={`${env.webOrigin()}/get`} />
          </div>
        </section>

        {/* Demo video */}
        <section id="video" className="mx-auto max-w-4xl scroll-mt-4 px-6 pb-20 sm:px-10 lg:pb-24">
          <div className="text-center">
            <span className="eyebrow">See it in action</span>
            <h2 className="mt-3 text-3xl sm:text-4xl">Scan the sticker. See the box.</h2>
            <p className="mx-auto mt-3 max-w-xl text-muted">
              From the foreman laying out the job to an installer scanning weeks later, here is how RoughCUT works on
              site.
            </p>
          </div>
          <div className="mt-8">
            <VideoEmbed videoId={DEMO_VIDEO_ID} title="RoughCUT demo: scan the sticker, see the box details" />
          </div>
          <p className="mt-3 text-center text-sm text-faint">
            <a
              href={`https://youtu.be/${DEMO_VIDEO_ID}`}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:underline"
            >
              Watch on YouTube
            </a>
          </p>
        </section>

        {/* Problem strip */}
        <section className="bg-ink">
          <div className="mx-auto flex max-w-site flex-col gap-6 px-6 py-12 sm:px-10 md:flex-row md:items-center md:gap-12">
            <p className="max-w-md text-xl font-semibold leading-snug text-bg">
              Rough-in details live in the foreman&apos;s head — and get lost by the time the install crew shows up.
            </p>
            <div className="hidden h-14 w-px bg-white/15 md:block" />
            <p className="max-w-md leading-relaxed text-bg/75">
              Crews re-trace lines, guess at heights, and call the foreman mid-install. RoughCUT puts the answer on the
              box itself.
            </p>
          </div>
        </section>

        {/* How it works */}
        <section id="how" className="mx-auto max-w-site scroll-mt-4 px-6 py-20 sm:px-10 lg:py-24">
          <span className="eyebrow">How it works</span>
          <h2 className="mt-3 max-w-xl text-3xl sm:text-4xl">Three steps from layout to install.</h2>
          <div className="mt-12 grid gap-10 md:grid-cols-3">
            {steps.map((step, i) => (
              <div key={step.title} className="flex flex-col gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-ink font-display text-base font-extrabold text-bg">
                  {i + 1}
                </div>
                <h3 className="text-xl">{step.title}</h3>
                <p className="leading-relaxed text-muted">{step.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Roles */}
        <section className="mx-auto grid max-w-site gap-6 px-6 pb-20 sm:px-10 md:grid-cols-2 lg:pb-24">
          <div className="card flex flex-col gap-3.5 p-8 sm:p-9">
            <span className="inline-flex w-fit rounded-full bg-[#E7EAF1] px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-navy">
              For foremen
            </span>
            <h3 className="text-2xl">Lay out once, get it right everywhere.</h3>
            <p className="leading-relaxed text-muted">
              Scan a sticker for every box, log the spec, and see which ones are installed across every active job —
              from your phone.
            </p>
          </div>
          <div className="card flex flex-col gap-3.5 p-8 sm:p-9">
            <span className="inline-flex w-fit rounded-full bg-[#DEEBE4] px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-good">
              For install crews
            </span>
            <h3 className="text-2xl">Show up and know exactly what to do.</h3>
            <p className="leading-relaxed text-muted">
              Find your job, scan a box, and see the foreman&apos;s exact spec — no calls, no guessing, no rework.
            </p>
          </div>
        </section>

        {/* Plans */}
        <section className="bg-navy">
          <div className="mx-auto max-w-site px-6 py-20 sm:px-10">
            <span className="eyebrow !text-[#E8B98A]">Simple pricing</span>
            <h2 className="mt-3 max-w-xl text-3xl text-white sm:text-4xl">Start free. Upgrade when your crew grows.</h2>
            <p className="mt-3 max-w-xl leading-relaxed text-white/70">
              One monthly plan covers your jobs, stickers, and team. Every plan includes unlimited scans, and you can
              always print your own labels from a PDF.
            </p>
            <div className="mt-10 grid gap-5 md:grid-cols-3">
              {(Object.keys(PLAN_LIMITS) as Array<keyof typeof PLAN_LIMITS>).map((plan) => (
                <div key={plan} className="card flex flex-col p-6">
                  <h3 className="text-lg capitalize">{plan}</h3>
                  <p className="mt-1 font-display text-3xl font-extrabold">
                    ${PLAN_PRICING[plan].monthlyUsd}
                    <span className="text-base font-semibold text-muted">/mo</span>
                  </p>
                  <ul className="mt-4 space-y-1.5 text-sm text-muted">
                    <li>{PLAN_LIMITS[plan].maxActiveJobs ?? "Unlimited"} active jobs</li>
                    <li>{PLAN_LIMITS[plan].maxBoxes ?? "Unlimited"} stickers</li>
                    <li>{PLAN_LIMITS[plan].maxUsers} team members</li>
                    <li>{PLAN_LIMITS[plan].stickerShipping ? "Printed stickers shipped to you" : "PDF labels, print yourself"}</li>
                  </ul>
                </div>
              ))}
            </div>
            <Link href="/pricing" className="mt-8 inline-block font-semibold text-[#F0B88A] hover:underline">
              Full plan details →
            </Link>
          </div>
        </section>

        {/* Final CTA */}
        <section className="mx-auto flex max-w-site flex-col items-center gap-6 px-6 py-20 text-center sm:px-10 lg:py-24">
          <h2 className="max-w-xl text-3xl sm:text-4xl">Stop losing the layout between the foreman and the crew.</h2>
          <Link href="/signup" className="btn-primary px-8">
            Start free
          </Link>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}

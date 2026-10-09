import Link from "next/link";
import { requireCompanyProfile } from "@/lib/current-profile";
import { createStickerOrder } from "./actions";
import { reprintOrder } from "../jobs/actions";
import { signedPrintUrl, signedPrintUrlIfExists } from "@/lib/print/signed-url";
import { PrintGuide } from "@/components/print-guide";
import { SubmitButton } from "@/components/submit-button";
import { StickerBanner } from "@/components/sticker-banner";
import { getStickerUsage } from "@/lib/sticker-usage";
import { jobRef } from "@/lib/job-ref";
import { FilterBar } from "@/components/filter-bar";
import { sinceMs } from "@/lib/date-range";
import type { Box, Job, StickerOrder } from "@roughcut/shared";

type SP = { error?: string; ordered?: string; need?: string; job?: string; done?: string; reprinted?: string; q?: string; range?: string };

function orderState(o: StickerOrder): { text: string; cls: string } {
  if (o.status === "ready_for_manual_print" && o.pdf_path) return { text: "Ready to print", cls: "bg-good/15 text-good" };
  if (o.status === "shipped") return { text: "Shipped", cls: "bg-good/15 text-good" };
  if (o.status === "in_production") return { text: "Printing", cls: "bg-warn/15 text-warn" };
  if (o.status === "failed") return { text: "Failed", cls: "bg-bad/15 text-bad" };
  return { text: "Not generated yet", cls: "bg-warn/15 text-warn" };
}

export default async function StickersPage({ searchParams }: { searchParams: Promise<SP> }) {
  const { profile, supabase } = await requireCompanyProfile();
  const sp = await searchParams;
  const isAdmin = profile.role === "company_admin";
  const need = Number(sp.need) || undefined;

  const [{ usage, byJob }, { data: jobs }, { data: orders }, { data: boxes }] = await Promise.all([
    getStickerUsage(supabase, profile.company_id),
    supabase.from("jobs").select("*").order("created_at", { ascending: false }).returns<Job[]>(),
    supabase.from("sticker_orders").select("*").order("created_at", { ascending: false }).returns<StickerOrder[]>(),
    supabase.from("boxes").select("job_id, sticker_order_id, short_code, status").order("short_code").limit(1000)
      .returns<Pick<Box, "job_id" | "sticker_order_id" | "short_code" | "status">[]>(),
  ]);

  // Prefill shipping from the most recent order so repeat orders are one click.
  const lastShip = (orders ?? [])[0]?.ship_to;
  const ordersByJob = new Map<string, StickerOrder[]>();
  for (const o of orders ?? []) ordersByJob.set(o.job_id, [...(ordersByJob.get(o.job_id) ?? []), o]);

  // Filters: search matches job name, address or job ID; the date range keeps
  // only orders placed in that window (and hides jobs with none).
  const q = (sp.q ?? "").trim().toLowerCase();
  const since = sinceMs(sp.range);
  const inRange = (o: StickerOrder) => since === null || new Date(o.created_at).getTime() >= since;
  const matches = (j: Job) =>
    !q || [j.name, j.address, jobRef(j.id)].some((v) => v.toLowerCase().includes(q));

  const eligible = (jobs ?? []).filter((j) => j.status === "open" || (ordersByJob.get(j.id)?.length ?? 0) > 0);
  const visible = eligible
    .filter(matches)
    .filter((j) => since === null || (ordersByJob.get(j.id) ?? []).some(inRange))
    .sort((a, b) => (a.status === b.status ? 0 : a.status === "open" ? -1 : 1));

  const urls = new Map<string, { labels: string | null; start: string | null }>();
  await Promise.all(
    (orders ?? []).map(async (o) => {
      const ready = o.status === "ready_for_manual_print" && o.pdf_path;
      urls.set(o.id, {
        labels: ready ? await signedPrintUrl(o.pdf_path!) : null,
        start: ready ? await signedPrintUrlIfExists(o.pdf_path!.replace(/labels\.pdf$/, "start-here.pdf")) : null,
      });
    })
  );

  return (
    <div>
      <h1 className="text-2xl font-bold">Stickers</h1>
      <p className="mt-1 text-muted">Order, print and track stickers for every job in one place.</p>

      <div className="mt-4">
        <StickerBanner usage={usage} isAdmin={isAdmin} variant="status" />
      </div>
      {sp.error && <p className="mt-3 text-sm text-bad">{sp.error}</p>}
      {sp.ordered && <p className="mt-3 text-sm text-good">Order placed. Download your two files below.</p>}
      {sp.reprinted && <p className="mt-3 text-sm text-good">PDFs generated. Download them below.</p>}

      <div className="mt-5">
        <FilterBar
          action="/app/stickers"
          q={sp.q}
          range={sp.range}
          rangeLabel="Ordered"
          searchPlaceholder="Job name, address or ID (J-XXXXXX)"
          shown={visible.length}
          total={eligible.length}
        />
      </div>

      <div className="mt-6 flex flex-col gap-5">
        {visible.map((job) => {
          const t = byJob.get(job.id);
          const jobOrders = (ordersByJob.get(job.id) ?? []).filter(inRange);
          const openForm = sp.job === job.id || (need !== undefined && sp.job === job.id);
          const used = t?.assigned ?? 0;
          const total = t?.total ?? 0;
          return (
            <section key={job.id} id={`job-${job.id}`} className="card p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-bold">{job.name}</h2>
                    <span className="rounded bg-dim px-2 py-0.5 font-mono text-xs text-muted">{jobRef(job.id)}</span>
                    {job.status === "closed" && (
                      <span className="rounded-full bg-line px-2 py-0.5 text-xs text-muted">Closed</span>
                    )}
                  </div>
                  <p className="text-sm text-muted">{job.address}</p>
                </div>
                <Link href={`/app/jobs/${job.id}`} className="text-sm text-accent hover:underline">
                  View job →
                </Link>
              </div>

              <div className="mt-4 grid grid-cols-3 gap-3 text-center">
                {[
                  ["Ordered", total],
                  ["Used", used],
                  ["Unused", t?.unassigned ?? 0],
                ].map(([label, n]) => (
                  <div key={label as string} className="rounded-lg bg-dim p-3">
                    <p className="font-display text-2xl font-extrabold">{n}</p>
                    <p className="text-xs text-muted">{label}</p>
                  </div>
                ))}
              </div>

              <div className="mt-4 flex flex-col gap-2">
                {
                  jobOrders.map((o) => {
                    const st = orderState(o);
                    const labelsUrl = urls.get(o.id)?.labels ?? null;
                    const startUrl = urls.get(o.id)?.start ?? null;
                    const mine = (boxes ?? []).filter((b) => b.sticker_order_id === o.id);
                    const range = mine.length ? `${mine[0]!.short_code} to ${mine[mine.length - 1]!.short_code}` : null;
                    const stuck = !labelsUrl && o.status !== "shipped" && o.status !== "in_production";
                    return (
                      <div key={o.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-line p-3 text-sm">
                        <div>
                          <p className="font-semibold">
                            {o.quantity} stickers{range ? ` · ${range}` : ""}{" "}
                            <span className={"ml-1 rounded-full px-2 py-0.5 text-xs font-medium " + st.cls}>{st.text}</span>
                          </p>
                          <p className="mt-0.5 text-xs text-muted">
                            {new Date(o.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                            {o.tracking_number ? ` · Tracking ${o.tracking_number}` : ""}
                          </p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          {startUrl && <a href={startUrl} target="_blank" rel="noopener noreferrer" className="btn-outline">1. Start here</a>}
                          {labelsUrl && <a href={labelsUrl} target="_blank" rel="noopener noreferrer" className="btn-outline">{startUrl ? "2. Stickers" : "Download PDF"}</a>}
                          {isAdmin && (stuck || labelsUrl) && (
                            <form action={reprintOrder}>
                              <input type="hidden" name="orderId" value={o.id} />
                              <input type="hidden" name="jobId" value={job.id} />
                              <input type="hidden" name="returnTo" value="/app/stickers" />
                              <SubmitButton
                                pendingText="Generating…"
                                className={stuck || !startUrl ? "btn-primary" : "text-xs text-muted hover:text-ink hover:underline"}
                              >
                                {stuck ? "Generate PDFs" : !startUrl ? "Update to new format" : "Regenerate"}
                              </SubmitButton>
                            </form>
                          )}
                        </div>
                      </div>
                    );
                  })
                }
                {jobOrders.length === 0 && <p className="text-sm text-muted">No stickers ordered for this job yet.</p>}
              </div>

              {isAdmin && job.status === "open" && (
                <details className="mt-4" open={openForm}>
                  <summary className="btn-primary inline-block cursor-pointer list-none">
                    {jobOrders.length ? "Order more stickers" : "Order stickers"}
                  </summary>
                  <form action={createStickerOrder} className="mt-4 flex flex-col gap-3">
                    <input type="hidden" name="jobId" value={job.id} />
                    {need && sp.job === job.id && usage.remaining !== null && (
                      <div className="rounded-lg border border-warn/40 bg-warn/10 p-3 text-sm">
                        <p className="font-semibold text-warn">
                          That order needs {need} stickers; you have {usage.remaining} left.
                        </p>
                        <p className="mt-1 text-muted">
                          Order {usage.remaining >= 10 ? `up to ${usage.remaining}` : "fewer"} or upgrade your plan to
                          unlock more.{" "}
                          <Link href="/pricing?reason=stickers" className="font-semibold text-accent hover:underline">
                            See plans
                          </Link>
                        </p>
                      </div>
                    )}
                    <label className="text-xs font-semibold uppercase tracking-wide text-muted">
                      How many stickers? (10 to 500)
                      <input className="input mt-1 normal-case" name="quantity" type="number" min={10} max={500} defaultValue={need ?? 10} required />
                    </label>
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted">Ship to (used if stickers are printed for you)</p>
                    <input className="input" name="shipName" placeholder="Name" defaultValue={lastShip?.name ?? profile.full_name} required />
                    <input className="input" name="shipAddress" placeholder="Address" defaultValue={lastShip?.address ?? ""} required />
                    <div className="grid grid-cols-2 gap-3">
                      <input className="input" name="shipCity" placeholder="City" defaultValue={lastShip?.city ?? ""} required />
                      <input className="input" name="shipRegion" placeholder="State" defaultValue={lastShip?.region ?? ""} required />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <input className="input" name="shipPostal" placeholder="Postal code" defaultValue={lastShip?.postal_code ?? ""} required />
                      <input className="input" name="shipCountry" placeholder="Country" defaultValue={lastShip?.country ?? "US"} required />
                    </div>
                    <SubmitButton pendingText="Placing order…">Place order</SubmitButton>
                  </form>
                </details>
              )}
              {!isAdmin && job.status === "open" && (
                <p className="mt-4 text-sm text-muted">Ask your company admin to order stickers for this job.</p>
              )}
            </section>
          );
        })}
        {visible.length === 0 && (
          <div className="card p-6">
            {eligible.length === 0 ? (
              <>
                <p className="font-semibold">Create a job first</p>
                <p className="mt-1 text-sm text-muted">Stickers belong to a job, so start by adding one.</p>
                <Link href="/app/jobs" className="btn-primary mt-4 inline-block">
                  Go to Jobs
                </Link>
              </>
            ) : (
              <>
                <p className="font-semibold">No jobs match those filters</p>
                <Link href="/app/stickers" className="btn-outline mt-4 inline-block">
                  Clear filters
                </Link>
              </>
            )}
          </div>
        )}
      </div>

      <div className="mt-8 max-w-2xl">
        <PrintGuide />
      </div>
    </div>
  );
}

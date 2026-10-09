import Link from "next/link";
import { notFound } from "next/navigation";
import { requireCompanyProfile } from "@/lib/current-profile";
import { closeJob, reprintOrder } from "../actions";
import { signedPrintUrl, signedPrintUrlIfExists } from "@/lib/print/signed-url";
import { jobRef } from "@/lib/job-ref";
import { SubmitButton } from "@/components/submit-button";
import { BOX_TYPE_LABELS, type Box, type Job, type StickerOrder } from "@roughcut/shared";

const BOX_PILL: Record<Box["status"], { text: string; cls: string }> = {
  open: { text: "Waiting for scan", cls: "bg-line text-muted" },
  specified: { text: "Specified", cls: "bg-warn/15 text-warn" },
  installed: { text: "Installed", cls: "bg-good/15 text-good" },
};

function Tile({ label, value, hint }: { label: string; value: number; hint: string }) {
  return (
    <div className="card p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted">{label}</p>
      <p className="mt-1 font-display text-3xl font-extrabold">{value}</p>
      <p className="mt-1 text-xs text-muted">{hint}</p>
    </div>
  );
}

export default async function JobDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; reprinted?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const { profile, supabase } = await requireCompanyProfile();

  const { data: job } = await supabase.from("jobs").select("*").eq("id", id).maybeSingle<Job>();
  if (!job) notFound();

  const [{ data: boxes }, { data: orders }] = await Promise.all([
    supabase.from("boxes").select("*").eq("job_id", id).order("short_code").returns<Box[]>(),
    supabase
      .from("sticker_orders")
      .select("*")
      .eq("job_id", id)
      .order("created_at", { ascending: false })
      .returns<StickerOrder[]>(),
  ]);
  const all = boxes ?? [];

  const orderRows = await Promise.all(
    (orders ?? []).map(async (order) => {
      const mine = all.filter((b) => b.sticker_order_id === order.id);
      const ready = order.pdf_path && order.status === "ready_for_manual_print";
      return {
        order,
        count: mine.length,
        used: mine.filter((b) => b.status !== "open").length,
        first: mine[0]?.short_code,
        last: mine[mine.length - 1]?.short_code,
        labelsUrl: ready ? await signedPrintUrl(order.pdf_path!) : null,
        startUrl: ready ? await signedPrintUrlIfExists(order.pdf_path!.replace(/labels\.pdf$/, "start-here.pdf")) : null,
      };
    })
  );

  const isAdmin = profile.role === "company_admin";
  const canManage = isAdmin || profile.role === "foreman";
  const isOpen = job.status === "open";

  const total = all.length;
  const unassigned = all.filter((b) => b.status === "open").length;
  const specified = all.filter((b) => b.status === "specified").length;
  const installed = all.filter((b) => b.status === "installed").length;
  const assigned = total - unassigned;
  const pct = total ? Math.round((installed / total) * 100) : 0;
  const latest = orderRows.find((r) => r.labelsUrl || r.startUrl);

  // The single most useful thing to do right now.
  type Next = { title: string; body: string; cta?: { href: string; label: string }; extra?: React.ReactNode };
  let next: Next;
  if (!isOpen) {
    next = { title: "This job is closed", body: "No more changes are expected. Existing boxes stay on record." };
  } else if (total === 0) {
    next = {
      title: "Step 1: Order stickers for this job",
      body: "Each sticker gets its own QR code. Your crew sticks one on every box, then scans it with the app to log what it is.",
      cta: isAdmin
        ? { href: `/app/stickers?job=${job.id}`, label: "Order stickers" }
        : undefined,
      extra: !isAdmin ? <p className="text-sm text-muted">Ask your company admin to order stickers.</p> : undefined,
    };
  } else if (assigned === 0) {
    next = {
      title: "Step 2: Print your stickers and put them on boxes",
      body: "Download both files below. Print the Start here page on plain paper and the Stickers file on label sheets. Then scan each box with the RoughCUT app to log it.",
      cta: latest?.startUrl
        ? { href: latest.startUrl, label: "Download Start here" }
        : latest?.labelsUrl
          ? { href: latest.labelsUrl, label: "Download stickers" }
          : undefined,
    };
  } else if (installed === total) {
    next = {
      title: "All boxes are installed",
      body: "Everything on this job is done. Close it to keep your active job list clean.",
    };
  } else if (specified > 0) {
    next = {
      title: `${specified} box${specified === 1 ? "" : "es"} specified, ready to install`,
      body: "Installers scan each box with the app and mark it installed once it is in the wall.",
    };
  } else {
    next = {
      title: "Keep scanning boxes",
      body: `${unassigned} sticker${unassigned === 1 ? "" : "s"} still unused. Scan a sticker on site to log the box type, size, height and circuit.`,
    };
  }
  const readyToClose = isOpen && total > 0 && installed === total;

  return (
    <div>
      <Link href="/app/jobs" className="text-sm text-muted hover:text-ink">
        ← All jobs
      </Link>

      <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">{job.name}</h1>
            <span
              className={
                "rounded-full px-3 py-1 text-xs font-medium " +
                (isOpen ? "bg-good/15 text-good" : "bg-line text-muted")
              }
            >
              {isOpen ? "Open" : "Closed"}
            </span>
          </div>
          <p className="mt-1 text-muted">
            {job.address} · <span className="font-mono text-xs">{jobRef(job.id)}</span>
          </p>
        </div>
        {canManage && isOpen && (
          <form action={closeJob}>
            <input type="hidden" name="jobId" value={job.id} />
            <SubmitButton
              pendingText="Closing…"
              className={readyToClose ? "btn-primary" : "btn-outline"}
              confirmMessage="Close this job? You won't be able to order more stickers for it."
            >
              Close job
            </SubmitButton>
          </form>
        )}
      </div>

      {sp.error && <p className="mt-3 text-sm text-bad">{sp.error}</p>}
      {sp.reprinted && <p className="mt-3 text-sm text-good">Reprinted. Download the fresh PDFs below.</p>}

      <div className="card mt-6 border-accent/40 bg-accent-soft p-5">
        <p className="eyebrow">What to do next</p>
        <h2 className="mt-1 text-lg font-bold">{next.title}</h2>
        <p className="mt-1 max-w-2xl text-sm text-muted">{next.body}</p>
        {next.extra}
        <div className="mt-4 flex flex-wrap gap-3">
          {next.cta && (
            <a
              href={next.cta.href}
              {...(next.cta.href.startsWith("http") ? { target: "_blank", rel: "noopener noreferrer" } : {})}
              className="btn-primary"
            >
              {next.cta.label}
            </a>
          )}
          {isOpen && total > 0 && assigned === 0 && latest?.labelsUrl && latest.startUrl && (
            <a href={latest.labelsUrl} target="_blank" rel="noopener noreferrer" className="btn-outline">
              Download stickers
            </a>
          )}
          {isOpen && total > 0 && (
            <Link href="/get" className="btn-outline">
              Get the iPhone app
            </Link>
          )}
          {readyToClose && (
            <p className="self-center text-sm text-muted">Use “Close job” at the top right when you're ready.</p>
          )}
        </div>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Tile label="Stickers" value={total} hint="ordered for this job" />
        <Tile label="Unused" value={unassigned} hint="waiting for a scan" />
        <Tile label="Specified" value={specified} hint="logged, not installed" />
        <Tile label="Installed" value={installed} hint="done" />
      </div>
      {total > 0 && (
        <div className="mt-4">
          <div className="flex justify-between text-xs text-muted">
            <span>Install progress</span>
            <span>{pct}%</span>
          </div>
          <div className="mt-1 h-2 overflow-hidden rounded-full bg-line">
            <div className="h-full rounded-full bg-good" style={{ width: `${pct}%` }} />
          </div>
        </div>
      )}

      <section id="stickers" className="mt-10">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">Sticker orders</h2>
          {isAdmin && isOpen && total > 0 && (
            <Link href={`/app/stickers?job=${job.id}`} className="btn-outline">
              Order more stickers
            </Link>
          )}
        </div>
        <div className="mt-3 flex flex-col gap-2">
          {orderRows.map(({ order, count, used, first, last, labelsUrl, startUrl }) => (
            <div key={order.id} className="card flex flex-wrap items-center justify-between gap-3 p-4 text-sm">
              <div>
                <p className="font-semibold">
                  {count || order.quantity} stickers
                  {first && last ? ` · ${first} to ${last}` : ""}
                </p>
                <p className="mt-1 text-muted">
                  {used} used · {count - used} unused ·{" "}
                  {new Date(order.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {startUrl && (
                  <a href={startUrl} target="_blank" rel="noopener noreferrer" className="btn-outline">
                    1. Start here
                  </a>
                )}
                {labelsUrl && (
                  <a href={labelsUrl} target="_blank" rel="noopener noreferrer" className="btn-outline">
                    {startUrl ? "2. Stickers" : "Download PDF"}
                  </a>
                )}
                {isAdmin && (
                  <form action={reprintOrder}>
                    <input type="hidden" name="orderId" value={order.id} />
                    <input type="hidden" name="jobId" value={job.id} />
                    <SubmitButton pendingText="Reprinting…" className="text-xs text-muted hover:text-ink hover:underline">
                      {labelsUrl && !startUrl ? "Reprint in new format" : "Regenerate PDFs"}
                    </SubmitButton>
                  </form>
                )}
              </div>
            </div>
          ))}
          {orderRows.length === 0 && (
            <div className="card p-5 text-sm text-muted">
              No stickers ordered for this job yet.
              {isAdmin && isOpen && (
                <div className="mt-3">
                  <Link href={`/app/stickers?job=${job.id}`} className="btn-primary">
                    Order stickers
                  </Link>
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-bold">Boxes</h2>
        <div className="mt-3 flex flex-col gap-2">
          {all.map((box) => (
            <div key={box.id} className="card flex items-center justify-between p-4">
              <div>
                <p className="font-semibold">
                  {box.short_code}
                  <span className="ml-2 font-normal text-muted">
                    {box.box_type ? BOX_TYPE_LABELS[box.box_type] : "Not logged yet"}
                    {box.size ? ` · ${box.size}` : ""}
                  </span>
                </p>
                <p className="text-sm text-muted">
                  {box.circuit ? `Circuit ${box.circuit}` : "Scan the sticker with the app to log this box"}
                  {box.height_aff ? ` · ${box.height_aff} AFF` : ""}
                </p>
              </div>
              <span className={"rounded-full px-3 py-1 text-xs font-medium " + BOX_PILL[box.status].cls}>
                {BOX_PILL[box.status].text}
              </span>
            </div>
          ))}
          {all.length === 0 && <p className="text-sm text-muted">Boxes appear here as soon as stickers are ordered.</p>}
        </div>
      </section>
    </div>
  );
}

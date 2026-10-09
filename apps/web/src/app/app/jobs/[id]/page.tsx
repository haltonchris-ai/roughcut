import Link from "next/link";
import { notFound } from "next/navigation";
import { requireCompanyProfile } from "@/lib/current-profile";
import { closeJob, reprintOrder } from "../actions";
import { signedPrintUrl } from "@/lib/print/signed-url";
import { SubmitButton } from "@/components/submit-button";
import type { StickerOrder } from "@roughcut/shared";
import { BOX_TYPE_LABELS, type Box, type Job } from "@roughcut/shared";

const STATUS_STYLE: Record<Box["status"], string> = {
  open: "bg-line text-muted",
  specified: "bg-warn/15 text-warn",
  installed: "bg-good/15 text-good",
};

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

  const { data: boxes } = await supabase
    .from("boxes")
    .select("*")
    .eq("job_id", id)
    .order("short_code")
    .returns<Box[]>();

  const { data: orders } = await supabase
    .from("sticker_orders")
    .select("*")
    .eq("job_id", id)
    .order("created_at", { ascending: false })
    .returns<StickerOrder[]>();

  const orderRows = await Promise.all(
    (orders ?? []).map(async (order) => {
      const mine = (boxes ?? []).filter((b) => b.sticker_order_id === order.id);
      const ready = order.pdf_path && order.status === "ready_for_manual_print";
      return {
        order,
        count: mine.length,
        used: mine.filter((b) => b.status !== "open").length,
        first: mine[0]?.short_code,
        last: mine[mine.length - 1]?.short_code,
        labelsUrl: ready ? await signedPrintUrl(order.pdf_path!) : null,
        startUrl: ready ? await signedPrintUrl(order.pdf_path!.replace(/labels\.pdf$/, "start-here.pdf")) : null,
      };
    })
  );
  const isAdmin = profile.role === "company_admin";

  const total = boxes?.length ?? 0;
  const installed = boxes?.filter((b) => b.status === "installed").length ?? 0;
  const canManage = profile.role === "company_admin" || profile.role === "foreman";

  return (
    <div>
      <Link href="/app/jobs" className="text-sm text-muted hover:text-ink">
        ← Jobs
      </Link>
      <div className="mt-2 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{job.name}</h1>
          <p className="text-muted">{job.address}</p>
        </div>
        {canManage && job.status === "open" && (
          <form action={closeJob}>
            <input type="hidden" name="jobId" value={job.id} />
            <button className="rounded-lg border border-line px-4 py-2 text-sm hover:border-accent" type="submit">
              Close job
            </button>
          </form>
        )}
      </div>

      <p className="mt-4 text-sm text-muted">
        {installed} of {total} boxes installed
      </p>

      {sp.error && <p className="mt-3 text-sm text-bad">{sp.error}</p>}
      {sp.reprinted && <p className="mt-3 text-sm text-good">Reprinted. Download the fresh PDFs below.</p>}

      <section id="stickers" className="mt-8">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">Stickers</h2>
          {isAdmin && job.status === "open" && (
            <Link href={`/app/stickers?job=${job.id}`} className="text-sm text-accent hover:underline">
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
                  {used} assigned · {count - used} unassigned ·{" "}
                  {new Date(order.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                </p>
              </div>
              <div className="flex flex-col items-end gap-1">
                {startUrl && (
                  <a href={startUrl} className="text-accent hover:underline">
                    1. Start here (plain paper)
                  </a>
                )}
                {labelsUrl && (
                  <a href={labelsUrl} className="text-accent hover:underline">
                    {startUrl ? "2. Stickers (label sheets)" : "Download PDF"}
                  </a>
                )}
                {isAdmin && (
                  <form action={reprintOrder}>
                    <input type="hidden" name="orderId" value={order.id} />
                    <input type="hidden" name="jobId" value={job.id} />
                    <SubmitButton
                      pendingText="Reprinting…"
                      className="text-xs text-muted hover:text-ink hover:underline"
                    >
                      {labelsUrl && !startUrl ? "Reprint in new format" : "Regenerate PDFs"}
                    </SubmitButton>
                  </form>
                )}
              </div>
            </div>
          ))}
          {orderRows.length === 0 && (
            <p className="text-muted">
              No stickers ordered for this job yet.{" "}
              {isAdmin && (
                <Link href={`/app/stickers?job=${job.id}`} className="text-accent hover:underline">
                  Order stickers
                </Link>
              )}
            </p>
          )}
        </div>
      </section>

      <h2 className="mt-8 text-lg font-bold">Boxes</h2>
      <div className="mt-3 flex flex-col gap-2">
        {(boxes ?? []).map((box) => (
          <div key={box.id} className="card flex items-center justify-between p-4">
            <div>
              <p className="font-semibold">{box.box_type ? BOX_TYPE_LABELS[box.box_type] : "Not specified yet"}</p>
              <p className="text-sm text-muted">
                {box.short_code} · {box.circuit ?? "—"}
              </p>
            </div>
            <span className={"rounded-full px-3 py-1 text-xs font-medium " + STATUS_STYLE[box.status]}>
              {box.status}
            </span>
          </div>
        ))}
        {(boxes ?? []).length === 0 && (
          <p className="text-muted">
            No boxes yet. Order stickers from the{" "}
            <Link href="/app/stickers" className="text-accent hover:underline">
              Stickers
            </Link>{" "}
            page, or scan a new sticker from the mobile app on site.
          </p>
        )}
      </div>
    </div>
  );
}

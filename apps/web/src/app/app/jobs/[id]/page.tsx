import Link from "next/link";
import { notFound } from "next/navigation";
import { requireCompanyProfile } from "@/lib/current-profile";
import { closeJob } from "../actions";
import { BOX_TYPE_LABELS, type Box, type Job } from "@roughcut/shared";

const STATUS_STYLE: Record<Box["status"], string> = {
  open: "bg-line text-muted",
  specified: "bg-warn/15 text-warn",
  installed: "bg-good/15 text-good",
};

export default async function JobDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { profile, supabase } = await requireCompanyProfile();

  const { data: job } = await supabase.from("jobs").select("*").eq("id", id).maybeSingle<Job>();
  if (!job) notFound();

  const { data: boxes } = await supabase
    .from("boxes")
    .select("*")
    .eq("job_id", id)
    .order("short_code")
    .returns<Box[]>();

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

      <div className="mt-6 flex flex-col gap-2">
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

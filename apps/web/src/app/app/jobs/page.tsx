import Link from "next/link";
import { requireCompanyProfile } from "@/lib/current-profile";
import { createJob, deleteJob } from "./actions";
import { SubmitButton } from "@/components/submit-button";
import { getStickerUsage } from "@/lib/sticker-usage";
import { StickerBanner } from "@/components/sticker-banner";
import { jobNextStep } from "@/lib/job-progress";
import { FilterBar } from "@/components/filter-bar";
import { sinceMs } from "@/lib/date-range";
import { jobRef } from "@/lib/job-ref";
import type { Job } from "@roughcut/shared";

export default async function JobsPage({ searchParams }: { searchParams: Promise<{ error?: string; q?: string; range?: string; status?: string }> }) {
  const { profile, supabase } = await requireCompanyProfile();
  const sp = await searchParams;
  const { error } = sp;

  const { data: jobs } = await supabase
    .from("jobs")
    .select("*")
    .order("created_at", { ascending: false })
    .returns<Job[]>();

  const { usage, byJob } = await getStickerUsage(supabase, profile.company_id);
  const allJobs = jobs ?? [];
  const q = (sp.q ?? "").trim().toLowerCase();
  const since = sinceMs(sp.range);
  const filtered = allJobs.filter(
    (j) =>
      (!q || [j.name, j.address, jobRef(j.id)].some((v) => v.toLowerCase().includes(q))) &&
      (!sp.status || j.status === sp.status) &&
      (since === null || new Date(j.created_at).getTime() >= since)
  );
  const canDelete = profile.role === "company_admin";
  const canCreate = profile.role === "company_admin" || profile.role === "foreman";

  return (
    <div className="grid gap-8 sm:grid-cols-[2fr_1fr]">
      <div>
        <h1 className="text-2xl font-bold">Jobs</h1>
        <div className="mt-3">
          <StickerBanner usage={usage} isAdmin={profile.role === "company_admin"} variant="status" />
        </div>
        {error && <p className="mt-3 text-sm text-bad">{error}</p>}
        <div className="mt-4">
          <FilterBar
            action="/app/jobs"
            q={sp.q}
            range={sp.range}
            status={sp.status}
            withStatus
            rangeLabel="Created"
            searchPlaceholder="Job name, address or ID"
            shown={filtered.length}
            total={allJobs.length}
          />
        </div>
        <div className="mt-6 flex flex-col gap-3">
          {filtered.map((job) => (
            <div key={job.id} className="card flex items-center gap-3 p-4 hover:border-accent">
              <Link href={`/app/jobs/${job.id}`} className="flex flex-1 items-center justify-between">
                <div>
                  <p className="font-semibold">
                    {job.name} <span className="ml-1 font-mono text-xs font-normal text-muted">{jobRef(job.id)}</span>
                  </p>
                  <p className="text-sm text-muted">{job.address}</p>
                  {(() => {
                    const t = byJob.get(job.id);
                    const n = jobNextStep(job.status, t);
                    return (
                      <p
                        className={
                          "mt-1 text-xs " +
                          (n.tone === "todo" ? "font-semibold text-accent" : n.tone === "done" ? "text-good" : "text-muted")
                        }
                      >
                        {n.label}
                        {t && t.total > 0 ? ` · ${t.total} stickers` : ""}
                      </p>
                    );
                  })()}
                </div>
                <span
                  className={
                    "rounded-full px-3 py-1 text-xs font-medium " +
                    (job.status === "open" ? "bg-good/15 text-good" : "bg-line text-muted")
                  }
                >
                  {job.status}
                </span>
              </Link>
              <Link href={`/app/jobs/${job.id}#stickers`} className="whitespace-nowrap text-xs text-accent hover:underline">
                {byJob.has(job.id) ? "Open" : "Order stickers"}
              </Link>
              {canDelete && (
                <form action={deleteJob}>
                  <input type="hidden" name="jobId" value={job.id} />
                  <SubmitButton
                    pendingText="Deleting…"
                    className="rounded-lg border border-line px-3 py-1 text-xs text-bad hover:border-bad"
                    confirmMessage={`Delete "${job.name}" at ${job.address}? This can't be undone.`}
                  >
                    Delete
                  </SubmitButton>
                </form>
              )}
            </div>
          ))}
          {allJobs.length === 0 && <p className="text-muted">No jobs yet. Create your first job on the right.</p>}
          {allJobs.length > 0 && filtered.length === 0 && <p className="text-muted">No jobs match those filters.</p>}
        </div>
      </div>

      {canCreate && (
        <div className="card p-5">
          <h2 className="font-semibold">New job</h2>
          <form action={createJob} className="mt-4 flex flex-col gap-3">
            <input className="input" name="name" placeholder="Job name" required />
            <input className="input" name="address" placeholder="Address" required />
            <SubmitButton pendingText="Creating…">Create job</SubmitButton>
          </form>
        </div>
      )}
    </div>
  );
}

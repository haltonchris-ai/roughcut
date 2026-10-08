import Link from "next/link";
import { requireCompanyProfile } from "@/lib/current-profile";
import { createJob } from "./actions";
import type { Job } from "@roughcut/shared";

export default async function JobsPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { profile, supabase } = await requireCompanyProfile();
  const { error } = await searchParams;

  const { data: jobs } = await supabase
    .from("jobs")
    .select("*")
    .order("created_at", { ascending: false })
    .returns<Job[]>();

  const canCreate = profile.role === "company_admin" || profile.role === "foreman";

  return (
    <div className="grid gap-8 sm:grid-cols-[2fr_1fr]">
      <div>
        <h1 className="text-2xl font-bold">Jobs</h1>
        {error && <p className="mt-3 text-sm text-bad">{error}</p>}
        <div className="mt-6 flex flex-col gap-3">
          {(jobs ?? []).map((job) => (
            <Link
              key={job.id}
              href={`/app/jobs/${job.id}`}
              className="card flex items-center justify-between p-4 hover:border-accent"
            >
              <div>
                <p className="font-semibold">{job.name}</p>
                <p className="text-sm text-muted">{job.address}</p>
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
          ))}
          {(jobs ?? []).length === 0 && <p className="text-muted">No jobs yet.</p>}
        </div>
      </div>

      {canCreate && (
        <div className="card p-5">
          <h2 className="font-semibold">New job</h2>
          <form action={createJob} className="mt-4 flex flex-col gap-3">
            <input className="input" name="name" placeholder="Job name" required />
            <input className="input" name="address" placeholder="Address" required />
            <button type="submit" className="btn-primary">
              Create job
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

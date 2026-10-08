import { supabase } from "@/lib/supabase";
import { cacheJobs, getCachedJob, getCachedJobs } from "@/lib/offline/cache";
import type { Job } from "@roughcut/shared";

// Cache-first-on-failure: try the network, and on any error (most commonly
// "offline") fall back to whatever was last cached in sqlite, per spec
// ("jobs and boxes cache in sqlite").
export async function listJobs(): Promise<Job[]> {
  try {
    const { data, error } = await supabase.from("jobs").select("*").order("created_at", { ascending: false });
    if (error) throw error;
    const jobs = (data ?? []) as Job[];
    await cacheJobs(jobs);
    return jobs;
  } catch {
    return getCachedJobs();
  }
}

export async function getJob(jobId: string): Promise<Job | null> {
  try {
    const { data, error } = await supabase.from("jobs").select("*").eq("id", jobId).maybeSingle();
    if (error) throw error;
    if (data) await cacheJobs([data as Job]);
    return (data as Job) ?? null;
  } catch {
    return getCachedJob(jobId);
  }
}

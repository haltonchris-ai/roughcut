import { getDb } from "./db";
import type { Box, Job } from "@roughcut/shared";

export async function cacheJobs(jobs: Job[]): Promise<void> {
  const db = await getDb();
  await db.withTransactionAsync(async () => {
    for (const job of jobs) {
      await db.runAsync("INSERT OR REPLACE INTO cached_jobs (id, data) VALUES (?, ?)", job.id, JSON.stringify(job));
    }
  });
}

export async function getCachedJobs(): Promise<Job[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<{ data: string }>("SELECT data FROM cached_jobs");
  return rows
    .map((r) => JSON.parse(r.data) as Job)
    .sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
}

export async function getCachedJob(jobId: string): Promise<Job | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ data: string }>("SELECT data FROM cached_jobs WHERE id = ?", jobId);
  return row ? (JSON.parse(row.data) as Job) : null;
}

export async function cacheBoxes(jobId: string, boxes: Box[]): Promise<void> {
  const db = await getDb();
  await db.withTransactionAsync(async () => {
    for (const box of boxes) {
      await db.runAsync(
        "INSERT OR REPLACE INTO cached_boxes (id, job_id, public_code, data) VALUES (?, ?, ?, ?)",
        box.id,
        box.job_id,
        box.public_code,
        JSON.stringify(box)
      );
    }
  });
}

export async function cacheBox(box: Box): Promise<void> {
  await cacheBoxes(box.job_id, [box]);
}

export async function getCachedBoxesForJob(jobId: string): Promise<Box[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<{ data: string }>("SELECT data FROM cached_boxes WHERE job_id = ?", jobId);
  return rows.map((r) => JSON.parse(r.data) as Box).sort((a, b) => a.short_code.localeCompare(b.short_code));
}

export async function getCachedBox(boxId: string): Promise<Box | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ data: string }>("SELECT data FROM cached_boxes WHERE id = ?", boxId);
  return row ? (JSON.parse(row.data) as Box) : null;
}

export async function getCachedBoxByPublicCode(publicCode: string): Promise<Box | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ data: string }>(
    "SELECT data FROM cached_boxes WHERE public_code = ?",
    publicCode
  );
  return row ? (JSON.parse(row.data) as Box) : null;
}

// Merges a locally-applied change into the cache immediately (optimistic
// update) so the UI reflects it before the write queue has synced.
export async function applyLocalBoxPatch(boxId: string, patch: Partial<Box>): Promise<Box | null> {
  const existing = await getCachedBox(boxId);
  if (!existing) return null;
  const merged = { ...existing, ...patch, updated_at: new Date().toISOString() };
  await cacheBox(merged);
  return merged;
}

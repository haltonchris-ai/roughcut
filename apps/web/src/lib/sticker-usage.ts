import "server-only";
import { PLAN_LIMITS, PLAN_PRICING } from "@roughcut/shared";
import type { CompanyPlan } from "@roughcut/shared";
import type { createClient } from "@/lib/supabase/server";

type Db = Awaited<ReturnType<typeof createClient>>;

export type StickerLevel = "unlimited" | "ok" | "low" | "out";

export interface StickerUsage {
  plan: CompanyPlan;
  limit: number | null; // plan cap on stickers (boxes) ever created
  total: number; // stickers created so far
  assigned: number; // specified or installed
  unassigned: number; // printed/minted but not yet used
  remaining: number | null; // allowance left on the plan (null = unlimited)
  level: StickerLevel;
  nextPlan: CompanyPlan | null;
  nextPlanLimit: number | null | undefined;
  nextPlanPrice: number | null;
}

const NEXT: Record<CompanyPlan, CompanyPlan | null> = { free: "crew", crew: "company", company: null };

// Warn at 20% left, but never later than 5 stickers from the cap.
export function lowThreshold(limit: number): number {
  return Math.max(5, Math.ceil(limit * 0.2));
}

export interface JobTally {
  total: number;
  assigned: number; // specified or installed
  unassigned: number;
  installed: number;
}

// PostgREST returns at most 1000 rows per request, so page through.
async function allBoxStatuses(supabase: Db): Promise<{ job_id: string; status: string }[]> {
  const out: { job_id: string; status: string }[] = [];
  for (let from = 0; ; from += 1000) {
    const { data } = await supabase
      .from("boxes")
      .select("job_id, status")
      .order("id")
      .range(from, from + 999);
    if (!data || data.length === 0) break;
    out.push(...(data as { job_id: string; status: string }[]));
    if (data.length < 1000) break;
  }
  return out;
}

export async function getStickerUsage(
  supabase: Db,
  companyId: string | null
): Promise<{ usage: StickerUsage; byJob: Map<string, JobTally> }> {
  const [{ data: company }, boxes] = await Promise.all([
    supabase.from("companies").select("plan").eq("id", companyId ?? "").single<{ plan: CompanyPlan }>(),
    allBoxStatuses(supabase),
  ]);
  const plan: CompanyPlan = company?.plan ?? "free";
  const limit = PLAN_LIMITS[plan].maxBoxes;

  const byJob = new Map<string, JobTally>();
  let assigned = 0;
  for (const b of boxes) {
    const t = byJob.get(b.job_id) ?? { total: 0, assigned: 0, unassigned: 0, installed: 0 };
    t.total++;
    if (b.status === "installed") t.installed++;
    if (b.status === "open") t.unassigned++;
    else {
      t.assigned++;
      assigned++;
    }
    byJob.set(b.job_id, t);
  }

  const total = boxes.length;
  const remaining = limit === null ? null : Math.max(0, limit - total);
  let level: StickerLevel = "unlimited";
  if (limit !== null) {
    level = remaining === 0 ? "out" : remaining! <= lowThreshold(limit) ? "low" : "ok";
  }
  const nextPlan = NEXT[plan];
  return {
    usage: {
      plan,
      limit,
      total,
      assigned,
      unassigned: total - assigned,
      remaining,
      level,
      nextPlan,
      nextPlanLimit: nextPlan ? PLAN_LIMITS[nextPlan].maxBoxes : undefined,
      nextPlanPrice: nextPlan ? PLAN_PRICING[nextPlan].monthlyUsd : null,
    },
    byJob,
  };
}

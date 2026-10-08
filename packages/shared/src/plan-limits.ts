import type { CompanyPlan } from "./enums";

// Mirrors public.plan_limits() in supabase/migrations/0003_functions_triggers.sql.
// null = unlimited. Keep both copies in sync by hand (see DECISIONS.md).
export interface PlanLimits {
  maxActiveJobs: number | null;
  maxBoxes: number | null;
  maxUsers: number | null;
  stickerShipping: boolean; // Diginate submission allowed; false = PDF only
}

export const PLAN_LIMITS: Record<CompanyPlan, PlanLimits> = {
  free: { maxActiveJobs: 3, maxBoxes: 25, maxUsers: 2, stickerShipping: false },
  crew: { maxActiveJobs: 15, maxBoxes: 300, maxUsers: 8, stickerShipping: true },
  company: { maxActiveJobs: null, maxBoxes: null, maxUsers: 40, stickerShipping: true },
};

export const PLAN_PRICING: Record<CompanyPlan, { monthlyUsd: number | null }> = {
  free: { monthlyUsd: 0 },
  crew: { monthlyUsd: 49 },
  company: { monthlyUsd: 149 },
};

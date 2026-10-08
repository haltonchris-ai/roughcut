// Mirrors the Postgres enums in supabase/migrations/0001_extensions_enums.sql.
// Keep these in sync by hand — see DECISIONS.md ("hand-written DB types").

export const USER_ROLES = ["platform_owner", "company_admin", "foreman", "installer"] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const COMPANY_PLANS = ["free", "crew", "company"] as const;
export type CompanyPlan = (typeof COMPANY_PLANS)[number];

export const JOB_STATUSES = ["open", "closed"] as const;
export type JobStatus = (typeof JOB_STATUSES)[number];

export const BOX_TYPES = [
  "single_gang",
  "double_gang",
  "round",
  "4_inch_square",
  "octagon",
  "weatherproof",
  "panel",
  "other",
] as const;
export type BoxType = (typeof BOX_TYPES)[number];

export const BOX_STATUSES = ["open", "specified", "installed"] as const;
export type BoxStatus = (typeof BOX_STATUSES)[number];

export const STICKER_ORDER_STATUSES = [
  "draft",
  "submitted",
  "in_production",
  "shipped",
  "failed",
  "ready_for_manual_print",
] as const;
export type StickerOrderStatus = (typeof STICKER_ORDER_STATUSES)[number];

// Raw Stripe subscription statuses, plus "free" for a company with no Stripe
// subscription at all. Stored as plain text in companies.subscription_status.
export type SubscriptionStatus =
  | "free"
  | "active"
  | "trialing"
  | "past_due"
  | "canceled"
  | "unpaid"
  | "incomplete"
  | "incomplete_expired";

export const WRITE_BLOCKING_STATUSES: SubscriptionStatus[] = [
  "past_due",
  "unpaid",
  "canceled",
  "incomplete_expired",
];

export const BOX_TYPE_LABELS: Record<BoxType, string> = {
  single_gang: "Single gang",
  double_gang: "Double gang",
  round: "Round",
  "4_inch_square": "4\" square",
  octagon: "Octagon",
  weatherproof: "Weatherproof",
  panel: "Panel",
  other: "Other",
};

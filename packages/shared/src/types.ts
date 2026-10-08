import type {
  BoxStatus,
  BoxType,
  CompanyPlan,
  JobStatus,
  StickerOrderStatus,
  SubscriptionStatus,
  UserRole,
} from "./enums";

// Hand-written row types mirroring supabase/migrations/0002_tables.sql.
// There's no live Supabase project to run `supabase gen types` against yet,
// so these are maintained by hand for now — see DECISIONS.md. Once a project
// exists, regenerating from the real schema and diffing against this file is
// the safer long-term path.

export interface Company {
  id: string;
  name: string;
  plan: CompanyPlan;
  subscription_status: SubscriptionStatus;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  created_at: string;
}

export interface Profile {
  id: string;
  company_id: string | null;
  role: UserRole;
  full_name: string;
  phone: string | null;
  disabled_at: string | null;
  created_at: string;
}

export interface Job {
  id: string;
  company_id: string;
  name: string;
  address: string;
  status: JobStatus;
  created_by: string;
  created_at: string;
}

export interface Box {
  id: string;
  company_id: string;
  job_id: string;
  sticker_order_id: string | null;
  public_code: string;
  short_code: string;
  // null until a foreman specifies the box (see DECISIONS.md: sticker orders
  // mint boxes with a code before there's anything to spec).
  box_type: BoxType | null;
  size: string | null;
  height_aff: string | null;
  circuit: string | null;
  notes: string | null;
  photo_path: string | null;
  status: BoxStatus;
  specified_by: string | null;
  specified_at: string | null;
  installed_by: string | null;
  installed_at: string | null;
  updated_at: string;
}

export interface Scan {
  id: string;
  box_id: string;
  user_id: string | null;
  result: string;
  created_at: string;
}

export interface ShipTo {
  name: string;
  address: string;
  city: string;
  region: string;
  postal_code: string;
  country: string;
}

export interface StickerOrder {
  id: string;
  company_id: string;
  job_id: string;
  quantity: number;
  ship_to: ShipTo;
  status: StickerOrderStatus;
  diginate_order_id: string | null;
  tracking_number: string | null;
  pdf_path: string | null;
  created_by: string;
  created_at: string;
}

export interface PrintAsset {
  id: string;
  box_id: string;
  png_path: string;
  created_at: string;
}

export interface Invite {
  id: string;
  company_id: string;
  email: string;
  role: UserRole;
  token: string;
  expires_at: string;
  accepted_at: string | null;
  created_at: string;
}

export interface AuditLogEntry {
  id: string;
  actor_id: string | null;
  action: string;
  target_table: string | null;
  target_id: string | null;
  detail: Record<string, unknown> | null;
  created_at: string;
}

// Spec form payload shape used by both mobile (Spec form screen) and the
// offline sqlite queue — see MOBILE section of the build spec.
export interface BoxSpecInput {
  job_id: string;
  box_type: BoxType;
  size: string;
  height_aff: string;
  circuit: string;
  notes?: string;
  photo_local_uri?: string;
}

export function buildPublicUrl(webOrigin: string, publicCode: string): string {
  return `${webOrigin.replace(/\/$/, "")}/b/${publicCode}`;
}

"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requirePlatformOwner } from "@/lib/current-owner";
import { createAdminClient } from "@/lib/supabase/admin";

// Suspend sets profiles.disabled_at for every non-owner profile in the
// company and rejects writes — per spec, this never deletes data.
export async function setCompanySuspended(formData: FormData): Promise<void> {
  const { profile: owner } = await requirePlatformOwner();
  const companyId = String(formData.get("companyId") ?? "");
  const suspend = formData.get("suspend") === "true";
  if (!companyId) redirect("/admin/companies");

  const admin = createAdminClient();
  await admin
    .from("profiles")
    .update({ disabled_at: suspend ? new Date().toISOString() : null })
    .eq("company_id", companyId);

  await admin.from("audit_log").insert({
    actor_id: owner.id,
    action: suspend ? "company.suspend" : "company.unsuspend",
    target_table: "companies",
    target_id: companyId,
  });

  revalidatePath(`/admin/companies/${companyId}`);
  redirect(`/admin/companies/${companyId}`);
}

export async function reprintStickerOrder(formData: FormData): Promise<void> {
  const { profile: owner } = await requirePlatformOwner();
  const orderId = String(formData.get("orderId") ?? "");
  const companyId = String(formData.get("companyId") ?? "");
  if (!orderId) redirect(`/admin/companies/${companyId}`);

  const admin = createAdminClient();
  await admin.from("audit_log").insert({
    actor_id: owner.id,
    action: "sticker_order.reprint",
    target_table: "sticker_orders",
    target_id: orderId,
  });

  const { processStickerOrder } = await import("@/lib/print");
  await processStickerOrder(orderId);

  revalidatePath(`/admin/companies/${companyId}`);
  redirect(`/admin/companies/${companyId}`);
}

"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireCompanyProfile } from "@/lib/current-profile";
import { getStickerUsage } from "@/lib/sticker-usage";
import type { ShipTo } from "@roughcut/shared";

function friendlyError(error: { code?: string; message: string }): string {
  if (error.code === "P0402") {
    return "Plan box limit reached, or billing isn't current. Check Billing to upgrade.";
  }
  return error.message;
}

export async function createStickerOrder(formData: FormData): Promise<void> {
  const { profile, supabase } = await requireCompanyProfile();
  if (profile.role !== "company_admin") {
    redirect("/app/stickers?error=" + encodeURIComponent("Only an admin can order stickers."));
  }

  const jobId = String(formData.get("jobId") ?? "");
  const quantity = Number(formData.get("quantity") ?? 0);
  const shipTo: ShipTo = {
    name: String(formData.get("shipName") ?? "").trim(),
    address: String(formData.get("shipAddress") ?? "").trim(),
    city: String(formData.get("shipCity") ?? "").trim(),
    region: String(formData.get("shipRegion") ?? "").trim(),
    postal_code: String(formData.get("shipPostal") ?? "").trim(),
    country: String(formData.get("shipCountry") ?? "US").trim(),
  };

  if (!jobId || quantity < 10 || quantity > 500) {
    redirect("/app/stickers?error=" + encodeURIComponent("Pick a job and a quantity between 10 and 500."));
  }
  if (!shipTo.name || !shipTo.address || !shipTo.city || !shipTo.region || !shipTo.postal_code) {
    redirect("/app/stickers?error=" + encodeURIComponent("Fill in the full shipping address."));
  }

  // Check the plan allowance up front so a too-big order sends the admin to the
  // upgrade flow instead of failing halfway (and leaving an empty order behind).
  const { usage } = await getStickerUsage(supabase, profile.company_id);
  if (usage.remaining !== null && quantity > usage.remaining) {
    redirect(`/app/stickers?need=${quantity}&job=${encodeURIComponent(jobId)}`);
  }

  const { data: order, error: orderErr } = await supabase
    .from("sticker_orders")
    .insert({
      company_id: profile.company_id,
      job_id: jobId,
      quantity,
      ship_to: shipTo,
      status: "submitted",
      created_by: profile.id,
    })
    .select()
    .single();
  if (orderErr || !order) {
    redirect("/app/stickers?error=" + encodeURIComponent(friendlyError(orderErr ?? { message: "Could not create order." })));
  }

  // Submit creates the boxes and their codes immediately; specs get filled
  // in later when a foreman scans the sticker on site (see DECISIONS.md).
  const rows = Array.from({ length: quantity }, () => ({
    company_id: profile.company_id,
    job_id: jobId,
    sticker_order_id: order.id,
  }));
  const { error: boxesErr } = await supabase.from("boxes").insert(rows);
  if (boxesErr) {
    redirect("/app/stickers?error=" + encodeURIComponent(friendlyError(boxesErr)));
  }

  // Render/submit to print. See apps/web/src/lib/print.ts (task: print +
  // Diginate integration) — imported lazily so this route works before that
  // module lands.
  try {
    const { processStickerOrder } = await import("@/lib/print");
    await processStickerOrder(order.id);
  } catch (err) {
    console.error("print processing failed", err);
    revalidatePath("/app/stickers");
    revalidatePath(`/app/jobs/${jobId}`);
    const msg = err instanceof Error ? err.message : String(err);
    redirect("/app/stickers?error=" + encodeURIComponent("Print step failed: " + msg.slice(0, 180)));
  }

  revalidatePath("/app/stickers");
  revalidatePath(`/app/jobs/${jobId}`);
  redirect(`/app/stickers?ordered=1&done=${encodeURIComponent(jobId)}#job-${jobId}`);
}

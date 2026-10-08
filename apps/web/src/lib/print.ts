import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { env } from "@/lib/env";
import { generateLabelPng } from "@/lib/print/label-art";
import { generateLabelsPdf } from "@/lib/print/label-pdf";
import { uploadPrintAsset } from "@/lib/print/storage";
import { submitDiginateOrder, pollDiginateOrder } from "@/lib/print/diginate";
import type { Box, StickerOrder } from "@roughcut/shared";

// Idempotent on sticker_orders.id: safe to call again for the same order
// (reprint, or a retried request) without minting new public_codes — the
// boxes and their codes already exist by the time this runs (created at
// order-submit time, see apps/web/src/app/app/stickers/actions.ts).
export async function processStickerOrder(orderId: string): Promise<void> {
  const admin = createAdminClient();

  const { data: order } = await admin.from("sticker_orders").select("*").eq("id", orderId).single<StickerOrder>();
  if (!order) throw new Error(`sticker_order ${orderId} not found`);

  // Already shipped — nothing to do. in_production/failed/ready_for_manual_print
  // fall through so a reprint action can retry them.
  if (order.status === "shipped") return;

  const { data: boxes } = await admin
    .from("boxes")
    .select("*")
    .eq("sticker_order_id", orderId)
    .order("short_code")
    .returns<Box[]>();
  if (!boxes || boxes.length === 0) throw new Error(`no boxes found for sticker_order ${orderId}`);

  const webOrigin = env.webOrigin();
  const diginateKey = env.diginateApiKey();

  if (diginateKey) {
    try {
      await submitViaDiginate(admin, order, boxes, webOrigin);
      return;
    } catch (err) {
      console.error("Diginate submission failed, falling back to PDF", err);
      // Falls through to the PDF path below, per spec.
    }
  }

  await fallbackToPdf(admin, order, boxes, webOrigin);
}

async function submitViaDiginate(
  admin: ReturnType<typeof createAdminClient>,
  order: StickerOrder,
  boxes: Box[],
  webOrigin: string
): Promise<void> {
  // Render + store one PNG per box, and collect print_assets rows.
  const items = [];
  for (const box of boxes) {
    const png = await generateLabelPng({ publicCode: box.public_code, shortCode: box.short_code }, webOrigin);
    const path = await uploadPrintAsset(order.company_id, `${order.id}/${box.short_code}.png`, png, "image/png");
    items.push({ shortCode: box.short_code, pngBuffer: png });
    await admin.from("print_assets").upsert({ box_id: box.id, png_path: path }, { onConflict: "box_id" });
  }

  let diginateOrderId = order.diginate_order_id;
  if (!diginateOrderId) {
    const result = await submitDiginateOrder(order.id, order.ship_to as unknown as Record<string, string>, items);
    diginateOrderId = result.diginateOrderId;
    await admin.from("sticker_orders").update({ diginate_order_id: diginateOrderId, status: "submitted" }).eq("id", order.id);
  }

  const status = await pollDiginateOrder(diginateOrderId);
  await admin
    .from("sticker_orders")
    .update({
      status: status.status,
      tracking_number: status.trackingNumber ?? undefined,
    })
    .eq("id", order.id);

  if (status.status === "failed") {
    throw new Error("Diginate reported the order failed");
  }
}

async function fallbackToPdf(
  admin: ReturnType<typeof createAdminClient>,
  order: StickerOrder,
  boxes: Box[],
  webOrigin: string
): Promise<void> {
  const pdf = await generateLabelsPdf(
    boxes.map((b) => ({ publicCode: b.public_code, shortCode: b.short_code })),
    webOrigin
  );
  const path = await uploadPrintAsset(order.company_id, `${order.id}/labels.pdf`, pdf, "application/pdf");

  await admin.from("sticker_orders").update({ status: "ready_for_manual_print", pdf_path: path }).eq("id", order.id);

  // print_assets.png_path is reused to point at the shared PDF for each box
  // in this fallback (see DECISIONS.md) so "download" lookups by box still work.
  await admin.from("print_assets").upsert(
    boxes.map((b) => ({ box_id: b.id, png_path: path })),
    { onConflict: "box_id" }
  );
}

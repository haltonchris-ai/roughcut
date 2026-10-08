import "server-only";
import { env } from "@/lib/env";

// Diginate's actual API contract isn't in the build spec (and isn't
// something this environment can look up against live docs), so this is a
// best-effort REST client built from the spec's description — "submit each
// as a unique image on one Diginate order, save diginate_order_id, poll
// status, save tracking" — guarded so every call can fail safely into the
// PDF fallback the spec already requires for a missing/failing key. Verify
// the endpoint paths and payload shape against Diginate's real docs before
// relying on this for a live shipment; see DECISIONS.md.

export interface DiginateItem {
  shortCode: string;
  pngBuffer: Buffer;
}

export interface DiginateSubmitResult {
  diginateOrderId: string;
}

export interface DiginateStatusResult {
  status: "submitted" | "in_production" | "shipped" | "failed";
  trackingNumber: string | null;
}

function authHeaders(): Record<string, string> {
  return { Authorization: `Bearer ${env.diginateApiKey()}`, "Content-Type": "application/json" };
}

export async function submitDiginateOrder(
  companyOrderId: string,
  shipTo: Record<string, string>,
  items: DiginateItem[]
): Promise<DiginateSubmitResult> {
  const base = env.diginateApiBaseUrl();

  const res = await fetch(`${base}/v1/orders`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({
      // Idempotency key: retrying the same sticker_orders.id should not
      // create a second Diginate order or mint new public_codes.
      external_reference: companyOrderId,
      ship_to: shipTo,
      items: items.map((item) => ({
        sku: "roughcut-label-2x5",
        quantity: 1,
        unique_image_base64: item.pngBuffer.toString("base64"),
        label: item.shortCode,
      })),
    }),
  });

  if (!res.ok) {
    throw new Error(`Diginate order submission failed: ${res.status} ${await safeText(res)}`);
  }

  const data = (await res.json()) as { id?: string; order_id?: string };
  const id = data.id ?? data.order_id;
  if (!id) throw new Error("Diginate order submission response had no order id");

  return { diginateOrderId: id };
}

export async function pollDiginateOrder(diginateOrderId: string): Promise<DiginateStatusResult> {
  const base = env.diginateApiBaseUrl();
  const res = await fetch(`${base}/v1/orders/${diginateOrderId}`, {
    headers: authHeaders(),
  });
  if (!res.ok) {
    throw new Error(`Diginate order status check failed: ${res.status} ${await safeText(res)}`);
  }
  const data = (await res.json()) as { status?: string; tracking_number?: string };
  const status = mapDiginateStatus(data.status);
  return { status, trackingNumber: data.tracking_number ?? null };
}

function mapDiginateStatus(raw: string | undefined): DiginateStatusResult["status"] {
  switch (raw) {
    case "shipped":
    case "dispatched":
      return "shipped";
    case "in_production":
    case "printing":
      return "in_production";
    case "failed":
    case "error":
      return "failed";
    default:
      return "submitted";
  }
}

async function safeText(res: Response): Promise<string> {
  try {
    return await res.text();
  } catch {
    return "";
  }
}

import { requireCompanyProfile } from "@/lib/current-profile";
import { createStickerOrder } from "./actions";
import { createAdminClient } from "@/lib/supabase/admin";
import { PrintGuide } from "@/components/print-guide";
import type { Job, StickerOrder } from "@roughcut/shared";

async function signedPdfUrl(path: string): Promise<string | null> {
  const admin = createAdminClient();
  const { data } = await admin.storage.from("print-assets").createSignedUrl(path, 60 * 10);
  return data?.signedUrl ?? null;
}

export default async function StickersPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; ordered?: string }>;
}) {
  const { profile, supabase } = await requireCompanyProfile();
  const sp = await searchParams;
  const isAdmin = profile.role === "company_admin";

  const [{ data: jobs }, { data: orders }] = await Promise.all([
    supabase.from("jobs").select("*").eq("status", "open").order("name").returns<Job[]>(),
    supabase.from("sticker_orders").select("*").order("created_at", { ascending: false }).returns<StickerOrder[]>(),
  ]);

  return (
    <div className="grid gap-8 sm:grid-cols-[1fr_1fr]">
      <div>
        <h1 className="text-2xl font-bold">Sticker orders</h1>
        {sp.error && <p className="mt-3 text-sm text-bad">{sp.error}</p>}
        {sp.ordered && (
          <p className="mt-3 text-sm text-good">
            Order placed. Boxes and codes were created immediately — labels will follow by mail, or download a PDF
            if nothing ships.
          </p>
        )}

        <div className="mt-6 flex flex-col gap-2">
          {await Promise.all(
            (orders ?? []).map(async (order) => {
              const pdfUrl = order.status === "ready_for_manual_print" && order.pdf_path
                ? await signedPdfUrl(order.pdf_path)
                : null;
              return (
                <div key={order.id} className="card flex items-center justify-between p-4 text-sm">
                  <div>
                    <p className="font-semibold">
                      {order.quantity} stickers ·{" "}
                      <span className="capitalize text-muted">{order.status.replace(/_/g, " ")}</span>
                    </p>
                    <p className="mt-1 text-muted">
                      Ship to {order.ship_to.name}, {order.ship_to.city}, {order.ship_to.region}
                    </p>
                    {order.tracking_number && <p className="mt-1 text-muted">Tracking: {order.tracking_number}</p>}
                  </div>
                  {pdfUrl && (
                    <a href={pdfUrl} className="text-accent hover:underline">
                      Download PDF
                    </a>
                  )}
                </div>
              );
            })
          )}
          {(orders ?? []).length === 0 && <p className="text-muted">No sticker orders yet.</p>}
        </div>
      </div>

      <div className="flex flex-col gap-6">
      {isAdmin && (
        <div className="card p-5">
          <h2 className="font-semibold">Order stickers</h2>
          <form action={createStickerOrder} className="mt-4 flex flex-col gap-3">
            <select className="input" name="jobId" required>
              <option value="">Select a job…</option>
              {(jobs ?? []).map((job) => (
                <option key={job.id} value={job.id}>
                  {job.name}
                </option>
              ))}
            </select>
            <input className="input" name="quantity" type="number" min={10} max={500} placeholder="Quantity (10–500)" required />
            <input className="input" name="shipName" placeholder="Ship to name" required />
            <input className="input" name="shipAddress" placeholder="Address" required />
            <div className="grid grid-cols-2 gap-3">
              <input className="input" name="shipCity" placeholder="City" required />
              <input className="input" name="shipRegion" placeholder="State / region" required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <input className="input" name="shipPostal" placeholder="Postal code" required />
              <input className="input" name="shipCountry" placeholder="Country" defaultValue="US" required />
            </div>
            <button type="submit" className="btn-primary">
              Submit order
            </button>
          </form>
        </div>
      )}
      <PrintGuide />
      </div>
    </div>
  );
}

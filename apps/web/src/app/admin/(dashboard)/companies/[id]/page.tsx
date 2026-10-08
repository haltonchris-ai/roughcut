import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePlatformOwner } from "@/lib/current-owner";
import { getCompanyBilling } from "@/lib/admin-billing";
import { setCompanySuspended, reprintStickerOrder } from "./actions";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Company, Profile, StickerOrder } from "@roughcut/shared";

async function signedPdfUrl(path: string): Promise<string | null> {
  const admin = createAdminClient();
  const { data } = await admin.storage.from("print-assets").createSignedUrl(path, 60 * 10);
  return data?.signedUrl ?? null;
}

export default async function AdminCompanyDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase } = await requirePlatformOwner();

  const { data: company } = await supabase.from("companies").select("*").eq("id", id).maybeSingle<Company>();
  if (!company) notFound();

  const [{ data: members }, { data: orders }, billing] = await Promise.all([
    supabase.from("profiles").select("*").eq("company_id", id).order("created_at").returns<Profile[]>(),
    supabase
      .from("sticker_orders")
      .select("*")
      .eq("company_id", id)
      .order("created_at", { ascending: false })
      .returns<StickerOrder[]>(),
    getCompanyBilling(company.stripe_subscription_id),
  ]);

  const suspended = (members ?? []).length > 0 && (members ?? []).every((m) => m.disabled_at);

  return (
    <div>
      <Link href="/admin/companies" className="text-sm text-muted hover:text-ink">
        ← Companies
      </Link>

      <div className="mt-2 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{company.name}</h1>
          <p className="capitalize text-muted">
            {company.plan} · {company.subscription_status.replace(/_/g, " ")} ·{" "}
            {billing.mrrUsd != null ? `$${billing.mrrUsd.toFixed(0)}/mo` : "no billing"}
            {billing.lastInvoiceStatus && ` · last invoice ${billing.lastInvoiceStatus}`}
          </p>
        </div>
        <form action={setCompanySuspended}>
          <input type="hidden" name="companyId" value={company.id} />
          <input type="hidden" name="suspend" value={suspended ? "false" : "true"} />
          <button
            type="submit"
            className="rounded-lg border border-line px-4 py-2 text-sm hover:border-accent"
          >
            {suspended ? "Unsuspend" : "Suspend"}
          </button>
        </form>
      </div>

      <section className="mt-8">
        <h2 className="font-semibold">Users</h2>
        <div className="mt-3 flex flex-col gap-2">
          {(members ?? []).map((m) => (
            <div key={m.id} className="card flex items-center justify-between p-3 text-sm">
              <span>{m.full_name}</span>
              <span className="capitalize text-muted">
                {m.role.replace("_", " ")} {m.disabled_at && "· disabled"}
              </span>
            </div>
          ))}
          {(members ?? []).length === 0 && <p className="text-muted">No users.</p>}
        </div>
      </section>

      <section className="mt-8">
        <h2 className="font-semibold">Sticker orders</h2>
        <div className="mt-3 flex flex-col gap-2">
          {await Promise.all(
            (orders ?? []).map(async (order) => {
              const pdfUrl =
                order.status === "ready_for_manual_print" && order.pdf_path
                  ? await signedPdfUrl(order.pdf_path)
                  : null;
              return (
                <div key={order.id} className="card flex items-center justify-between p-3 text-sm">
                  <div>
                    <p>
                      {order.quantity} stickers ·{" "}
                      <span className="capitalize text-muted">{order.status.replace(/_/g, " ")}</span>
                    </p>
                    {order.tracking_number && <p className="text-muted">Tracking: {order.tracking_number}</p>}
                  </div>
                  <div className="flex items-center gap-4">
                    {pdfUrl && (
                      <a href={pdfUrl} className="text-accent hover:underline">
                        Download PDF
                      </a>
                    )}
                    {(order.status === "failed" || order.status === "ready_for_manual_print") && (
                      <form action={reprintStickerOrder}>
                        <input type="hidden" name="orderId" value={order.id} />
                        <input type="hidden" name="companyId" value={company.id} />
                        <button type="submit" className="text-muted hover:text-ink">
                          Reprint
                        </button>
                      </form>
                    )}
                  </div>
                </div>
              );
            })
          )}
          {(orders ?? []).length === 0 && <p className="text-muted">No sticker orders.</p>}
        </div>
      </section>
    </div>
  );
}

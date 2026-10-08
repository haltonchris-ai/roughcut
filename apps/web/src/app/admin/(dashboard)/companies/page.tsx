import Link from "next/link";
import { requirePlatformOwner } from "@/lib/current-owner";
import { getCompanyBilling } from "@/lib/admin-billing";
import type { Company } from "@roughcut/shared";

export default async function AdminCompaniesPage() {
  const { supabase } = await requirePlatformOwner();

  const { data: companies } = await supabase
    .from("companies")
    .select("*")
    .order("created_at", { ascending: false })
    .returns<Company[]>();

  const rows = await Promise.all(
    (companies ?? []).map(async (c) => ({
      company: c,
      billing: await getCompanyBilling(c.stripe_subscription_id),
    }))
  );

  const totalMrr = rows.reduce((sum, r) => sum + (r.billing.mrrUsd ?? 0), 0);

  return (
    <div>
      <div className="flex items-baseline justify-between">
        <h1 className="text-2xl font-bold">Companies</h1>
        <p className="text-muted">
          Total MRR: <span className="font-semibold text-ink">${totalMrr.toFixed(0)}</span>
        </p>
      </div>

      <div className="mt-6 flex flex-col gap-2">
        {rows.map(({ company, billing }) => (
          <Link
            key={company.id}
            href={`/admin/companies/${company.id}`}
            className="card flex items-center justify-between p-4 hover:border-accent"
          >
            <div>
              <p className="font-semibold">{company.name}</p>
              <p className="text-sm capitalize text-muted">
                {company.plan} · {company.subscription_status.replace(/_/g, " ")}
              </p>
            </div>
            <p className="text-sm text-muted">{billing.mrrUsd != null ? `$${billing.mrrUsd.toFixed(0)}/mo` : "—"}</p>
          </Link>
        ))}
        {rows.length === 0 && <p className="text-muted">No companies yet.</p>}
      </div>
    </div>
  );
}

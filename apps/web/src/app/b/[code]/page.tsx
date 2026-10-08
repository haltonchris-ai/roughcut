import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { BOX_TYPE_LABELS, type Box } from "@roughcut/shared";

export default async function BoxPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const supabase = await createClient();

  const { data: userData } = await supabase.auth.getUser();

  if (!userData.user) {
    return <LoginWall code={code} />;
  }

  // RLS scopes this to the signed-in user's company; a code from another
  // company simply won't match any row the user can see.
  const { data: box } = await supabase
    .from("boxes")
    .select("*, job:jobs(name, address)")
    .eq("public_code", code)
    .maybeSingle<Box & { job: { name: string; address: string } }>();

  if (!box) {
    return (
      <Shell>
        <p className="text-muted">
          No spec found for this sticker, or you don't have access to it from this account.
        </p>
      </Shell>
    );
  }

  return (
    <Shell>
      <p className="text-sm font-semibold uppercase tracking-wide text-accent">{box.short_code}</p>
      <h1 className="mt-1 text-2xl font-bold">{box.box_type ? BOX_TYPE_LABELS[box.box_type] : "Not specified yet"}</h1>
      <p className="mt-1 text-muted">
        {box.job.name} · {box.job.address}
      </p>

      <dl className="card mt-6 divide-y divide-line p-6">
        <Row label="Size" value={box.size ?? "—"} />
        <Row label="Height AFF" value={box.height_aff ?? "—"} />
        <Row label="Circuit" value={box.circuit ?? "—"} />
        <Row label="Notes" value={box.notes ?? "—"} />
        <Row label="Status" value={box.status} />
      </dl>

      <p className="mt-6 text-sm text-muted">
        This is a read-only view. Open the RoughCUT app to mark this box installed.
      </p>
    </Shell>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-3 text-sm">
      <span className="text-muted">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

function LoginWall({ code }: { code: string }) {
  return (
    <Shell>
      <h1 className="text-2xl font-bold">Log in to view this spec</h1>
      <p className="mt-2 text-muted">
        This sticker's spec is only visible to a signed-in RoughCUT user on the box's company.
      </p>
      <Link href={`/login?next=/b/${code}`} className="btn-primary mt-6 inline-block">
        Log in
      </Link>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-16">{children}</main>
  );
}

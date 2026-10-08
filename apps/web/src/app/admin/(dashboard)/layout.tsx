import Link from "next/link";
import { requirePlatformOwner } from "@/lib/current-owner";
import { signOutOwner } from "./actions";

export default async function AdminDashboardLayout({ children }: { children: React.ReactNode }) {
  await requirePlatformOwner();

  return (
    <div className="min-h-screen">
      <header className="border-b border-line">
        <div className="mx-auto flex max-w-page items-center justify-between px-6 py-4">
          <Link href="/admin/companies" className="text-lg font-bold">
            Rough<span className="text-accent">CUT</span> <span className="text-muted">owner</span>
          </Link>
          <nav className="flex items-center gap-6 text-sm text-muted">
            <Link href="/admin/companies" className="hover:text-ink">
              Companies
            </Link>
          </nav>
          <form action={signOutOwner}>
            <button className="text-sm text-muted hover:text-ink" type="submit">
              Sign out
            </button>
          </form>
        </div>
      </header>
      <main className="mx-auto max-w-page px-6 py-10">{children}</main>
    </div>
  );
}

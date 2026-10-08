import Link from "next/link";

export function SiteNav() {
  return (
    <header className="border-b border-line">
      <div className="mx-auto flex max-w-page items-center justify-between px-6 py-4">
        <Link href="/" className="text-lg font-bold tracking-tight">
          Rough<span className="text-accent">CUT</span>
        </Link>
        <nav className="flex items-center gap-6 text-sm text-muted">
          <Link href="/pricing" className="hover:text-ink">
            Pricing
          </Link>
          <Link href="/login" className="hover:text-ink">
            Log in
          </Link>
          <Link href="/signup" className="btn-primary text-sm">
            Start free
          </Link>
        </nav>
      </div>
    </header>
  );
}

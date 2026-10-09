import Link from "next/link";
import { Wordmark } from "@/components/brand";

export function SiteNav() {
  return (
    <header className="border-b border-line bg-bg">
      <div className="mx-auto flex max-w-site items-center justify-between gap-2 px-4 py-3 sm:px-10 sm:py-4">
        <Link href="/" aria-label="RoughCUT home">
          <Wordmark />
        </Link>
        <nav className="flex items-center gap-1 whitespace-nowrap text-sm font-semibold sm:gap-3">
          <Link href="/#how" className="hidden rounded-md px-3 py-2.5 text-muted hover:text-ink md:inline-block">
            How it works
          </Link>
          <Link href="/pricing" className="hidden rounded-md px-3 py-2.5 text-muted hover:text-ink sm:inline-block">
            Pricing
          </Link>
          <Link href="/login" className="rounded-md px-3 py-2.5 text-muted hover:text-ink">
            Log in
          </Link>
          <Link href="/signup" className="btn-primary ml-1 text-sm">
            Start free
          </Link>
        </nav>
      </div>
    </header>
  );
}

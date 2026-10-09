import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="border-t border-line bg-bg py-8">
      <div className="mx-auto flex max-w-site flex-col gap-4 px-6 text-sm text-faint sm:flex-row sm:items-center sm:justify-between sm:px-10">
        <p>© {new Date().getFullYear()} RoughCUT. Spec the box, scan the sticker.</p>
        <div className="flex gap-6">
          <Link href="/login" className="hover:text-ink">
            Log in
          </Link>
          <Link href="/pricing" className="hover:text-ink">
            Pricing
          </Link>
        </div>
      </div>
    </footer>
  );
}

import Link from "next/link";
import { requireCompanyProfile } from "@/lib/current-profile";
import { signOut } from "./actions";
import { getStickerUsage } from "@/lib/sticker-usage";
import { StickerBanner } from "@/components/sticker-banner";

const NAV = [
  { href: "/app/jobs", label: "Jobs" },
  { href: "/app/team", label: "Team" },
  { href: "/app/stickers", label: "Stickers" },
  { href: "/app/billing", label: "Billing" },
];

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { profile, supabase } = await requireCompanyProfile();
  const { usage } = await getStickerUsage(supabase, profile.company_id);

  return (
    <div className="min-h-screen">
      <header className="border-b border-line">
        <div className="mx-auto flex max-w-page items-center justify-between px-6 py-4">
          <Link href="/app/jobs" className="text-lg font-bold">
            Rough<span className="text-accent">CUT</span>
          </Link>
          <nav className="flex items-center gap-6 text-sm text-muted">
            {NAV.map((item) => (
              <Link key={item.href} href={item.href} className="hover:text-ink">
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-4 text-sm">
            <span className="text-muted">
              {profile.full_name} · <span className="capitalize">{profile.role.replace("_", " ")}</span>
            </span>
            <form action={signOut}>
              <button className="text-muted hover:text-ink" type="submit">
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-page px-6 py-10">
        <StickerBanner usage={usage} isAdmin={profile.role === "company_admin"} variant="alerts" />
        {children}
      </main>
    </div>
  );
}

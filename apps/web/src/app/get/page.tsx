import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import { env } from "@/lib/env";

// The address printed on every sticker sheet's cover page. Because it is
// ours, the destination can change (TestFlight now, App Store later) without
// reprinting anything.
export const dynamic = "force-dynamic";

export default async function GetAppPage() {
  const ua = (await headers()).get("user-agent") ?? "";
  const isApple = /iPhone|iPad|iPod/i.test(ua);
  const appUrl = env.iosAppUrl();

  if (isApple && appUrl) redirect(appUrl);

  return (
    <>
      <SiteNav />
      <main className="mx-auto max-w-xl px-6 py-16">
        <span className="eyebrow">Get the app</span>
        <h1 className="mt-3 text-4xl">RoughCUT for iPhone</h1>
        {isApple ? (
          <p className="mt-4 text-muted">
            The iPhone app link isn&apos;t live yet. Ask the person who invited you to send it, or log in on the web
            below in the meantime.
          </p>
        ) : (
          <p className="mt-4 text-muted">
            Open this page on your iPhone to install the RoughCUT app. You can also use RoughCUT in any browser — the
            sticker links open a read-only view of the box.
          </p>
        )}
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/login" className="btn-primary px-7">
            Log in
          </Link>
          <Link href="/signup" className="btn-outline px-7">
            Create an account
          </Link>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}

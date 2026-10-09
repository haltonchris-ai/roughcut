import Link from "next/link";
import { requestPasswordReset } from "./actions";
import { Wordmark } from "@/components/brand";
import { SubmitButton } from "@/components/submit-button";

export default async function ForgotPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; sent?: string }>;
}) {
  const sp = await searchParams;

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-16">
      <Link href="/" aria-label="RoughCUT home" className="mb-8 w-fit">
        <Wordmark />
      </Link>
      <h1 className="text-3xl">Set or reset your password.</h1>
      <p className="mt-2 text-muted">
        Enter your email and we&apos;ll send you a link to choose a new password.
      </p>

      {sp.error && (
        <div className="mt-4 rounded-lg border border-bad/40 bg-[#FBE9E7] p-3 text-sm text-bad">{sp.error}</div>
      )}
      {sp.sent && (
        <div className="mt-4 rounded-lg border border-good/40 bg-[#E6F3EA] p-3 text-sm text-good">
          If that email has a RoughCUT account, a link is on its way. Check your inbox and spam folder. The link works
          for about an hour.
        </div>
      )}

      <form action={requestPasswordReset} className="mt-6 flex flex-col gap-4">
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="text-xs font-bold uppercase tracking-wide text-muted">Email</span>
          <input className="input" name="email" type="email" required autoComplete="email" />
        </label>
        <SubmitButton className="btn-primary mt-2" pendingText="Sending…">
          Email me a link
        </SubmitButton>
      </form>

      <p className="mt-6 text-sm text-muted">
        <Link href="/login" className="text-accent hover:underline">
          Back to log in
        </Link>
      </p>
    </main>
  );
}

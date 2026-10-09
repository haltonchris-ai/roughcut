import Link from "next/link";
import { Wordmark } from "@/components/brand";
import { ResetPasswordForm } from "@/components/reset-password-form";
import { env } from "@/lib/env";

export const dynamic = "force-dynamic";

export default function ResetPasswordPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-16">
      <Link href="/" aria-label="RoughCUT home" className="mb-8 w-fit">
        <Wordmark />
      </Link>
      <h1 className="text-3xl">Choose your password.</h1>
      <p className="mt-2 text-muted">Pick a password you&apos;ll use to log in to RoughCUT.</p>
      <ResetPasswordForm supabaseUrl={env.supabaseUrl()} anonKey={env.supabaseAnonKey()} />
    </main>
  );
}

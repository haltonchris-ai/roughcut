import Link from "next/link";
import { login } from "./actions";
import { Wordmark } from "@/components/brand";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string }>;
}) {
  const sp = await searchParams;
  const next = sp.next ?? "/app";

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-16">
      <Link href="/" aria-label="RoughCUT home" className="mb-8 w-fit">
        <Wordmark />
      </Link>
      <h1 className="text-3xl">Welcome back.</h1>
      <p className="mt-2 text-muted">Log in to your RoughCUT account.</p>

      {sp.error && (
        <div className="mt-4 rounded-lg border border-bad/40 bg-[#FBE9E7] p-3 text-sm text-bad">{sp.error}</div>
      )}

      <form action={login} className="mt-6 flex flex-col gap-4">
        <input type="hidden" name="next" value={next} />
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="text-xs font-bold uppercase tracking-wide text-muted">Email</span>
          <input className="input" name="email" type="email" required />
        </label>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="text-xs font-bold uppercase tracking-wide text-muted">Password</span>
          <input className="input" name="password" type="password" required />
        </label>
        <Link href="/forgot-password" className="-mt-2 w-fit text-sm text-accent hover:underline">
          Forgot or need to set your password?
        </Link>
        <button type="submit" className="btn-primary mt-2">
          Log in
        </button>
      </form>

      <p className="mt-6 text-sm text-muted">
        New here?{" "}
        <Link href="/signup" className="text-accent hover:underline">
          Start free
        </Link>
      </p>
    </main>
  );
}

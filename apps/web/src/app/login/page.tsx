import Link from "next/link";
import { login } from "./actions";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string }>;
}) {
  const sp = await searchParams;
  const next = sp.next ?? "/app";

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-16">
      <h1 className="text-2xl font-bold">Log in</h1>

      {sp.error && (
        <div className="mt-4 rounded-lg border border-bad/40 bg-bad/10 p-3 text-sm text-bad">{sp.error}</div>
      )}

      <form action={login} className="mt-6 flex flex-col gap-4">
        <input type="hidden" name="next" value={next} />
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium text-muted">Email</span>
          <input className="input" name="email" type="email" required />
        </label>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium text-muted">Password</span>
          <input className="input" name="password" type="password" required />
        </label>
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

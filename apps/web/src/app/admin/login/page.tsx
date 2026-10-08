import { adminLogin } from "./actions";

export default async function AdminLoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const sp = await searchParams;

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-16">
      <h1 className="text-2xl font-bold">
        Rough<span className="text-accent">CUT</span> — platform owner
      </h1>
      <p className="mt-2 text-muted">This is the owner-only console, separate from the company app.</p>

      {sp.error && (
        <div className="mt-4 rounded-lg border border-bad/40 bg-bad/10 p-3 text-sm text-bad">{sp.error}</div>
      )}

      <form action={adminLogin} className="mt-6 flex flex-col gap-4">
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
    </main>
  );
}

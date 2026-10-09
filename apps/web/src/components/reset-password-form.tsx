"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@supabase/supabase-js";

// Reads the recovery tokens from the link's address, then lets the person
// choose a new password. Runs entirely in the browser with the public anon key.
export function ResetPasswordForm({ supabaseUrl, anonKey }: { supabaseUrl: string; anonKey: string }) {
  const [client] = useState(() =>
    createClient(supabaseUrl, anonKey, {
      auth: { flowType: "implicit", persistSession: false, detectSessionInUrl: true },
    }),
  );
  const [ready, setReady] = useState(false);
  const [expired, setExpired] = useState(false);
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const { data } = client.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || (event === "SIGNED_IN" && session)) setReady(true);
    });
    const t = setTimeout(() => {
      client.auth.getSession().then(({ data: s }) => {
        if (s.session) setReady(true);
        else setExpired(true);
      });
    }, 1500);
    return () => {
      data.subscription.unsubscribe();
      clearTimeout(t);
    };
  }, [client]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setError(null);
    if (pw.length < 8) return setError("Use at least 8 characters.");
    if (pw !== pw2) return setError("The two passwords don't match.");
    setBusy(true);
    const { error: err } = await client.auth.updateUser({ password: pw });
    setBusy(false);
    if (err) return setError(err.message);
    await client.auth.signOut();
    setDone(true);
  }

  if (done) {
    return (
      <div className="mt-6">
        <div className="rounded-lg border border-good/40 bg-[#E6F3EA] p-3 text-sm text-good">
          Password saved. You can log in now.
        </div>
        <Link href="/login" className="btn-primary mt-6 inline-block px-7">
          Log in
        </Link>
      </div>
    );
  }

  if (!ready && expired) {
    return (
      <div className="mt-6">
        <div className="rounded-lg border border-bad/40 bg-[#FBE9E7] p-3 text-sm text-bad">
          This link has expired or was already used.
        </div>
        <Link href="/forgot-password" className="btn-primary mt-6 inline-block px-7">
          Send a new link
        </Link>
      </div>
    );
  }

  if (!ready) return <p className="mt-6 text-muted">Checking your link…</p>;

  return (
    <form onSubmit={onSubmit} className="mt-6 flex flex-col gap-4">
      {error && <div className="rounded-lg border border-bad/40 bg-[#FBE9E7] p-3 text-sm text-bad">{error}</div>}
      <label className="flex flex-col gap-1.5 text-sm">
        <span className="text-xs font-bold uppercase tracking-wide text-muted">New password</span>
        <input
          className="input"
          type="password"
          minLength={8}
          required
          autoComplete="new-password"
          value={pw}
          onChange={(e) => setPw(e.target.value)}
        />
      </label>
      <label className="flex flex-col gap-1.5 text-sm">
        <span className="text-xs font-bold uppercase tracking-wide text-muted">Type it again</span>
        <input
          className="input"
          type="password"
          minLength={8}
          required
          autoComplete="new-password"
          value={pw2}
          onChange={(e) => setPw2(e.target.value)}
        />
      </label>
      <button type="submit" disabled={busy} className="btn-primary mt-2 disabled:opacity-60">
        {busy ? "Saving…" : "Save password"}
      </button>
    </form>
  );
}

import { requireCompanyProfile } from "@/lib/current-profile";
import { createInvite, setUserDisabled } from "./actions";
import type { Profile } from "@roughcut/shared";

export default async function TeamPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; invited?: string; link?: string }>;
}) {
  const { profile, supabase } = await requireCompanyProfile();
  const sp = await searchParams;
  const isAdmin = profile.role === "company_admin";

  const { data: members } = await supabase.from("profiles").select("*").order("created_at").returns<Profile[]>();

  return (
    <div className="grid gap-8 sm:grid-cols-[2fr_1fr]">
      <div>
        <h1 className="text-2xl font-bold">Team</h1>
        {sp.error && <p className="mt-3 text-sm text-bad">{sp.error}</p>}
        {sp.invited && (
          <div className="mt-3 rounded-lg border border-good/40 bg-good/10 p-3 text-sm">
            <p className="text-good">Account created for {sp.invited}.</p>
            {sp.link && (
              <p className="mt-1 break-all text-muted">
                Send them this set-password link (email delivery isn't wired up yet): {sp.link}
              </p>
            )}
          </div>
        )}

        <div className="mt-6 flex flex-col gap-2">
          {(members ?? []).map((m) => (
            <div key={m.id} className="card flex items-center justify-between p-4">
              <div>
                <p className="font-semibold">
                  {m.full_name} {m.disabled_at && <span className="text-bad">(disabled)</span>}
                </p>
                <p className="text-sm capitalize text-muted">{m.role.replace("_", " ")}</p>
              </div>
              {isAdmin && m.id !== profile.id && (
                <form action={setUserDisabled}>
                  <input type="hidden" name="userId" value={m.id} />
                  <input type="hidden" name="disable" value={m.disabled_at ? "false" : "true"} />
                  <button className="text-sm text-muted hover:text-ink" type="submit">
                    {m.disabled_at ? "Enable" : "Disable"}
                  </button>
                </form>
              )}
            </div>
          ))}
        </div>
      </div>

      {isAdmin && (
        <div className="card p-5">
          <h2 className="font-semibold">Invite a teammate</h2>
          <form action={createInvite} className="mt-4 flex flex-col gap-3">
            <input className="input" name="email" type="email" placeholder="worker@email.com" required />
            <select className="input" name="role" required defaultValue="installer">
              <option value="foreman">Foreman</option>
              <option value="installer">Installer</option>
            </select>
            <button type="submit" className="btn-primary">
              Send invite
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

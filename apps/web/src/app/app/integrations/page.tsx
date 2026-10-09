import { requireCompanyProfile } from "@/lib/current-profile";
import { createAdminClient } from "@/lib/supabase/admin";
import { env } from "@/lib/env";
import { FeedBuilder } from "./feed-builder";
import { regenerateFeedToken } from "../team/actions";
import { SubmitButton } from "@/components/submit-button";
import type { Job } from "@roughcut/shared";

export default async function IntegrationsPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { profile, supabase } = await requireCompanyProfile();
  const sp = await searchParams;

  if (profile.role !== "company_admin") {
    return (
      <div>
        <h1 className="text-2xl font-bold">Integrations</h1>
        <p className="mt-3 text-muted">Only company admins can set up feeds.</p>
      </div>
    );
  }

  const { data: feed } = await createAdminClient()
    .from("company_feeds")
    .select("token")
    .eq("company_id", profile.company_id)
    .maybeSingle();
  const { data: jobs } = await supabase.from("jobs").select("id, name").order("name").returns<Pick<Job, "id" | "name">[]>();

  const baseUrl = feed?.token ? `${env.webOrigin()}/api/feed/${feed.token}` : null;

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-bold">Integrations</h1>
      <p className="mt-2 text-muted">
        Send RoughCUT activity to Asana, Monday, Jira, Slack or anything else that can read a feed, using Zapier, Make
        or IFTTT.
      </p>
      {sp.error && <p className="mt-3 text-sm text-bad">{sp.error}</p>}

      {baseUrl ? (
        <FeedBuilder baseUrl={baseUrl} jobs={jobs ?? []} />
      ) : (
        <div className="card mt-6 p-5">
          <p className="text-sm text-muted">Create your private feed link to get started.</p>
        </div>
      )}

      <form action={regenerateFeedToken} className="mt-6">
        <SubmitButton
          pendingText="Working…"
          className="btn-outline"
          confirmMessage={baseUrl ? "Create a new link? Every link you've already set up will stop working." : undefined}
        >
          {baseUrl ? "Create a new private link (revokes the old one)" : "Create feed link"}
        </SubmitButton>
      </form>
    </div>
  );
}

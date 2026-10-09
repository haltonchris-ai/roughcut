import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { env } from "@/lib/env";
import { BOX_TYPE_LABELS, type BoxType } from "@roughcut/shared";

export const dynamic = "force-dynamic";

interface FeedEvent {
  id: string;
  at: string;
  title: string;
  description: string;
  link: string;
  kind: "job_created" | "box_specified" | "box_installed" | "stickers_ordered";
  jobId: string;
  jobName: string;
}

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

// Company-scoped activity feed. The token in the URL is the credential, so
// every lookup is by token and every query is filtered to that company.
export async function GET(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const url = new URL(request.url);
  const jobFilter = url.searchParams.get("job");
  const asJson = url.searchParams.get("format") === "json";

  if (!/^[A-Za-z0-9_-]{20,80}$/.test(token)) return new NextResponse("Not found", { status: 404 });

  const admin = createAdminClient();
  const { data: feed } = await admin.from("company_feeds").select("company_id").eq("token", token).maybeSingle();
  if (!feed) return new NextResponse("Not found", { status: 404 });
  const companyId = feed.company_id as string;

  const [{ data: company }, { data: jobs }] = await Promise.all([
    admin.from("companies").select("name").eq("id", companyId).single(),
    admin.from("jobs").select("id, name, address, created_at").eq("company_id", companyId),
  ]);
  const jobById = new Map((jobs ?? []).map((j) => [j.id as string, j]));
  const origin = env.webOrigin();
  const events: FeedEvent[] = [];
  const keep = (jobId: string) => !jobFilter || jobFilter === jobId;

  for (const j of jobs ?? []) {
    if (!keep(j.id)) continue;
    events.push({
      id: `job-${j.id}-created`,
      at: j.created_at,
      title: `New job: ${j.name}`,
      description: `${j.name}, ${j.address}`,
      link: `${origin}/app/jobs/${j.id}`,
      kind: "job_created",
      jobId: j.id,
      jobName: j.name,
    });
  }

  const boxCols = "id, job_id, short_code, box_type, size, height_aff, circuit, notes, specified_at, installed_at";
  const { data: specified } = await admin
    .from("boxes").select(boxCols).eq("company_id", companyId).not("specified_at", "is", null)
    .order("specified_at", { ascending: false }).limit(100);
  const { data: installed } = await admin
    .from("boxes").select(boxCols).eq("company_id", companyId).not("installed_at", "is", null)
    .order("installed_at", { ascending: false }).limit(100);

  const detail = (b: NonNullable<typeof specified>[number]) =>
    [
      b.box_type ? BOX_TYPE_LABELS[b.box_type as BoxType] ?? b.box_type : null,
      b.size,
      b.height_aff ? `${b.height_aff} AFF` : null,
      b.circuit ? `circuit ${b.circuit}` : null,
      b.notes,
    ]
      .filter(Boolean)
      .join(", ");

  for (const [list, kind, field, verb] of [
    [specified, "box_specified", "specified_at", "specified"],
    [installed, "box_installed", "installed_at", "installed"],
  ] as const) {
    for (const b of list ?? []) {
      const job = jobById.get(b.job_id);
      if (!job || !keep(job.id)) continue;
      events.push({
        id: `box-${b.id}-${verb}`,
        at: b[field] as string,
        title: `Box ${b.short_code} ${verb}: ${job.name}`,
        description: `${b.short_code} ${verb} on ${job.name} (${job.address}). ${detail(b)}`.trim(),
        link: `${origin}/app/jobs/${job.id}`,
        kind,
        jobId: job.id,
        jobName: job.name,
      });
    }
  }

  const { data: orders } = await admin
    .from("sticker_orders").select("id, job_id, quantity, created_at")
    .eq("company_id", companyId).order("created_at", { ascending: false }).limit(50);
  for (const o of orders ?? []) {
    const job = jobById.get(o.job_id);
    if (!job || !keep(job.id)) continue;
    events.push({
      id: `order-${o.id}`,
      at: o.created_at,
      title: `${o.quantity} stickers ordered: ${job.name}`,
      description: `${o.quantity} stickers ordered for ${job.name}.`,
      link: `${origin}/app/jobs/${job.id}#stickers`,
      kind: "stickers_ordered",
      jobId: job.id,
      jobName: job.name,
    });
  }

  events.sort((a, b) => (a.at < b.at ? 1 : -1));
  const items = events.slice(0, 100);
  const headers = { "Cache-Control": "private, max-age=60", "X-Robots-Tag": "noindex" };
  const feedTitle = `${company?.name ?? "RoughCUT"} on RoughCUT`;

  if (asJson) {
    return NextResponse.json({ title: feedTitle, items }, { headers });
  }

  const self = `${origin}/api/feed/${token}${jobFilter ? `?job=${jobFilter}` : ""}`;
  const xml =
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom"><channel>` +
    `<title>${esc(feedTitle)}</title><link>${esc(origin + "/app/jobs")}</link>` +
    `<description>Job, box and sticker activity</description>` +
    `<atom:link href="${esc(self)}" rel="self" type="application/rss+xml"/>` +
    (items[0] ? `<lastBuildDate>${new Date(items[0].at).toUTCString()}</lastBuildDate>` : "") +
    items
      .map(
        (e) =>
          `<item><title>${esc(e.title)}</title><link>${esc(e.link)}</link>` +
          `<guid isPermaLink="false">${esc(e.id)}</guid><pubDate>${new Date(e.at).toUTCString()}</pubDate>` +
          `<category>${e.kind}</category><description>${esc(e.description)}</description></item>`
      )
      .join("") +
    `</channel></rss>`;

  return new NextResponse(xml, { headers: { ...headers, "Content-Type": "application/rss+xml; charset=utf-8" } });
}

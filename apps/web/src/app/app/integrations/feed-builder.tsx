"use client";

import { useMemo, useState } from "react";

const EVENTS = [
  { kind: "box_installed", label: "Box installed", sample: "Box RC-0021 installed: {job}", desc: "{code} installed on {job} ({addr}). Single gang, 4x4, 18in AFF, circuit 12" },
  { kind: "box_specified", label: "Box specified", sample: "Box RC-0022 specified: {job}", desc: "{code} specified on {job} ({addr}). Double gang, 5x4, 48in AFF, circuit 7" },
  { kind: "job_created", label: "New job", sample: "New job: {job}", desc: "{job}, {addr}" },
  { kind: "stickers_ordered", label: "Stickers ordered", sample: "10 stickers ordered: {job}", desc: "10 stickers ordered for {job}." },
] as const;

type Format = "rss" | "json";

export function FeedBuilder({ baseUrl, jobs }: { baseUrl: string; jobs: { id: string; name: string }[] }) {
  const [jobId, setJobId] = useState("");
  const [kinds, setKinds] = useState<string[]>(EVENTS.map((e) => e.kind));
  const [format, setFormat] = useState<Format>("rss");
  const [copied, setCopied] = useState(false);

  const url = useMemo(() => {
    const q = new URLSearchParams();
    if (jobId) q.set("job", jobId);
    if (kinds.length > 0 && kinds.length < EVENTS.length) q.set("events", kinds.join(","));
    if (format === "json") q.set("format", "json");
    const qs = q.toString();
    return qs ? `${baseUrl}?${qs}` : baseUrl;
  }, [baseUrl, jobId, kinds, format]);

  const jobName = jobs.find((j) => j.id === jobId)?.name ?? jobs[0]?.name ?? "Robins House";
  const addr = "111 Pacific Road, Clifton, NJ";
  const fill = (t: string) => t.replace(/\{job\}/g, jobName).replace(/\{addr\}/g, addr).replace(/\{code\}/g, "RC-0021");
  const shown = EVENTS.filter((e) => kinds.includes(e.kind));
  const first = shown[0] ?? EVENTS[0];

  const sample =
    format === "rss"
      ? `<item>\n  <title>${fill(first.sample)}</title>\n  <link>https://…/app/jobs/…</link>\n  <guid isPermaLink="false">box-…-installed</guid>\n  <pubDate>Fri, 09 Oct 2026 14:05:00 GMT</pubDate>\n  <description>${fill(first.desc)}</description>\n</item>`
      : JSON.stringify(
          { title: fill(first.sample), kind: first.kind, at: "2026-10-09T14:05:00Z", description: fill(first.desc), link: "https://…/app/jobs/…", jobName },
          null,
          2
        );

  const toggle = (k: string) => setKinds((cur) => (cur.includes(k) ? cur.filter((x) => x !== k) : [...cur, k]));

  return (
    <div className="mt-6 flex flex-col gap-6">
      <div className="card p-5">
        <h2 className="font-semibold">1. Choose what you want</h2>

        <label className="mt-4 block text-xs font-semibold uppercase tracking-wide text-muted">Jobs</label>
        <select className="input mt-1" value={jobId} onChange={(e) => setJobId(e.target.value)}>
          <option value="">All jobs</option>
          {jobs.map((j) => (
            <option key={j.id} value={j.id}>
              {j.name}
            </option>
          ))}
        </select>

        <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-muted">What to include</p>
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          {EVENTS.map((e) => (
            <label key={e.kind} className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={kinds.includes(e.kind)} onChange={() => toggle(e.kind)} />
              {e.label}
            </label>
          ))}
        </div>
        {kinds.length === 0 && <p className="mt-2 text-xs text-bad">Pick at least one, or the feed will include everything.</p>}

        <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-muted">Format</p>
        <div className="mt-2 flex gap-4 text-sm">
          <label className="flex items-center gap-2">
            <input type="radio" checked={format === "rss"} onChange={() => setFormat("rss")} /> RSS (works with Zapier, Make, IFTTT)
          </label>
          <label className="flex items-center gap-2">
            <input type="radio" checked={format === "json"} onChange={() => setFormat("json")} /> JSON
          </label>
        </div>
      </div>

      <div className="card p-5">
        <h2 className="font-semibold">2. Copy your link</h2>
        <p className="mt-2 break-all rounded-lg bg-dim p-2 font-mono text-xs">{url}</p>
        <button
          type="button"
          className="btn-primary mt-3"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(url);
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            } catch {
              /* clipboard blocked: user can select the text above */
            }
          }}
        >
          {copied ? "Copied" : "Copy link"}
        </button>
        <p className="mt-2 text-xs text-muted">Anyone with this link can read the feed. Treat it like a password.</p>
      </div>

      <div className="card p-5">
        <h2 className="font-semibold">3. What it looks like</h2>
        <p className="mt-2 text-sm text-muted">One sample item. Each event becomes one task or message in your tool.</p>
        <pre className="mt-3 overflow-x-auto rounded-lg bg-dim p-3 text-xs">{sample}</pre>
        <p className="mt-4 text-sm font-semibold">In Asana it becomes a task like:</p>
        <div className="mt-2 rounded-lg border border-line p-3 text-sm">
          <p className="font-semibold">{fill(first.sample)}</p>
          <p className="mt-1 text-muted">{fill(first.desc)}</p>
        </div>
        <p className="mt-4 text-sm font-semibold">Set it up in Zapier</p>
        <ol className="mt-1 list-decimal space-y-1 pl-5 text-sm text-muted">
          <li>Trigger: <b>RSS by Zapier → New Item in Feed</b>. Paste your link.</li>
          <li>Action: <b>Asana → Create Task</b>. Map Title to the item title and Notes to the description.</li>
          <li>Turn it on. New items show up within a few minutes.</li>
        </ol>
      </div>
    </div>
  );
}

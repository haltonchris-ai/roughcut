import type { JobTally } from "@/lib/sticker-usage";

export interface NextStep {
  label: string; // short status for lists
  tone: "todo" | "wait" | "done";
}

// One plain-language "what happens next" per job, used on the Jobs list.
export function jobNextStep(status: "open" | "closed", t: JobTally | undefined): NextStep {
  if (status === "closed") return { label: "Closed", tone: "done" };
  if (!t || t.total === 0) return { label: "Next: order stickers", tone: "todo" };
  if (t.installed === t.total) return { label: "All boxes installed. Ready to close", tone: "done" };
  if (t.assigned === 0) return { label: "Next: print stickers and start scanning", tone: "todo" };
  if (t.unassigned === 0) return { label: `${t.total - t.installed} left to install`, tone: "wait" };
  return { label: `${t.installed} of ${t.total} installed · ${t.unassigned} stickers unused`, tone: "wait" };
}

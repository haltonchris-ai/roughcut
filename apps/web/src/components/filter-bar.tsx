import Link from "next/link";
import { RANGES } from "@/lib/date-range";

// Plain GET form: filters live in the URL, so they can be bookmarked and need no JS.
export function FilterBar({
  action,
  q,
  range,
  status,
  withStatus,
  rangeLabel,
  searchPlaceholder,
  shown,
  total,
}: {
  action: string;
  q?: string;
  range?: string;
  status?: string;
  withStatus?: boolean;
  rangeLabel: string;
  searchPlaceholder: string;
  shown: number;
  total: number;
}) {
  const active = Boolean(q || range || status);
  return (
    <form action={action} method="get" className="card flex flex-wrap items-end gap-3 p-4">
      <label className="flex min-w-[200px] flex-1 flex-col text-xs font-semibold uppercase tracking-wide text-muted">
        Search
        <input className="input mt-1 normal-case" type="search" name="q" defaultValue={q ?? ""} placeholder={searchPlaceholder} />
      </label>
      <label className="flex flex-col text-xs font-semibold uppercase tracking-wide text-muted">
        {rangeLabel}
        <select className="input mt-1 normal-case" name="range" defaultValue={range ?? ""}>
          {RANGES.map((r) => (
            <option key={r.value} value={r.value}>
              {r.label}
            </option>
          ))}
        </select>
      </label>
      {withStatus && (
        <label className="flex flex-col text-xs font-semibold uppercase tracking-wide text-muted">
          Status
          <select className="input mt-1 normal-case" name="status" defaultValue={status ?? ""}>
            <option value="">Open and closed</option>
            <option value="open">Open</option>
            <option value="closed">Closed</option>
          </select>
        </label>
      )}
      <button type="submit" className="btn-primary">
        Apply
      </button>
      {active && (
        <Link href={action} className="pb-3 text-sm text-muted hover:text-ink hover:underline">
          Clear
        </Link>
      )}
      <p className="w-full text-xs text-muted">
        Showing {shown} of {total} job{total === 1 ? "" : "s"}
      </p>
    </form>
  );
}

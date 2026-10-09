export const RANGES = [
  { value: "", label: "All time", days: null },
  { value: "1d", label: "Last 24 hours", days: 1 },
  { value: "7d", label: "Last 7 days", days: 7 },
  { value: "30d", label: "Last 30 days", days: 30 },
  { value: "90d", label: "Last 90 days", days: 90 },
  { value: "1y", label: "Last 12 months", days: 365 },
] as const;

// Returns the earliest timestamp (ms) allowed by a range value, or null for all time.
export function sinceMs(range: string | undefined): number | null {
  const r = RANGES.find((x) => x.value === (range ?? ""));
  return r?.days ? Date.now() - r.days * 86_400_000 : null;
}

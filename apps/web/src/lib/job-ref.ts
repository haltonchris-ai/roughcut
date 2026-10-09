// Short, stable, human-readable reference for a job, derived from its id.
export function jobRef(id: string): string {
  return "J-" + id.replace(/-/g, "").slice(0, 6).toUpperCase();
}

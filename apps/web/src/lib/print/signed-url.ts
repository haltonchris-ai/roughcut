import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

const BUCKET = "print-assets";

export async function signedPrintUrl(path: string): Promise<string | null> {
  const admin = createAdminClient();
  const { data } = await admin.storage.from(BUCKET).createSignedUrl(path, 60 * 10);
  return data?.signedUrl ?? null;
}

// createSignedUrl happily signs paths that don't exist, so check the folder
// listing first. Returns null when the file isn't actually there.
export async function signedPrintUrlIfExists(path: string): Promise<string | null> {
  const admin = createAdminClient();
  const slash = path.lastIndexOf("/");
  const folder = path.slice(0, slash);
  const name = path.slice(slash + 1);
  const { data } = await admin.storage.from(BUCKET).list(folder, { search: name, limit: 5 });
  if (!data?.some((f) => f.name === name)) return null;
  return signedPrintUrl(path);
}

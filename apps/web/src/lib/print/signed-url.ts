import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

export async function signedPrintUrl(path: string): Promise<string | null> {
  const admin = createAdminClient();
  const { data } = await admin.storage.from("print-assets").createSignedUrl(path, 60 * 10);
  return data?.signedUrl ?? null;
}

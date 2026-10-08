import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

const BUCKET = "print-assets";

// Path convention mirrors box-photos: {company_id}/... so the storage RLS
// policy (storage.foldername(name)[1] = company_id) scopes access the same
// way every other table does.
export async function uploadPrintAsset(companyId: string, relativePath: string, body: Buffer, contentType: string): Promise<string> {
  const admin = createAdminClient();
  const fullPath = `${companyId}/${relativePath}`;
  const { error } = await admin.storage.from(BUCKET).upload(fullPath, body, {
    contentType,
    upsert: true, // idempotent: reprocessing an order overwrites its own prior art
  });
  if (error) throw error;
  return fullPath;
}

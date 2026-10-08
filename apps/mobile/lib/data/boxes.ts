import { supabase } from "@/lib/supabase";
import {
  cacheBox,
  cacheBoxes,
  getCachedBox,
  getCachedBoxByPublicCode,
  getCachedBoxesForJob,
} from "@/lib/offline/cache";
import { queueMarkInstalled, queueSpecifyBox } from "@/lib/offline/queue";
import type { Box, BoxSpecInput } from "@roughcut/shared";

export async function listBoxesForJob(jobId: string): Promise<Box[]> {
  try {
    const { data, error } = await supabase.from("boxes").select("*").eq("job_id", jobId).order("short_code");
    if (error) throw error;
    const boxes = (data ?? []) as Box[];
    await cacheBoxes(jobId, boxes);
    return boxes;
  } catch {
    return getCachedBoxesForJob(jobId);
  }
}

export async function getBox(boxId: string): Promise<Box | null> {
  try {
    const { data, error } = await supabase.from("boxes").select("*").eq("id", boxId).maybeSingle();
    if (error) throw error;
    if (data) await cacheBox(data as Box);
    return (data as Box) ?? null;
  } catch {
    return getCachedBox(boxId);
  }
}

// Scan lookup needs network (a code that isn't cached yet can't be resolved
// offline) but falls back to the cache so re-scanning something already
// seen this session still works with no signal.
export async function getBoxByPublicCode(publicCode: string): Promise<Box | null> {
  try {
    const { data, error } = await supabase.from("boxes").select("*").eq("public_code", publicCode).maybeSingle();
    if (error) throw error;
    if (data) await cacheBox(data as Box);
    return (data as Box) ?? null;
  } catch {
    return getCachedBoxByPublicCode(publicCode);
  }
}

// Ad hoc box creation (unknown sticker, foreman only) needs a server round
// trip to mint public_code/short_code — there's no sensible offline queue
// semantics for "create, but I don't know my own id yet" in this app, so
// this one requires connectivity and throws if there isn't any. See
// DECISIONS.md.
export async function createAdHocBoxAndSpec(jobId: string, companyId: string, spec: BoxSpecInput): Promise<Box> {
  const { data, error } = await supabase
    .from("boxes")
    .insert({
      company_id: companyId,
      job_id: jobId,
      box_type: spec.box_type,
      size: spec.size,
      height_aff: spec.height_aff,
      circuit: spec.circuit,
      notes: spec.notes ?? null,
      status: "specified",
    })
    .select()
    .single();
  if (error) throw new Error("Creating a new box needs a connection. Try again once you're back online.");
  await cacheBox(data as Box);
  return data as Box;
}

// Specifying an EXISTING box (the common case — pre-minted by a sticker
// order or already created while online) is fully offline-capable: it
// writes an optimistic update to the cache immediately and queues the real
// write for whenever a connection comes back.
export async function specifyBox(boxId: string, spec: BoxSpecInput, localPhotoUri: string | null): Promise<void> {
  await queueSpecifyBox(boxId, spec, localPhotoUri);
}

export async function markBoxInstalled(boxId: string): Promise<void> {
  await queueMarkInstalled(boxId);
}

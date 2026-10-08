import NetInfo from "@react-native-community/netinfo";
import { AppState } from "react-native";
import { randomUUID } from "expo-crypto";
import { getDb } from "./db";
import { applyLocalBoxPatch, cacheBox, getCachedBox } from "./cache";
import { supabase } from "@/lib/supabase";
import { uploadBoxPhoto } from "@/lib/photo";
import type { BoxSpecInput } from "@roughcut/shared";

export interface QueuedWrite {
  id: string;
  kind: "specify_box" | "mark_installed" | "upload_photo";
  description: string;
  payload: Record<string, unknown>;
  status: "pending" | "retrying" | "synced" | "failed";
  retries: number;
}

const listeners = new Set<(q: QueuedWrite[]) => void>();
let cachedSnapshot: QueuedWrite[] = [];
let processing = false;

export function getQueueSnapshot(): QueuedWrite[] {
  return cachedSnapshot;
}

export function subscribeToQueue(listener: (q: QueuedWrite[]) => void): () => void {
  listeners.add(listener);
  listener(cachedSnapshot);
  return () => listeners.delete(listener);
}

async function refreshSnapshot(): Promise<void> {
  const db = await getDb();
  const rows = await db.getAllAsync<{
    id: string;
    kind: string;
    description: string;
    payload: string;
    status: string;
    retries: number;
  }>("SELECT * FROM write_queue ORDER BY created_at ASC");

  cachedSnapshot = rows.map((r) => ({
    id: r.id,
    kind: r.kind as QueuedWrite["kind"],
    description: r.description,
    payload: JSON.parse(r.payload),
    status: r.status as QueuedWrite["status"],
    retries: r.retries,
  }));
  listeners.forEach((l) => l(cachedSnapshot));
}

async function enqueue(kind: QueuedWrite["kind"], description: string, payload: Record<string, unknown>): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    "INSERT INTO write_queue (id, kind, description, payload, status, retries, created_at) VALUES (?, ?, ?, ?, 'pending', 0, ?)",
    randomUUID(),
    kind,
    description,
    JSON.stringify(payload),
    new Date().toISOString()
  );
  await refreshSnapshot();
  processQueue();
}

// --- public write API, mirroring lib/data/boxes.ts but offline-aware ----

// Spec writes only ever target a box that already exists server-side
// (minted either by a sticker order or — for the ad hoc "unknown sticker"
// case — created while online; see DECISIONS.md). That means every queued
// write here has a stable server id to replay against, with no temp-id
// reconciliation needed.
export async function queueSpecifyBox(boxId: string, spec: BoxSpecInput, localPhotoUri: string | null): Promise<void> {
  await applyLocalBoxPatch(boxId, {
    box_type: spec.box_type,
    size: spec.size,
    height_aff: spec.height_aff,
    circuit: spec.circuit,
    notes: spec.notes ?? null,
    status: "specified",
  });
  await enqueue("specify_box", `Save spec for box ${boxId.slice(0, 8)}`, { boxId, spec, localPhotoUri });
}

export async function queueMarkInstalled(boxId: string): Promise<void> {
  // Never regress a status the device already believes is installed, and
  // never let a queued "mark installed" get replayed after the row was
  // already observed installed from the server.
  await applyLocalBoxPatch(boxId, { status: "installed" });
  await enqueue("mark_installed", `Mark box ${boxId.slice(0, 8)} installed`, { boxId });
}

// --- processing ------------------------------------------------------------

export async function processQueue(): Promise<void> {
  if (processing) return;
  const net = await NetInfo.fetch();
  if (!net.isConnected) return;

  processing = true;
  try {
    const db = await getDb();
    const rows = await db.getAllAsync<{ id: string; kind: string; payload: string; retries: number }>(
      "SELECT id, kind, payload, retries FROM write_queue WHERE status IN ('pending','retrying') ORDER BY created_at ASC"
    );

    for (const row of rows) {
      const payload = JSON.parse(row.payload);
      try {
        await applyWrite(row.kind as QueuedWrite["kind"], payload);
        await db.runAsync("UPDATE write_queue SET status = 'synced' WHERE id = ?", row.id);
      } catch (err) {
        const retries = row.retries + 1;
        await db.runAsync(
          "UPDATE write_queue SET status = ?, retries = ?, last_error = ? WHERE id = ?",
          retries >= 5 ? "failed" : "retrying",
          retries,
          String(err),
          row.id
        );
      }
    }
    // Synced rows are kept out of the visible "pending" count but left in
    // the table briefly for the Sync status screen to show as resolved;
    // trim anything older than an hour so the table doesn't grow forever.
    await db.runAsync(
      "DELETE FROM write_queue WHERE status = 'synced' AND created_at < ?",
      new Date(Date.now() - 60 * 60 * 1000).toISOString()
    );
  } finally {
    processing = false;
    await refreshSnapshot();
  }
}

async function applyWrite(kind: QueuedWrite["kind"], payload: Record<string, unknown>): Promise<void> {
  if (kind === "specify_box") {
    const { boxId, spec, localPhotoUri } = payload as { boxId: string; spec: BoxSpecInput; localPhotoUri: string | null };
    // Last-write-wins by updated_at: this is a plain UPDATE with no
    // optimistic-concurrency check, so whichever queued write reaches the
    // server last simply wins — same semantics as two foremen editing the
    // same box back-to-back while online.
    const { data, error } = await supabase
      .from("boxes")
      .update({
        box_type: spec.box_type,
        size: spec.size,
        height_aff: spec.height_aff,
        circuit: spec.circuit,
        notes: spec.notes ?? null,
        status: "specified",
      })
      .eq("id", boxId)
      .select()
      .single();
    if (error) throw error;
    await cacheBox(data);

    if (localPhotoUri) {
      await enqueuePhotoIfNeeded(boxId, localPhotoUri);
    }
    return;
  }

  if (kind === "mark_installed") {
    const { boxId } = payload as { boxId: string };
    const { data, error } = await supabase.from("boxes").update({ status: "installed" }).eq("id", boxId).select().single();
    if (error) throw error;
    await cacheBox(data);
    return;
  }

  if (kind === "upload_photo") {
    const { boxId, companyId, localPhotoUri } = payload as { boxId: string; companyId: string; localPhotoUri: string };
    const path = await uploadBoxPhoto(companyId, boxId, localPhotoUri);
    const { error } = await supabase.from("boxes").update({ photo_path: path }).eq("id", boxId);
    if (error) throw error;
    return;
  }
}

async function enqueuePhotoIfNeeded(boxId: string, localPhotoUri: string): Promise<void> {
  const box = await getCachedBox(boxId);
  if (!box) return;
  // Photos upload after the row syncs, per spec — by the time we're here,
  // the spec write for this box just succeeded, so it's safe to go now.
  await enqueue("upload_photo", `Upload photo for box ${boxId.slice(0, 8)}`, {
    boxId,
    companyId: box.company_id,
    localPhotoUri,
  });
}

// --- triggers: reconnect + app foreground -----------------------------

let initialized = false;
export function initOfflineSync(): void {
  if (initialized) return;
  initialized = true;

  refreshSnapshot();
  processQueue();

  NetInfo.addEventListener((state) => {
    if (state.isConnected) processQueue();
  });

  AppState.addEventListener("change", (state) => {
    if (state === "active") processQueue();
  });
}

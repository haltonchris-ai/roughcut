"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireCompanyProfile } from "@/lib/current-profile";
import { createAdminClient } from "@/lib/supabase/admin";

function friendlyError(error: { code?: string; message: string }): string {
  if (error.code === "P0402") {
    return "Plan limit reached, or billing isn't current. Check Billing to upgrade.";
  }
  return error.message;
}

export async function createJob(formData: FormData): Promise<void> {
  const { profile, supabase } = await requireCompanyProfile();
  if (profile.role === "installer") {
    redirect("/app/jobs?error=" + encodeURIComponent("Installers cannot create jobs."));
  }

  const name = String(formData.get("name") ?? "").trim();
  const address = String(formData.get("address") ?? "").trim();
  if (!name || !address) {
    redirect("/app/jobs?error=" + encodeURIComponent("Job name and address are required."));
  }

  // Guard against double-submits (slow page, repeated clicks): an open job with
  // the same name and address already exists, so don't create another.
  const { data: dupes } = await supabase
    .from("jobs")
    .select("id")
    .eq("company_id", profile.company_id)
    .eq("status", "open")
    .ilike("name", name.replace(/[%_]/g, "\\$&"))
    .ilike("address", address.replace(/[%_]/g, "\\$&"))
    .limit(1);
  if (dupes && dupes.length > 0) {
    redirect("/app/jobs?error=" + encodeURIComponent("An open job with that name and address already exists."));
  }

  const { error } = await supabase.from("jobs").insert({
    company_id: profile.company_id,
    name,
    address,
    created_by: profile.id,
  });

  if (error) {
    redirect("/app/jobs?error=" + encodeURIComponent(friendlyError(error)));
  }

  revalidatePath("/app/jobs");
  redirect("/app/jobs");
}

export async function closeJob(formData: FormData): Promise<void> {
  const { profile, supabase } = await requireCompanyProfile();
  const jobId = String(formData.get("jobId") ?? "");
  if (profile.role === "installer" || !jobId) {
    redirect("/app/jobs");
  }

  await supabase.from("jobs").update({ status: "closed" }).eq("id", jobId);
  revalidatePath("/app/jobs");
  redirect(`/app/jobs/${jobId}`);
}

// Jobs have no delete policy under RLS (data is normally kept), so deletion is
// done server-side after explicit checks. Only company admins, and only for
// jobs that never had stickers ordered against them.
export async function deleteJob(formData: FormData): Promise<void> {
  const { profile } = await requireCompanyProfile();
  const jobId = String(formData.get("jobId") ?? "");
  if (profile.role !== "company_admin" || !jobId) {
    redirect("/app/jobs?error=" + encodeURIComponent("Only company admins can delete jobs."));
  }

  const admin = createAdminClient();
  const { data: job } = await admin
    .from("jobs")
    .select("id, company_id")
    .eq("id", jobId)
    .maybeSingle();
  if (!job || job.company_id !== profile.company_id) {
    redirect("/app/jobs");
  }

  const { count: orders } = await admin
    .from("sticker_orders")
    .select("id", { count: "exact", head: true })
    .eq("job_id", jobId);
  if ((orders ?? 0) > 0) {
    redirect(
      "/app/jobs?error=" +
        encodeURIComponent("This job has sticker orders, so it can't be deleted. Close it instead.")
    );
  }

  const { error } = await admin.from("jobs").delete().eq("id", jobId).eq("company_id", profile.company_id);
  if (error) {
    redirect("/app/jobs?error=" + encodeURIComponent("Could not delete job: " + error.message));
  }

  revalidatePath("/app/jobs");
  redirect("/app/jobs");
}

// Regenerates the PDFs for one of this company's sticker orders (same box
// codes, current layout). Company admins only.
export async function reprintOrder(formData: FormData): Promise<void> {
  const { profile, supabase } = await requireCompanyProfile();
  const orderId = String(formData.get("orderId") ?? "");
  const jobId = String(formData.get("jobId") ?? "");
  const rt = String(formData.get("returnTo") ?? "");
  const back = rt.startsWith("/app/") && !rt.startsWith("//") ? rt : `/app/jobs/${jobId}`;
  if (profile.role !== "company_admin" || !orderId) {
    redirect(back);
  }
  // RLS scopes this select to the caller's company.
  const { data: order } = await supabase.from("sticker_orders").select("id").eq("id", orderId).maybeSingle();
  if (!order) redirect(back);

  try {
    const { processStickerOrder } = await import("@/lib/print");
    await processStickerOrder(orderId);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    redirect(`${back}${back.includes("?") ? "&" : "?"}error=` + encodeURIComponent("Reprint failed: " + msg.slice(0, 180)));
  }
  revalidatePath(`/app/jobs/${jobId}`);
  revalidatePath("/app/stickers");
  redirect(`${back}${back.includes("?") ? "&" : "?"}reprinted=1#job-${jobId}`);
}

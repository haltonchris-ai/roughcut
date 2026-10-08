"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireCompanyProfile } from "@/lib/current-profile";

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

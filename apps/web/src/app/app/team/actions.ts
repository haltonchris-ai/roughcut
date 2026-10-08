"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import crypto from "node:crypto";
import { requireCompanyProfile } from "@/lib/current-profile";
import { createAdminClient } from "@/lib/supabase/admin";
import { env } from "@/lib/env";
import type { UserRole } from "@roughcut/shared";

function friendlyError(error: { code?: string; message: string }): string {
  if (error.code === "P0402") {
    return "Plan user limit reached, or billing isn't current. Check Billing to upgrade.";
  }
  return error.message;
}

// The spec: "Invite creates the user and emails a set-password link." There's
// no transactional email provider wired up (see DECISIONS.md), so this
// creates the account right away with a random password the invitee never
// sees, and hands the admin a Supabase-hosted "set your password" link to
// copy and send however they like, standing in for the email step.
export async function createInvite(formData: FormData): Promise<void> {
  const { profile, supabase } = await requireCompanyProfile();
  if (profile.role !== "company_admin") {
    redirect("/app/team?error=" + encodeURIComponent("Only an admin can invite team members."));
  }

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const role = String(formData.get("role") ?? "") as UserRole;
  if (!email || !["foreman", "installer"].includes(role)) {
    redirect("/app/team?error=" + encodeURIComponent("Enter an email and pick a role."));
  }

  const token = crypto.randomBytes(24).toString("base64url");
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  // Insert the invite row first (hits the plan's user-cap trigger before any
  // auth user is created).
  const { error: inviteErr } = await supabase.from("invites").insert({
    company_id: profile.company_id,
    email,
    role,
    token,
    expires_at: expiresAt,
  });
  if (inviteErr) {
    redirect("/app/team?error=" + encodeURIComponent(friendlyError(inviteErr)));
  }

  const admin = createAdminClient();
  const tempPassword = crypto.randomBytes(18).toString("base64url");
  const { data: created, error: userErr } = await admin.auth.admin.createUser({
    email,
    password: tempPassword,
    email_confirm: true,
  });
  if (userErr || !created.user) {
    await supabase.from("invites").delete().eq("token", token);
    redirect("/app/team?error=" + encodeURIComponent(userErr?.message ?? "Could not create the account."));
  }

  await admin.from("profiles").insert({
    id: created.user.id,
    company_id: profile.company_id,
    role,
    full_name: email.split("@")[0],
  });
  await admin.from("invites").update({ accepted_at: new Date().toISOString() }).eq("token", token);

  const { data: link } = await admin.auth.admin.generateLink({
    type: "recovery",
    email,
    options: { redirectTo: `${env.webOrigin()}/login` },
  });

  revalidatePath("/app/team");
  redirect(
    "/app/team?invited=" +
      encodeURIComponent(email) +
      "&link=" +
      encodeURIComponent(link?.properties?.action_link ?? "")
  );
}

export async function setUserDisabled(formData: FormData): Promise<void> {
  const { profile } = await requireCompanyProfile();
  if (profile.role !== "company_admin") {
    redirect("/app/team");
  }
  const userId = String(formData.get("userId") ?? "");
  const disable = formData.get("disable") === "true";
  if (!userId) redirect("/app/team");

  // Uses the admin client deliberately: disabling teammates is an
  // administrative action on another user's row, which profiles_update_self
  // intentionally does not allow even for a company_admin.
  const { createAdminClient } = await import("@/lib/supabase/admin");
  const admin = createAdminClient();
  await admin
    .from("profiles")
    .update({ disabled_at: disable ? new Date().toISOString() : null })
    .eq("id", userId)
    .eq("company_id", profile.company_id);

  await admin.from("audit_log").insert({
    actor_id: profile.id,
    action: disable ? "profile.disable" : "profile.enable",
    target_table: "profiles",
    target_id: userId,
  });

  revalidatePath("/app/team");
  redirect("/app/team");
}

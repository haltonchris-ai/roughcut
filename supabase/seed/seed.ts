// Seeds a demo tenant. Run with `npm run seed` (reads .env via --env-file).
//
// Creates:
//   - one platform owner (from PLATFORM_OWNER_EMAIL / PLATFORM_OWNER_PASSWORD)
//   - one demo company on the crew plan
//   - one company_admin, one foreman, one installer in that company
//   - one open job
//   - five boxes with specs already filled in (status "specified")
//   - one sticker_order in status "ready_for_manual_print"
//
// Uses the Supabase service role key, so it runs outside RLS. Never run this
// against a production project with real customer data.

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.EXPO_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const PLATFORM_OWNER_EMAIL = process.env.PLATFORM_OWNER_EMAIL;
const PLATFORM_OWNER_PASSWORD = process.env.PLATFORM_OWNER_PASSWORD;

// Fixed demo password for the three seeded company users. Documented in
// README.md. Not used for the platform owner, which comes from .env.
const DEMO_PASSWORD = "RoughCut-Demo-1!";

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env");
  process.exit(1);
}
if (!PLATFORM_OWNER_EMAIL || !PLATFORM_OWNER_PASSWORD) {
  console.error("Missing PLATFORM_OWNER_EMAIL / PLATFORM_OWNER_PASSWORD in .env");
  process.exit(1);
}

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function createAuthUser(email: string, password: string) {
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (error) {
    // Idempotent re-runs: if the user already exists, look it up instead of failing.
    if (String(error.message).toLowerCase().includes("already")) {
      const { data: list, error: listErr } = await admin.auth.admin.listUsers();
      if (listErr) throw listErr;
      const existing = list.users.find((u) => u.email === email);
      if (existing) return existing.id;
    }
    throw error;
  }
  return data.user!.id;
}

async function main() {
  console.log("Seeding platform owner...");
  const ownerId = await createAuthUser(PLATFORM_OWNER_EMAIL!, PLATFORM_OWNER_PASSWORD!);
  {
    const { error } = await admin.from("profiles").upsert({
      id: ownerId,
      company_id: null,
      role: "platform_owner",
      full_name: "Platform Owner",
    });
    if (error) throw error;
  }

  console.log("Seeding demo company...");
  const { data: company, error: companyErr } = await admin
    .from("companies")
    .insert({ name: "Halton Electric (Demo)", plan: "crew", subscription_status: "active" })
    .select()
    .single();
  if (companyErr) throw companyErr;
  const companyId = company.id as string;

  console.log("Seeding demo users...");
  const adminId = await createAuthUser("admin@demo.roughcut.app", DEMO_PASSWORD);
  const foremanId = await createAuthUser("foreman@demo.roughcut.app", DEMO_PASSWORD);
  const installerId = await createAuthUser("installer@demo.roughcut.app", DEMO_PASSWORD);

  {
    const { error } = await admin.from("profiles").upsert([
      { id: adminId, company_id: companyId, role: "company_admin", full_name: "Dana Admin" },
      { id: foremanId, company_id: companyId, role: "foreman", full_name: "Dave White" },
      { id: installerId, company_id: companyId, role: "installer", full_name: "Mia Torres" },
    ]);
    if (error) throw error;
  }

  console.log("Seeding demo job...");
  const { data: job, error: jobErr } = await admin
    .from("jobs")
    .insert({
      company_id: companyId,
      name: "412 Ridgewood Ave",
      address: "412 Ridgewood Ave, Springfield",
      status: "open",
      created_by: foremanId,
    })
    .select()
    .single();
  if (jobErr) throw jobErr;
  const jobId = job.id as string;

  console.log("Seeding boxes...");
  const boxSpecs = [
    { box_type: "single_gang", size: "Standard", height_aff: "48", circuit: "K1", notes: "Kitchen, west wall switch" },
    { box_type: "double_gang", size: "Standard", height_aff: "18", circuit: "K2", notes: "Kitchen island outlet" },
    { box_type: "round", size: "4 inch", height_aff: "—", circuit: "L1", notes: "Dining room ceiling light" },
    { box_type: "panel", size: "200A", height_aff: "66", circuit: "MAIN", notes: "Garage north wall panel" },
    { box_type: "weatherproof", size: "Standard", height_aff: "14", circuit: "EXT1", notes: "Back porch outlet, GFCI" },
  ] as const;

  const { error: boxesErr } = await admin.from("boxes").insert(
    boxSpecs.map((spec) => ({
      company_id: companyId,
      job_id: jobId,
      box_type: spec.box_type,
      size: spec.size,
      height_aff: spec.height_aff,
      circuit: spec.circuit,
      notes: spec.notes,
      status: "specified",
      specified_by: foremanId,
      specified_at: new Date().toISOString(),
    }))
  );
  if (boxesErr) throw boxesErr;

  console.log("Seeding sticker order...");
  const { error: orderErr } = await admin.from("sticker_orders").insert({
    company_id: companyId,
    job_id: jobId,
    quantity: 10,
    ship_to: {
      name: "Dana Admin",
      address: "412 Ridgewood Ave",
      city: "Springfield",
      region: "IL",
      postal_code: "62701",
      country: "US",
    },
    status: "ready_for_manual_print",
    created_by: adminId,
  });
  if (orderErr) throw orderErr;

  console.log("\nDone. Demo logins (password for all three: %s):", DEMO_PASSWORD);
  console.log("  company_admin: admin@demo.roughcut.app");
  console.log("  foreman:       foreman@demo.roughcut.app");
  console.log("  installer:     installer@demo.roughcut.app");
  console.log("Platform owner: %s (password from .env)", PLATFORM_OWNER_EMAIL);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

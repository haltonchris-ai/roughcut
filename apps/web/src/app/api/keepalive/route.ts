import { NextResponse } from "next/server";
import { env } from "@/lib/env";

// Daily ping (see vercel.json) so the free Supabase project is never paused for inactivity.
// Runs one tiny read through the REST API. If CRON_SECRET is set in Vercel, only Vercel's cron may call this.
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  const key = env.supabaseServiceRoleKey();
  const res = await fetch(`${env.supabaseUrl()}/rest/v1/companies?select=id&limit=1`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
    cache: "no-store",
  });
  return NextResponse.json({ ok: res.ok, status: res.status }, { status: res.ok ? 200 : 502 });
}

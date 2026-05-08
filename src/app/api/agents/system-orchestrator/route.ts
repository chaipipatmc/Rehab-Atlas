/**
 * System Orchestrator Agent — Cron + manual trigger.
 * Health watcher across every other agent. Stores a snapshot in
 * site_settings for the dashboard to read.
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { verifyWebhookSecret } from "@/lib/agents/base";
import {
  runSystemOrchestrator,
  getSystemHealthSnapshot,
} from "@/lib/agents/system-orchestrator";

export const maxDuration = 60;

const CRON_SECRET = process.env.CRON_SECRET;

async function isAdminUser(): Promise<boolean> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  return profile?.role === "admin";
}

// POST runs the health check now. GET reads the cached snapshot (cheap).
export async function POST(request: Request) {
  const authHeader = request.headers.get("authorization");
  const isCron = authHeader === `Bearer ${CRON_SECRET}`;
  const isWebhook = verifyWebhookSecret(request);

  if (!isCron && !isWebhook && !(await isAdminUser())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await runSystemOrchestrator();
    return NextResponse.json(result);
  } catch (err) {
    console.error("System Orchestrator error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function GET(request: Request) {
  // Cron triggers (Vercel sends Authorization header with CRON_SECRET) should
  // run a fresh check. Admin reads of the snapshot are cheap and don't trigger
  // a new check.
  const authHeader = request.headers.get("authorization");
  const isCron = authHeader === `Bearer ${CRON_SECRET}`;
  if (isCron) return POST(request);

  if (!(await isAdminUser())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const snapshot = await getSystemHealthSnapshot();
  return NextResponse.json(snapshot || { enabled: false });
}

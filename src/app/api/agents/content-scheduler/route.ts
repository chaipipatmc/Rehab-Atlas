/**
 * Content Scheduler Agent — Cron endpoint
 * Publishes 1 approved article per day at peak SEO time.
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { verifyWebhookSecret, verifyCronSecret } from "@/lib/agents/base";
import { publishFromPool, getPoolStats } from "@/lib/agents/content-scheduler";

export const maxDuration = 30;

export async function POST(request: Request) {
  const isCron = verifyCronSecret(request);
  const isWebhook = verifyWebhookSecret(request);

  if (!isCron && !isWebhook) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
    if (profile?.role !== "admin") return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }

  const url = new URL(request.url);
  const action = url.searchParams.get("action");

  if (action === "stats") {
    const stats = await getPoolStats();
    return NextResponse.json(stats);
  }

  try {
    const success = await publishFromPool();
    return NextResponse.json({ success });
  } catch (err) {
    console.error("Content Scheduler error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function GET(request: Request) {
  return POST(request);
}

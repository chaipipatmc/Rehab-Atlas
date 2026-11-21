/**
 * Outreach Orchestrator Cron API
 * Runs every 30 minutes to advance pipeline stages.
 */

import { NextResponse } from "next/server";
import { verifyWebhookSecret, verifyCronSecret } from "@/lib/agents/base";
import { runOrchestrator, sendDailyDigest, calculateMonthlyBlogTiers } from "@/lib/agents/outreach/orchestrator";

export const maxDuration = 300; // Vercel Pro: up to 300s

export async function POST(request: Request) {
  const isCron = verifyCronSecret(request);
  const isWebhook = verifyWebhookSecret(request);

  if (!isCron && !isWebhook) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const action = url.searchParams.get("action");

  // Special actions
  if (action === "digest") {
    await sendDailyDigest();
    return NextResponse.json({ success: true, action: "digest" });
  }

  if (action === "blog_tiers") {
    // No-op while BLOG_TIERS_ENABLED=false in orchestrator.ts (logs only).
    const result = await calculateMonthlyBlogTiers();
    return NextResponse.json({ success: true, action: "blog_tiers", ...result });
  }

  // Default: run orchestrator
  try {
    await runOrchestrator();
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Orchestrator error:", err);
    return NextResponse.json({ error: "Orchestrator failed" }, { status: 500 });
  }
}

export async function GET(request: Request) {
  return POST(request);
}

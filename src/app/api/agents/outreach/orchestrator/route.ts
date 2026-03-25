/**
 * Outreach Orchestrator Cron API
 * Runs every 30 minutes to advance pipeline stages.
 */

import { NextResponse } from "next/server";
import { verifyWebhookSecret } from "@/lib/agents/base";
import { runOrchestrator, sendDailyDigest, calculateMonthlyBlogTiers } from "@/lib/agents/outreach/orchestrator";

const CRON_SECRET = process.env.CRON_SECRET;

export async function POST(request: Request) {
  const authHeader = request.headers.get("authorization");
  const isCron = authHeader === `Bearer ${CRON_SECRET}`;
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
    await calculateMonthlyBlogTiers();
    return NextResponse.json({ success: true, action: "blog_tiers" });
  }

  // Default: run orchestrator
  await runOrchestrator();
  return NextResponse.json({ success: true });
}

export async function GET(request: Request) {
  return POST(request);
}

/**
 * Outreach Follow-up Cron API
 * Called daily to process pending follow-ups.
 */

import { NextResponse } from "next/server";
import { isAgentEnabled } from "@/lib/agents/config";
import { verifyWebhookSecret, verifyCronSecret } from "@/lib/agents/base";
import { processFollowUps } from "@/lib/agents/outreach/followup";

export async function POST(request: Request) {
  // Accept Vercel Cron auth OR webhook secret
  const isCron = verifyCronSecret(request);
  const isWebhook = verifyWebhookSecret(request);

  if (!isCron && !isWebhook) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const enabled = await isAgentEnabled("outreach_followup");
  if (!enabled) {
    return NextResponse.json({ skipped: true, reason: "Follow-up agent disabled" });
  }

  const stats = await processFollowUps();
  return NextResponse.json({ success: true, stats });
}

// GET for Vercel Cron compatibility
export async function GET(request: Request) {
  return POST(request);
}

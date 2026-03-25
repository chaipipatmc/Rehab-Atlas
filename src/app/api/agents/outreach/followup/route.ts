/**
 * Outreach Follow-up Cron API
 * Called daily to process pending follow-ups.
 */

import { NextResponse } from "next/server";
import { isAgentEnabled } from "@/lib/agents/config";
import { verifyWebhookSecret } from "@/lib/agents/base";
import { processFollowUps } from "@/lib/agents/outreach/followup";

const CRON_SECRET = process.env.CRON_SECRET;

export async function POST(request: Request) {
  // Accept Vercel Cron auth OR webhook secret
  const authHeader = request.headers.get("authorization");
  const isCron = authHeader === `Bearer ${CRON_SECRET}`;
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

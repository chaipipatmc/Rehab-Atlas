/**
 * Follow-up Agent — Cron Handler
 * Triggered daily by Vercel Cron at 02:00 UTC (09:00 Bangkok).
 * Also accepts manual trigger from admin dashboard.
 */

import { NextResponse } from "next/server";
import { isAgentEnabled } from "@/lib/agents/config";
import { processFollowUp } from "@/lib/agents/follow-up";
import { verifyWebhookSecret, verifyCronSecret } from "@/lib/agents/base";

export async function POST(request: Request) {
  // Verify either webhook secret or Vercel cron authorization
  // Fails closed: with no AGENT_WEBHOOK_SECRET / CRON_SECRET set, nothing is accepted.
  const isAuthorized = verifyWebhookSecret(request) || verifyCronSecret(request);

  if (!isAuthorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!(await isAgentEnabled("follow_up"))) {
    return NextResponse.json({ skipped: true, reason: "Agent disabled" });
  }

  try {
    await processFollowUp();
    return NextResponse.json({ processed: true });
  } catch (error) {
    console.error("Follow-up Agent error:", error);
    return NextResponse.json({ error: "Processing failed" }, { status: 500 });
  }
}

// Vercel Cron uses GET
export async function GET(request: Request) {
  return POST(request);
}

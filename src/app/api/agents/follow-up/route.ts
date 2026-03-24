/**
 * Follow-up Agent — Cron Handler
 * Triggered daily by Vercel Cron at 02:00 UTC (09:00 Bangkok).
 * Also accepts manual trigger from admin dashboard.
 */

import { NextResponse } from "next/server";
import { isAgentEnabled } from "@/lib/agents/config";
import { processFollowUp } from "@/lib/agents/follow-up";

export async function POST(request: Request) {
  // Verify either webhook secret or Vercel cron authorization
  const authHeader = request.headers.get("authorization");
  const webhookSecret = request.headers.get("x-webhook-secret");
  const cronSecret = process.env.CRON_SECRET;

  const isAuthorized =
    webhookSecret === (process.env.AGENT_WEBHOOK_SECRET || "rehab-atlas-agent-secret") ||
    (cronSecret && authHeader === `Bearer ${cronSecret}`);

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

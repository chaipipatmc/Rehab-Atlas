/**
 * Lead Verify Agent — Webhook Handler
 * Triggered by Supabase webhooks on `leads` table (INSERT where status='new').
 */

import { NextResponse } from "next/server";
import { isAgentEnabled } from "@/lib/agents/config";
import { verifyWebhookSecret, logAgentAction } from "@/lib/agents/base";
import { processLeadVerify } from "@/lib/agents/lead-verify";

export async function POST(request: Request) {
  if (!verifyWebhookSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!(await isAgentEnabled("lead_verify"))) {
    return NextResponse.json({ skipped: true, reason: "Agent disabled" });
  }

  try {
    const body = await request.json();
    const { type, table, record } = body;

    if (table !== "leads" || type !== "INSERT" || !record?.id) {
      return NextResponse.json({ skipped: true, reason: "Not a new lead" });
    }

    if (record.status !== "new") {
      return NextResponse.json({ skipped: true, reason: "Lead not in 'new' status" });
    }

    await logAgentAction({
      agent_type: "lead_verify",
      action: "triggered",
      details: { lead_id: record.id, name: record.name, urgency: record.urgency },
    });

    await processLeadVerify(record.id);
    return NextResponse.json({ processed: true });
  } catch (error) {
    console.error("Lead Verify Agent error:", error);
    return NextResponse.json({ error: "Processing failed" }, { status: 500 });
  }
}

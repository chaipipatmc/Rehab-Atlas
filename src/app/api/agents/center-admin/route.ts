/**
 * Center Admin Agent — Webhook Handler
 * Triggered by Supabase webhooks on `centers` and `center_edit_requests` tables.
 */

import { NextResponse } from "next/server";
import { isAgentEnabled } from "@/lib/agents/config";
import { verifyWebhookSecret, logAgentAction } from "@/lib/agents/base";
import { processCenterAdmin } from "@/lib/agents/center-admin";

export async function POST(request: Request) {
  // Verify webhook secret
  if (!verifyWebhookSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Check if agent is enabled
  if (!(await isAgentEnabled("center_admin"))) {
    return NextResponse.json({ skipped: true, reason: "Agent disabled" });
  }

  try {
    const body = await request.json();
    const { type, table, record } = body;

    if (!record?.id) {
      return NextResponse.json({ error: "Missing record ID" }, { status: 400 });
    }

    const entityType = table === "center_edit_requests" ? "center_edit_request" : "center";

    // Only process relevant events
    if (table === "centers" && type === "INSERT") {
      // New center created
    } else if (table === "centers" && type === "UPDATE" && record.status === "draft") {
      // Center updated while in draft
    } else if (table === "center_edit_requests" && type === "INSERT" && record.status === "pending") {
      // New edit request
    } else {
      return NextResponse.json({ skipped: true, reason: "Event not relevant" });
    }

    await logAgentAction({
      agent_type: "center_admin",
      action: "triggered",
      details: { type, table, entity_id: record.id },
    });

    await processCenterAdmin({
      entityType: entityType as "center" | "center_edit_request",
      entityId: record.id,
    });

    return NextResponse.json({ processed: true });
  } catch (error) {
    console.error("Center Admin Agent error:", error);
    return NextResponse.json({ error: "Processing failed" }, { status: 500 });
  }
}

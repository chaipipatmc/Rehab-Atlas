/**
 * Content Admin Agent — Webhook Handler
 * Triggered by Supabase webhooks on `pages` table (INSERT/UPDATE where status='draft').
 */

import { NextResponse } from "next/server";
import { isAgentEnabled } from "@/lib/agents/config";
import { verifyWebhookSecret, logAgentAction } from "@/lib/agents/base";
import { processContentAdmin } from "@/lib/agents/content-admin";

export async function POST(request: Request) {
  if (!verifyWebhookSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!(await isAgentEnabled("content_admin"))) {
    return NextResponse.json({ skipped: true, reason: "Agent disabled" });
  }

  try {
    const body = await request.json();
    const { type, table, record } = body;

    if (table !== "pages" || !record?.id) {
      return NextResponse.json({ skipped: true, reason: "Not a pages event" });
    }

    // Only process drafts with content
    if (record.status !== "draft" || !record.content) {
      return NextResponse.json({ skipped: true, reason: "Not a draft with content" });
    }

    await logAgentAction({
      agent_type: "content_admin",
      action: "triggered",
      details: { type, page_id: record.id, title: record.title },
    });

    await processContentAdmin(record.id);
    return NextResponse.json({ processed: true });
  } catch (error) {
    console.error("Content Admin Agent error:", error);
    return NextResponse.json({ error: "Processing failed" }, { status: 500 });
  }
}

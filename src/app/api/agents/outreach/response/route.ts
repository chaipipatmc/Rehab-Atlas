/**
 * Outreach Response Handler API
 * Receives Gmail push notifications or polling results for inbound replies.
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isAgentEnabled } from "@/lib/agents/config";
import { verifyWebhookSecret } from "@/lib/agents/base";
import { processInboundReplies, processThreadReply } from "@/lib/agents/outreach/response-handler";

// POST: Handle Gmail push notification or trigger manual scan
export async function POST(request: Request) {
  const CRON_SECRET = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");
  const isCron = CRON_SECRET && authHeader === `Bearer ${CRON_SECRET}`;
  const isWebhook = verifyWebhookSecret(request);

  if (!isCron && !isWebhook) {
    // Admin manual trigger
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
    if (profile?.role !== "admin") return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }

  const enabled = await isAgentEnabled("outreach_response");
  if (!enabled) return NextResponse.json({ skipped: true, reason: "Response agent disabled" });

  const stats = await processInboundReplies();
  return NextResponse.json({ success: true, stats });
}

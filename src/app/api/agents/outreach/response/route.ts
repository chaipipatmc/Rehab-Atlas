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
  const isWebhook = verifyWebhookSecret(request);

  if (!isWebhook) {
    // Check for Google Pub/Sub push
    const contentType = request.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      const body = await request.json();

      // Google Pub/Sub format
      if (body.message?.data) {
        const enabled = await isAgentEnabled("outreach_response");
        if (!enabled) return NextResponse.json({ skipped: true });

        // Pub/Sub sends a notification, we need to scan for new replies
        const stats = await processInboundReplies();
        return NextResponse.json({ success: true, stats });
      }

      // Direct thread notification
      if (body.thread_id) {
        const enabled = await isAgentEnabled("outreach_response");
        if (!enabled) return NextResponse.json({ skipped: true });

        await processThreadReply(body.thread_id);
        return NextResponse.json({ success: true });
      }
    }

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

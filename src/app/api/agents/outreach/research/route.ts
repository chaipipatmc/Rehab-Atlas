/**
 * Outreach Research API — Trigger research + email drafting for centers
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isAgentEnabled } from "@/lib/agents/config";
import { verifyWebhookSecret } from "@/lib/agents/base";
import { processResearchAndDraft } from "@/lib/agents/outreach/research";

export const maxDuration = 60;

// POST: Trigger research for a center (admin or webhook)
export async function POST(request: Request) {
  // Accept webhook secret OR admin auth
  const isWebhook = verifyWebhookSecret(request);

  if (!isWebhook) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
    if (profile?.role !== "admin") return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }

  const enabled = await isAgentEnabled("outreach_research");
  if (!enabled) {
    return NextResponse.json({ error: "Research agent is disabled" }, { status: 400 });
  }

  const { center_id } = await request.json();
  if (!center_id) {
    return NextResponse.json({ error: "center_id required" }, { status: 400 });
  }

  const success = await processResearchAndDraft(center_id);
  return NextResponse.json({ success });
}

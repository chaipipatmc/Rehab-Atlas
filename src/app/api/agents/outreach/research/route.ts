/**
 * Outreach Research API — Trigger research + email drafting for centers
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isAgentEnabled } from "@/lib/agents/config";
import { verifyWebhookSecret } from "@/lib/agents/base";
import { processResearchAndDraft } from "@/lib/agents/outreach/research";
import { createAdminClient } from "@/lib/supabase/admin";

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

  // Batch mode: pick the next "new" center from the pipeline
  if (center_id === "__batch__") {
    const admin = createAdminClient();
    const { data: next } = await admin
      .from("outreach_pipeline")
      .select("center_id")
      .eq("stage", "new")
      .order("created_at", { ascending: true })
      .limit(1)
      .single();

    if (!next) return NextResponse.json({ success: false, reason: "No new centers" });

    try {
      const success = await processResearchAndDraft(next.center_id as string);
      return NextResponse.json({ success, center_id: next.center_id });
    } catch (err) {
      console.error("Batch research failed:", err);
      return NextResponse.json({ success: false, error: String(err) });
    }
  }

  const success = await processResearchAndDraft(center_id);
  return NextResponse.json({ success });
}

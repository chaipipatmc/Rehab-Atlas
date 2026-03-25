/**
 * Outreach Agreement API
 * Handles agreement preparation, PandaDoc webhooks.
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAgentEnabled } from "@/lib/agents/config";
import { logAgentAction } from "@/lib/agents/base";
import { prepareAgreement, checkAgreementStatus } from "@/lib/agents/outreach/agreement";
import { activateCenter } from "@/lib/agents/outreach/activation";
import { verifyPandaDocWebhook, mapPandaDocStatus } from "@/lib/agents/outreach/esign";

// POST: Prepare agreement or handle PandaDoc webhook
export async function POST(request: Request) {
  const contentType = request.headers.get("content-type") || "";

  // PandaDoc webhook
  const signature = request.headers.get("x-pandadoc-signature");
  if (signature) {
    const rawBody = await request.text();

    if (!verifyPandaDocWebhook(rawBody, signature)) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 403 });
    }

    const payload = JSON.parse(rawBody);
    const documentId = payload.data?.[0]?.id;
    const eventType = payload.event;

    if (!documentId) {
      return NextResponse.json({ error: "No document ID" }, { status: 400 });
    }

    // Find pipeline entry by PandaDoc document ID
    const admin = createAdminClient();
    const { data: pipeline } = await admin
      .from("outreach_pipeline")
      .select("id, stage, esign_status")
      .eq("esign_envelope_id", documentId)
      .single();

    if (!pipeline) {
      return NextResponse.json({ error: "Pipeline not found for document" }, { status: 404 });
    }

    // Update status
    const newStatus = mapPandaDocStatus(eventType);
    const updates: Record<string, unknown> = { esign_status: newStatus };

    if (newStatus === "completed") {
      updates.stage = "agreement_signed";
      updates.agreement_signed_at = new Date().toISOString();

      // Auto-activate if activation agent is enabled
      if (await isAgentEnabled("outreach_activation")) {
        await activateCenter(pipeline.id as string);
      }
    }

    await admin.from("outreach_pipeline").update(updates).eq("id", pipeline.id);

    await logAgentAction({
      agent_type: "outreach_agreement",
      action: "pandadoc_webhook",
      details: { event: eventType, document_id: documentId, pipeline_id: pipeline.id },
    });

    return NextResponse.json({ success: true });
  }

  // Admin trigger: prepare agreement
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") return NextResponse.json({ error: "Admin only" }, { status: 403 });

  const body = await request.json();

  if (body.action === "prepare" && body.pipeline_id) {
    const enabled = await isAgentEnabled("outreach_agreement");
    if (!enabled) return NextResponse.json({ error: "Agreement agent disabled" }, { status: 400 });

    const success = await prepareAgreement(body.pipeline_id);
    return NextResponse.json({ success });
  }

  if (body.action === "check_status" && body.pipeline_id) {
    const status = await checkAgreementStatus(body.pipeline_id);
    return NextResponse.json({ status });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}

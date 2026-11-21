/**
 * Agent 5 — Activation Agent
 * Marks the center active after agreement signing and queues the welcome
 * email for admin approval. Does not write commission fields or auto-send.
 */

import { createAdminClient } from "@/lib/supabase/admin";
import { createAgentTask, logAgentAction } from "@/lib/agents/base";
import { sendAgentEmail } from "@/lib/agents/notify";
import { sendOutreachEmail, withUnsubscribeFooter } from "./policy";
import type { OutreachPipeline, CenterResearch } from "@/types/agent";

const PERSONA = process.env.OUTREACH_PERSONA_NAME || "Sarah";

/**
 * Activate a center after both parties have signed the agreement.
 * Marks the listing active and queues the welcome email for admin approval
 * (no auto-send). Commission fields are intentionally NOT written
 * (policy 2026-05-17: commission schema stays dormant).
 */
export async function activateCenter(pipelineId: string): Promise<boolean> {
  const admin = createAdminClient();

  const { data: pipeline } = await admin
    .from("outreach_pipeline")
    .select("*")
    .eq("id", pipelineId)
    .single();

  if (!pipeline) return false;

  const pipelineData = pipeline as unknown as OutreachPipeline;

  if (pipelineData.stage !== "agreement_signed") {
    console.error(`Cannot activate: pipeline ${pipelineId} is in stage ${pipelineData.stage}`);
    return false;
  }

  // Get center info
  const { data: center } = await admin
    .from("centers")
    .select("name, email, inquiry_email, country, city")
    .eq("id", pipelineData.center_id)
    .single();

  if (!center) return false;

  const contractEnd = new Date();
  contractEnd.setFullYear(contractEnd.getFullYear() + 1);

  await admin
    .from("centers")
    .update({
      agreement_status: "active",
      contract_start: new Date().toISOString().split("T")[0],
      contract_end: contractEnd.toISOString().split("T")[0],
      account_manager: `${PERSONA} (Partnerships)`,
      referral_eligible: true,
    })
    .eq("id", pipelineData.center_id);

  // Update pipeline to active
  await admin
    .from("outreach_pipeline")
    .update({ stage: "active" })
    .eq("id", pipelineId);

  // Draft the welcome email and queue it for admin approval
  const research = pipelineData.research_data as CenterResearch | null;
  const contactPerson = research?.contact_person_name;
  const greeting = contactPerson ? `Hi ${contactPerson.split(" ")[0]},` : "Hi there,";
  const toEmail = center.email || center.inquiry_email || "";
  const subject = `Welcome to Rehab-Atlas - ${center.name} is now live`;
  const bodyText = withUnsubscribeFooter(`${greeting}

Everything is set — ${center.name} is now officially part of the Rehab-Atlas network.

Here's what happens next:
- Your center profile is active and visible to people searching for care on our platform
- Inquiries are reviewed by our team first, and when someone's needs match what you offer, we'll pass the details on to you by email
- You can publish educational articles on Rehab-Atlas — each one credits you as the author and links back to your website

Our team is here to help with anything you need as you get started.

Welcome aboard — we're glad to have you with us.

Best,
${PERSONA}
Partnerships, Rehab-Atlas
info@rehab-atlas.com
rehab-atlas.com`);

  if (toEmail) {
    await createAgentTask({
      agent_type: "outreach_activation",
      entity_type: "outreach_pipeline",
      entity_id: pipelineId,
      checklist: {
        center_name: center.name,
        to_email: toEmail,
        subject,
        body_text: bodyText,
        persona: PERSONA,
      },
      ai_summary: `Welcome email drafted for ${center.name} (${toEmail}) — awaiting approval.`,
      ai_recommendation: "approve",
      confidence: 0.8,
    });
  }

  // Notify admin via Resend (internal)
  await sendAgentEmail({
    subject: `Partner Activated: ${center.name}`,
    agentLabel: "Activation Agent",
    bodyHtml: `
      <h2>New Partner Activated</h2>
      <table>
        <tr><td><strong>Center:</strong></td><td>${center.name}</td></tr>
        <tr><td><strong>Location:</strong></td><td>${center.city || ""}, ${center.country || ""}</td></tr>
        <tr><td><strong>Agreement:</strong></td><td>Signed</td></tr>
        <tr><td><strong>Status:</strong></td><td>Active — welcome email awaiting your approval</td></tr>
      </table>
    `,
    actions: [],
  });

  await logAgentAction({
    agent_type: "outreach_activation",
    action: "center_activated",
    details: {
      pipeline_id: pipelineId,
      center_id: pipelineData.center_id,
      center_name: center.name,
    },
  });

  return true;
}

/**
 * Send an admin-approved welcome email. Called from the approval endpoint.
 * Throws OutreachBlockedError if a policy check blocks the send.
 */
export async function sendApprovedActivationEmail(
  pipelineId: string,
  emailData: { to_email: string; subject: string; body_text: string }
): Promise<boolean> {
  const admin = createAdminClient();
  const { data: pipeline } = await admin
    .from("outreach_pipeline")
    .select("center_id, outreach_thread_id")
    .eq("id", pipelineId)
    .single();
  if (!pipeline) return false;

  const result = await sendOutreachEmail({
    to: emailData.to_email,
    subject: emailData.subject,
    bodyText: emailData.body_text,
    threadId: (pipeline.outreach_thread_id as string) || undefined,
    pipelineId,
  });

  // null = Gmail credentials/token unavailable: nothing was sent.
  if (!result) {
    throw new Error("Gmail send unavailable (no credentials/access token) — email not sent");
  }

  await admin.from("outreach_emails").insert({
    pipeline_id: pipelineId,
    center_id: pipeline.center_id,
    direction: "outbound",
    gmail_message_id: result?.messageId || null,
    gmail_thread_id: result?.threadId || pipeline.outreach_thread_id || null,
    from_email: process.env.GMAIL_OUTREACH_EMAIL || "info@rehab-atlas.com",
    to_email: emailData.to_email,
    subject: emailData.subject,
    body_text: withUnsubscribeFooter(emailData.body_text),
    email_type: "confirmation",
  });

  await logAgentAction({
    agent_type: "outreach_activation",
    action: "welcome_email_sent",
    details: { pipeline_id: pipelineId, gmail_sent: !!result, approved: true },
  });

  return true;
}

/**
 * Agent 5 — Activation Agent
 * Updates center commission fields in the database after agreement signing.
 * Sends confirmation emails and ensures center is visible before lead forwarding.
 */

import { createAdminClient } from "@/lib/supabase/admin";
import { logAgentAction } from "@/lib/agents/base";
import { sendEmail } from "./gmail";
import { sendAgentEmail } from "@/lib/agents/notify";
import { getBlogTierFromRate } from "./templates/agreement-template";
import type { OutreachPipeline, CenterResearch } from "@/types/agent";

const PERSONA = process.env.OUTREACH_PERSONA_NAME || "Sarah";

/**
 * Activate a center after both parties have signed the agreement.
 * Updates commission fields, sends confirmations.
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

  const commissionRate = pipelineData.agreed_commission_rate || pipelineData.proposed_commission_rate;
  const blogTier = pipelineData.blog_tier || getBlogTierFromRate(commissionRate);

  // Get center info
  const { data: center } = await admin
    .from("centers")
    .select("name, email, inquiry_email, country, city")
    .eq("id", pipelineData.center_id)
    .single();

  if (!center) return false;

  // Update centers table with commission data
  const contractEnd = new Date();
  contractEnd.setFullYear(contractEnd.getFullYear() + 1);

  await admin
    .from("centers")
    .update({
      commission_type: "percentage",
      commission_rate: commissionRate,
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

  // Send confirmation email to center
  const research = pipelineData.research_data as CenterResearch | null;
  const contactPerson = research?.contact_person_name;
  const greeting = contactPerson ? `Hi ${contactPerson.split(" ")[0]},` : "Hi there,";

  await sendEmail({
    to: center.email || center.inquiry_email || "",
    subject: `Welcome to Rehab-Atlas — ${center.name} is now live`,
    bodyText: `${greeting}

Everything is set — ${center.name} is now officially part of the Rehab-Atlas network.

Here's what happens next:
- Your center profile is active and visible to potential clients on our platform
- When we match a client with your center, we'll send you the referral details via email
- Our team is here to help with anything you need as you get started

If you'd like to take advantage of the blog publishing option to reduce your commission rate, just let me know and I'll walk you through the process.

Welcome aboard — we're excited to have you with us.

Best,
${PERSONA}
Partnerships, Rehab-Atlas
info@rehab-atlas.com
rehab-atlas.com`,
    threadId: pipelineData.outreach_thread_id || undefined,
  });

  // Log confirmation email
  await admin.from("outreach_emails").insert({
    pipeline_id: pipelineId,
    center_id: pipelineData.center_id,
    direction: "outbound",
    gmail_thread_id: pipelineData.outreach_thread_id,
    from_email: process.env.GMAIL_OUTREACH_EMAIL || "info@rehab-atlas.com",
    to_email: center.email || center.inquiry_email || "",
    subject: `Welcome to Rehab-Atlas — ${center.name} is now live`,
    body_text: "Welcome and activation confirmation",
    email_type: "confirmation",
  });

  // Notify admin via Resend
  await sendAgentEmail({
    subject: `Partner Activated: ${center.name}`,
    agentLabel: "Activation Agent",
    bodyHtml: `
      <h2>New Partner Activated</h2>
      <table>
        <tr><td><strong>Center:</strong></td><td>${center.name}</td></tr>
        <tr><td><strong>Location:</strong></td><td>${center.city || ""}, ${center.country || ""}</td></tr>
        <tr><td><strong>Commission:</strong></td><td>${commissionRate}% (${blogTier} tier)</td></tr>
        <tr><td><strong>Agreement:</strong></td><td>Signed</td></tr>
        <tr><td><strong>Status:</strong></td><td>Active — ready for lead forwarding</td></tr>
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
      commission_rate: commissionRate,
      blog_tier: blogTier,
    },
  });

  return true;
}

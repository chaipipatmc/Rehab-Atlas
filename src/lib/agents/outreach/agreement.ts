/**
 * Agent 4 — Agreement Agent
 * Generates customized agreements and sends via PandaDoc for e-signature.
 * Creates agent_task requiring super admin approval before sending.
 */

import { createAdminClient } from "@/lib/supabase/admin";
import { createAgentTask, logAgentAction } from "@/lib/agents/base";
import { createAgreement, sendForSignature, getDocumentStatus, mapPandaDocStatus } from "./esign";
import { sendEmail } from "./gmail";
import {
  buildAgreementDetails,
  getBlogTierFromRate,
  getCommissionDescription,
  generateAgreementNoticeEmail,
} from "./templates/agreement-template";
import type { OutreachPipeline, CenterResearch, AgreementDetails } from "@/types/agent";

/**
 * Prepare an agreement for a center that has agreed to terms.
 * Creates agent_task for super admin approval before sending.
 */
export async function prepareAgreement(pipelineId: string): Promise<boolean> {
  const admin = createAdminClient();

  const { data: pipeline } = await admin
    .from("outreach_pipeline")
    .select("*")
    .eq("id", pipelineId)
    .single();

  if (!pipeline) return false;

  const pipelineData = pipeline as unknown as OutreachPipeline;

  // Get center info
  const { data: center } = await admin
    .from("centers")
    .select("name, country, city, email, inquiry_email")
    .eq("id", pipelineData.center_id)
    .single();

  if (!center) return false;

  const research = pipelineData.research_data as CenterResearch | null;
  const commissionRate = pipelineData.agreed_commission_rate || pipelineData.proposed_commission_rate;
  const blogTier = getBlogTierFromRate(commissionRate);

  // Build agreement details
  const details: AgreementDetails = buildAgreementDetails({
    centerName: center.name,
    centerCountry: center.country || "",
    centerCity: center.city || "",
    contactPerson: research?.contact_person_name || center.name,
    contactEmail: center.email || center.inquiry_email || "",
    agreedCommissionRate: commissionRate,
    blogTier,
    specialTerms: pipelineData.special_terms,
  });

  // Update pipeline
  await admin
    .from("outreach_pipeline")
    .update({
      stage: "agreement_drafted",
      agreed_commission_rate: commissionRate,
      blog_tier: blogTier,
    })
    .eq("id", pipelineId);

  // Create agent task for super admin approval
  const task = await createAgentTask({
    agent_type: "outreach_agreement",
    entity_type: "outreach_pipeline",
    entity_id: pipelineId,
    checklist: {
      center_name: center.name,
      contact_email: details.contact_email,
      contact_person: details.contact_person,
      commission_rate: commissionRate,
      blog_tier: blogTier,
      blog_tier_description: getCommissionDescription(commissionRate, blogTier),
      special_terms: pipelineData.special_terms || "None",
      contract_start: details.contract_start,
      contract_end: details.contract_end,
      agreement_details: details,
    },
    ai_summary: `Agreement ready for ${center.name}: ${commissionRate}% commission (${blogTier} blog tier). Contract: ${details.contract_start} to ${details.contract_end}.`,
    ai_recommendation: "approve",
    confidence: 0.95,
  });

  if (task) {
    await logAgentAction({
      agent_type: "outreach_agreement",
      task_id: task.id,
      action: "agreement_drafted",
      details: { pipeline_id: pipelineId, center_name: center.name, commission_rate: commissionRate },
    });
  }

  return !!task;
}

/**
 * Send approved agreement via PandaDoc for e-signature.
 * Called when super admin approves the agreement agent_task.
 */
export async function sendApprovedAgreement(
  pipelineId: string,
  agreementDetails: AgreementDetails
): Promise<boolean> {
  const admin = createAdminClient();

  // Create PandaDoc document
  const doc = await createAgreement(agreementDetails);
  if (!doc) {
    console.error("Failed to create PandaDoc document");
    return false;
  }

  // PandaDoc needs a moment to process the document before it can be sent
  // Wait briefly then send for signature
  await new Promise((resolve) => setTimeout(resolve, 3000));

  const sent = await sendForSignature(doc.documentId);
  if (!sent) {
    console.error("Failed to send PandaDoc for signature");
    return false;
  }

  // Update pipeline
  await admin
    .from("outreach_pipeline")
    .update({
      stage: "agreement_sent",
      agreement_document_url: `https://app.pandadoc.com/a/#/documents/${doc.documentId}`,
      esign_envelope_id: doc.documentId,
      esign_status: "sent",
      agreement_sent_at: new Date().toISOString(),
    })
    .eq("id", pipelineId);

  // Send notification email to center about the agreement
  const { data: pipeline } = await admin
    .from("outreach_pipeline")
    .select("center_id, agreed_commission_rate, outreach_thread_id")
    .eq("id", pipelineId)
    .single();

  if (pipeline) {
    const { data: center } = await admin
      .from("centers")
      .select("name, email, inquiry_email")
      .eq("id", pipeline.center_id)
      .single();

    if (center) {
      const research = (await admin
        .from("outreach_pipeline")
        .select("research_data")
        .eq("id", pipelineId)
        .single()).data?.research_data as CenterResearch | null;

      const notice = generateAgreementNoticeEmail({
        centerName: center.name,
        contactPerson: research?.contact_person_name || null,
        commissionRate: pipeline.agreed_commission_rate as number,
      });

      await sendEmail({
        to: center.email || center.inquiry_email || agreementDetails.contact_email,
        subject: notice.subject,
        bodyText: notice.bodyText,
        threadId: (pipeline.outreach_thread_id as string) || undefined,
      });

      // Log notification email
      await admin.from("outreach_emails").insert({
        pipeline_id: pipelineId,
        center_id: pipeline.center_id,
        direction: "outbound",
        from_email: process.env.GMAIL_OUTREACH_EMAIL || "info@rehab-atlas.com",
        to_email: center.email || center.inquiry_email || agreementDetails.contact_email,
        subject: notice.subject,
        body_text: notice.bodyText,
        email_type: "agreement_notice",
      });
    }
  }

  await logAgentAction({
    agent_type: "outreach_agreement",
    action: "agreement_sent",
    details: {
      pipeline_id: pipelineId,
      pandadoc_id: doc.documentId,
    },
  });

  return true;
}

/**
 * Check the signing status of a PandaDoc document.
 * Called by orchestrator to track progress.
 */
export async function checkAgreementStatus(pipelineId: string): Promise<string | null> {
  const admin = createAdminClient();

  const { data: pipeline } = await admin
    .from("outreach_pipeline")
    .select("esign_envelope_id, esign_status")
    .eq("id", pipelineId)
    .single();

  if (!pipeline?.esign_envelope_id) return null;

  const status = await getDocumentStatus(pipeline.esign_envelope_id as string);
  if (!status) return null;

  const mappedStatus = mapPandaDocStatus(status.status, status.recipients);

  // Update if status changed
  if (mappedStatus !== pipeline.esign_status) {
    const updates: Record<string, unknown> = { esign_status: mappedStatus };

    if (mappedStatus === "completed") {
      updates.stage = "agreement_signed";
      updates.agreement_signed_at = new Date().toISOString();
    }

    await admin.from("outreach_pipeline").update(updates).eq("id", pipelineId);
  }

  return mappedStatus;
}

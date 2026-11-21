/**
 * Agent 2 — Follow-up Agent
 * Drafts follow-up emails on Day 3, 7, 14 after initial outreach and queues
 * each one as an agent_task for admin approval (board decision D6: no email
 * goes out without an explicit yes). Nothing is sent from the cron path.
 * Checks for replies first. Max 3 follow-ups before marking stalled.
 */

import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { createAgentTask, logAgentAction } from "@/lib/agents/base";
import { analyzeWithClaude } from "@/lib/agents/claude";
import { hasNewReplies } from "./gmail";
import {
  getCenterExclusionReason,
  markPipelineExcluded,
  sendOutreachEmail,
  withUnsubscribeFooter,
} from "./policy";
import {
  generateFollowUp1,
  generateFollowUp2,
  generateFollowUp3,
  getFollowUpSystemPrompt,
} from "./templates/follow-up-emails";
import type { OutreachPipeline, CenterResearch } from "@/types/agent";

// Persona + follow-up cadence — admin can override via /admin/agents → settings.
const DEFAULT_PERSONA = process.env.OUTREACH_PERSONA_NAME || "Sarah";
const DEFAULT_FOLLOW_UP_DAYS = [3, 7, 14];

async function resolvePersona(): Promise<string> {
  const { getAgentSettingString } = await import("../config");
  // Persona is shared with research; read from outreach_research key first,
  // then fall back to outreach_followup, then to env var/Sarah.
  const fromResearch = await getAgentSettingString(
    "outreach_research",
    "persona_name",
    ""
  );
  if (fromResearch) return fromResearch;
  return getAgentSettingString("outreach_followup", "persona_name", DEFAULT_PERSONA);
}

async function resolveFollowUpDays(): Promise<number[]> {
  const { getAgentSettingNumberArray } = await import("../config");
  return getAgentSettingNumberArray("outreach_followup", "follow_up_days", DEFAULT_FOLLOW_UP_DAYS);
}

const followUpEmailSchema = z.object({
  subject: z.string(),
  body_text: z.string(),
});

/**
 * Process all pending follow-ups.
 * Called by daily cron job.
 */
export async function processFollowUps(): Promise<{
  processed: number;
  queued: number;
  replied: number;
  stalled: number;
}> {
  const admin = createAdminClient();
  const now = new Date();
  const stats = { processed: 0, queued: 0, replied: 0, stalled: 0 };

  // No daily-limit check here: this path only drafts and queues. The cap is
  // enforced per email at send time (sendOutreachEmail), after approval.

  // Get pipeline entries due for follow-up
  const { data: pipelines } = await admin
    .from("outreach_pipeline")
    .select("*")
    .in("stage", ["outreach_sent", "followed_up"])
    .lte("next_follow_up_at", now.toISOString())
    .order("next_follow_up_at", { ascending: true })
    .limit(50);

  if (!pipelines?.length) return stats;

  for (const raw of pipelines) {
    const pipeline = raw as unknown as OutreachPipeline;
    stats.processed++;

    // Check for replies first
    if (pipeline.outreach_thread_id) {
      const lastCheck = pipeline.outreach_sent_at
        ? new Date(pipeline.outreach_sent_at)
        : new Date(pipeline.created_at);

      const hasReply = await hasNewReplies(pipeline.outreach_thread_id, lastCheck);
      if (hasReply) {
        // Transition to responded — Response Handler agent will process
        await admin
          .from("outreach_pipeline")
          .update({
            stage: "responded",
            responded_at: now.toISOString(),
            next_follow_up_at: null,
          })
          .eq("id", pipeline.id);

        stats.replied++;
        await logAgentAction({
          agent_type: "outreach_followup",
          action: "reply_detected",
          details: { pipeline_id: pipeline.id, center_id: pipeline.center_id },
        });
        continue;
      }
    }

    // Check if max follow-ups reached
    if (pipeline.follow_up_count >= 3) {
      await admin
        .from("outreach_pipeline")
        .update({ stage: "stalled", next_follow_up_at: null })
        .eq("id", pipeline.id);

      stats.stalled++;
      await logAgentAction({
        agent_type: "outreach_followup",
        action: "marked_stalled",
        details: { pipeline_id: pipeline.id, follow_up_count: pipeline.follow_up_count },
      });
      continue;
    }

    // Draft follow-up and queue it for admin approval
    const queued = await queueFollowUpForApproval(pipeline);
    if (queued) stats.queued++;
  }

  await logAgentAction({
    agent_type: "outreach_followup",
    action: "batch_complete",
    details: stats,
  });

  return stats;
}

/**
 * Draft a follow-up email and queue it as an agent_task (awaiting_owner).
 * Does NOT send. The email goes out only via sendApprovedFollowUp() after an
 * admin approves the task.
 */
async function queueFollowUpForApproval(pipeline: OutreachPipeline): Promise<boolean> {
  const admin = createAdminClient();
  const attemptNumber = pipeline.follow_up_count + 1;

  // Skip if any approval task is already open for this pipeline (avoids
  // re-drafting — and re-spending Claude tokens — on every cron run).
  const { data: openTask } = await admin
    .from("agent_tasks")
    .select("id")
    .eq("entity_type", "outreach_pipeline")
    .eq("entity_id", pipeline.id)
    .in("status", ["pending", "processing", "awaiting_owner"])
    .limit(1)
    .maybeSingle();
  if (openTask) return false;

  // Related-party / runtime exclusions
  const excluded = await getCenterExclusionReason(pipeline.center_id);
  if (excluded) {
    await markPipelineExcluded(pipeline.id, excluded);
    return false;
  }

  // Get center info
  const { data: center } = await admin
    .from("centers")
    .select("name, email, inquiry_email")
    .eq("id", pipeline.center_id)
    .single();

  if (!center) return false;

  const toEmail = center.email || center.inquiry_email;
  if (!toEmail) return false;

  const research = pipeline.research_data as CenterResearch | null;
  const contactPerson = research?.contact_person_name || null;

  // Resolve admin-configurable knobs
  const persona = await resolvePersona();

  // Try Claude for personalized follow-up
  const aiDraft = await analyzeWithClaude<{ subject: string; body_text: string }>({
    systemPrompt: getFollowUpSystemPrompt(attemptNumber, persona),
    userPrompt: `Write follow-up #${attemptNumber} for ${center.name}. Contact: ${contactPerson || "unknown"}. Their specialties: ${research?.specialties?.join(", ") || "rehabilitation"}.`,
    responseSchema: followUpEmailSchema,
    maxTokens: 500,
    agentType: "outreach_followup",
    operation: "followup_email",
  });

  // Fallback to template
  const draft = aiDraft || getFollowUpTemplate(attemptNumber, {
    centerName: center.name,
    contactPerson,
    persona,
  });

  const task = await createAgentTask({
    agent_type: "outreach_followup",
    entity_type: "outreach_pipeline",
    entity_id: pipeline.id,
    checklist: {
      center_name: center.name,
      to_email: toEmail,
      subject: draft.subject,
      body_text: withUnsubscribeFooter(draft.body_text),
      persona,
      attempt_number: attemptNumber,
    },
    ai_summary: `Follow-up #${attemptNumber} drafted for ${center.name} (${toEmail}). Subject: "${draft.subject}"`,
    ai_recommendation: "approve",
    confidence: aiDraft ? 0.8 : 0.65,
  });

  if (!task) return false;

  // Stop the cron from picking this pipeline again until the admin decides.
  await admin
    .from("outreach_pipeline")
    .update({ next_follow_up_at: null })
    .eq("id", pipeline.id);

  await logAgentAction({
    agent_type: "outreach_followup",
    task_id: task.id,
    action: `follow_up_${attemptNumber}_queued`,
    details: { pipeline_id: pipeline.id, center_id: pipeline.center_id, center_name: center.name },
  });

  return true;
}

/**
 * Send an admin-approved follow-up. Called from the approval endpoint only.
 * Throws OutreachBlockedError (from sendOutreachEmail) if a policy check
 * fails — the caller must leave the task undecided in that case.
 */
export async function sendApprovedFollowUp(
  pipelineId: string,
  emailData: { to_email: string; subject: string; body_text: string; attempt_number?: number }
): Promise<boolean> {
  const admin = createAdminClient();

  const { data: raw } = await admin
    .from("outreach_pipeline")
    .select("*")
    .eq("id", pipelineId)
    .single();
  if (!raw) return false;
  const pipeline = raw as unknown as OutreachPipeline;

  const attemptNumber = emailData.attempt_number || pipeline.follow_up_count + 1;

  const result = await sendOutreachEmail({
    to: emailData.to_email,
    subject: emailData.subject,
    bodyText: emailData.body_text,
    threadId: pipeline.outreach_thread_id || undefined,
    pipelineId,
  });

  // Calculate next follow-up
  const followUpDays = await resolveFollowUpDays();
  const nextFollowUpDays = followUpDays[attemptNumber] || null;
  let nextFollowUp: string | null = null;
  if (nextFollowUpDays && attemptNumber < 3) {
    const next = new Date();
    next.setDate(next.getDate() + nextFollowUpDays);
    nextFollowUp = next.toISOString();
  }

  await admin
    .from("outreach_pipeline")
    .update({
      stage: "followed_up",
      follow_up_count: attemptNumber,
      last_follow_up_at: new Date().toISOString(),
      next_follow_up_at: nextFollowUp,
    })
    .eq("id", pipelineId);

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
    email_type: `follow_up_${Math.min(attemptNumber, 3)}` as "follow_up_1" | "follow_up_2" | "follow_up_3",
  });

  await logAgentAction({
    agent_type: "outreach_followup",
    action: `follow_up_${attemptNumber}_sent`,
    details: { pipeline_id: pipelineId, center_id: pipeline.center_id, gmail_sent: !!result, approved: true },
  });

  return true;
}

function getFollowUpTemplate(attempt: number, params: { centerName: string; contactPerson: string | null; persona?: string }): { subject: string; body_text: string } {
  const { subject, bodyText } = attempt === 1
    ? generateFollowUp1(params)
    : attempt === 2
      ? generateFollowUp2(params)
      : generateFollowUp3(params);

  return { subject, body_text: bodyText };
}

/**
 * Agent 2 — Follow-up Agent
 * Auto-sends follow-up emails on Day 3, 7, 14 after initial outreach.
 * Checks for replies before sending. Max 3 follow-ups before marking stalled.
 */

import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { logAgentAction } from "@/lib/agents/base";
import { analyzeWithClaude } from "@/lib/agents/claude";
import { sendEmail, hasNewReplies, canSendToday } from "./gmail";
import {
  generateFollowUp1,
  generateFollowUp2,
  generateFollowUp3,
  getFollowUpSystemPrompt,
} from "./templates/follow-up-emails";
import type { OutreachPipeline, CenterResearch } from "@/types/agent";

const PERSONA = process.env.OUTREACH_PERSONA_NAME || "Sarah";

const followUpEmailSchema = z.object({
  subject: z.string(),
  body_text: z.string(),
});

// Follow-up intervals in days after initial outreach
const FOLLOW_UP_DAYS = [3, 7, 14];

/**
 * Process all pending follow-ups.
 * Called by daily cron job.
 */
export async function processFollowUps(): Promise<{
  processed: number;
  sent: number;
  replied: number;
  stalled: number;
}> {
  const admin = createAdminClient();
  const now = new Date();
  const stats = { processed: 0, sent: 0, replied: 0, stalled: 0 };

  // Get daily send limit
  const { data: limitSetting } = await admin
    .from("site_settings")
    .select("value")
    .eq("key", "outreach_daily_email_limit")
    .single();
  const dailyLimit = parseInt(limitSetting?.value || "20", 10);

  // Check if we can still send today
  const canSend = await canSendToday(dailyLimit);
  if (!canSend) {
    console.log("Daily email limit reached, skipping follow-ups");
    return stats;
  }

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

    // Send follow-up
    const sent = await sendFollowUp(pipeline);
    if (sent) stats.sent++;
  }

  await logAgentAction({
    agent_type: "outreach_followup",
    action: "batch_complete",
    details: stats,
  });

  return stats;
}

/**
 * Send a follow-up email for a specific pipeline entry.
 */
async function sendFollowUp(pipeline: OutreachPipeline): Promise<boolean> {
  const admin = createAdminClient();
  const attemptNumber = pipeline.follow_up_count + 1;

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

  // Try Claude for personalized follow-up
  const aiDraft = await analyzeWithClaude<{ subject: string; body_text: string }>({
    systemPrompt: getFollowUpSystemPrompt(attemptNumber, PERSONA),
    userPrompt: `Write follow-up #${attemptNumber} for ${center.name}. Contact: ${contactPerson || "unknown"}. Their specialties: ${research?.specialties?.join(", ") || "rehabilitation"}.`,
    responseSchema: followUpEmailSchema,
    maxTokens: 500,
  });

  // Fallback to template
  const draft = aiDraft || getFollowUpTemplate(attemptNumber, {
    centerName: center.name,
    contactPerson,
  });

  // Send via Gmail (auto-send, no approval needed)
  const result = await sendEmail({
    to: toEmail,
    subject: draft.subject,
    bodyText: draft.body_text,
    threadId: pipeline.outreach_thread_id || undefined,
  });

  // Calculate next follow-up
  const nextFollowUpDays = FOLLOW_UP_DAYS[attemptNumber] || null;
  let nextFollowUp: string | null = null;
  if (nextFollowUpDays && attemptNumber < 3) {
    const next = new Date();
    next.setDate(next.getDate() + nextFollowUpDays);
    nextFollowUp = next.toISOString();
  }

  // Update pipeline
  await admin
    .from("outreach_pipeline")
    .update({
      stage: "followed_up",
      follow_up_count: attemptNumber,
      last_follow_up_at: new Date().toISOString(),
      next_follow_up_at: nextFollowUp,
    })
    .eq("id", pipeline.id);

  // Log the email
  await admin.from("outreach_emails").insert({
    pipeline_id: pipeline.id,
    center_id: pipeline.center_id,
    direction: "outbound",
    gmail_message_id: result?.messageId || null,
    gmail_thread_id: result?.threadId || pipeline.outreach_thread_id || null,
    from_email: process.env.GMAIL_OUTREACH_EMAIL || "info@rehab-atlas.com",
    to_email: toEmail,
    subject: draft.subject,
    body_text: draft.body_text,
    email_type: `follow_up_${attemptNumber}` as "follow_up_1" | "follow_up_2" | "follow_up_3",
  });

  await logAgentAction({
    agent_type: "outreach_followup",
    action: `follow_up_${attemptNumber}_sent`,
    details: {
      pipeline_id: pipeline.id,
      center_id: pipeline.center_id,
      center_name: center.name,
      gmail_sent: !!result,
    },
  });

  return true;
}

function getFollowUpTemplate(attempt: number, params: { centerName: string; contactPerson: string | null }): { subject: string; body_text: string } {
  const { subject, bodyText } = attempt === 1
    ? generateFollowUp1(params)
    : attempt === 2
      ? generateFollowUp2(params)
      : generateFollowUp3(params);

  return { subject, body_text: bodyText };
}

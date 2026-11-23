/**
 * Agent 3 — Response Handler
 * Detects inbound replies, analyzes sentiment, updates pipeline.
 * This agent NEVER sends email. Every outbound reply is queued as an
 * agent_task and only goes out after admin approval (board decision D6).
 * - "unsubscribe" / opt-out reply → pipeline marked opted out, no further mail.
 * - Questions → drafts a reply for admin approval.
 * - Decline → admin task only (no automatic win-back email).
 * - Explicit acceptance of terms (flag + verbatim quote) → terms_agreed, and
 *   an admin task to invite the contact manually only if the center has no
 *   partner account yet (no auto-created accounts, no passwords by email).
 *   Wanting to join / profile changes are NOT acceptance (see reply-outcome.ts).
 */

import { createAdminClient } from "@/lib/supabase/admin";
import { createAgentTask, logAgentAction } from "@/lib/agents/base";
import { analyzeWithClaude } from "@/lib/agents/claude";
import { getLatestInboundReply } from "./gmail";
import { isOptOutReply, OPTED_OUT_MARKER } from "./policy";
import { resolvePersona } from "./persona";
import {
  decideReplyOutcome,
  isExplicitTermsAcceptance,
  REPLY_WATCH_STAGES,
  responseAnalysisSchema,
  type ResponseAnalysis,
} from "./reply-outcome";
import type { OutreachPipeline, ResponseSentiment } from "@/types/agent";

/**
 * Does any partner account already manage this center?
 * Errors count as "yes" (fail closed: no duplicate invite task).
 */
async function centerHasPartnerAccount(centerId: string): Promise<boolean> {
  const admin = createAdminClient();
  const { count, error } = await admin
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .eq("role", "partner")
    .or(`center_id.eq.${centerId},managed_center_ids.cs.{${centerId}}`);
  if (error) {
    console.error("Partner account lookup failed:", error.message);
    return true;
  }
  return (count ?? 0) > 0;
}

/**
 * Process all pipeline entries that have new replies.
 * Called by Gmail webhook or polling cron.
 */
export async function processInboundReplies(): Promise<{
  processed: number;
  positive: number;
  negative: number;
  questions: number;
}> {
  const admin = createAdminClient();
  const stats = { processed: 0, positive: 0, negative: 0, questions: 0 };

  // Get all active outreach pipelines with thread IDs
  const { data: pipelines } = await admin
    .from("outreach_pipeline")
    .select("*")
    .in("stage", [...REPLY_WATCH_STAGES])
    .not("outreach_thread_id", "is", null)
    .limit(100);

  if (!pipelines?.length) return stats;

  for (const raw of pipelines) {
    const pipeline = raw as unknown as OutreachPipeline;
    if (!pipeline.outreach_thread_id) continue;

    // Get latest inbound reply
    const lastCheck = pipeline.responded_at || pipeline.outreach_sent_at || pipeline.created_at;
    const reply = await getLatestInboundReply(pipeline.outreach_thread_id);

    if (!reply || new Date(reply.date) <= new Date(lastCheck)) continue;

    stats.processed++;
    await processReply(pipeline, reply);

    // Update stats
    const { data: updated } = await admin
      .from("outreach_pipeline")
      .select("response_sentiment")
      .eq("id", pipeline.id)
      .single();

    const sentiment = updated?.response_sentiment as ResponseSentiment;
    if (sentiment === "positive") stats.positive++;
    else if (sentiment === "negative") stats.negative++;
    else if (sentiment === "question") stats.questions++;
  }

  return stats;
}

/**
 * Expire open approval tasks for a pipeline (e.g. a follow-up draft that is
 * now stale because the center replied).
 */
async function expireOpenTasks(pipelineId: string, agentTypes?: string[]): Promise<void> {
  const admin = createAdminClient();
  let q = admin
    .from("agent_tasks")
    .update({ status: "expired", completed_at: new Date().toISOString() })
    .eq("entity_type", "outreach_pipeline")
    .eq("entity_id", pipelineId)
    .in("status", ["pending", "processing", "awaiting_owner"]);
  if (agentTypes?.length) q = q.in("agent_type", agentTypes);
  await q;
}

/**
 * Process a single inbound reply.
 */
async function processReply(
  pipeline: OutreachPipeline,
  reply: { id: string; from: string; subject: string; body: string; date: string }
): Promise<void> {
  const admin = createAdminClient();

  // Get center info
  const { data: center } = await admin
    .from("centers")
    .select("name")
    .eq("id", pipeline.center_id)
    .single();

  // Log the inbound email
  await admin.from("outreach_emails").insert({
    pipeline_id: pipeline.id,
    center_id: pipeline.center_id,
    direction: "inbound",
    gmail_message_id: reply.id,
    gmail_thread_id: pipeline.outreach_thread_id,
    from_email: reply.from,
    to_email: process.env.GMAIL_OUTREACH_EMAIL || "info@rehab-atlas.com",
    subject: reply.subject,
    body_text: reply.body,
    email_type: "response",
    sent_at: reply.date,
  });

  // Opt-out: stop everything for this center, no reply, no further tasks.
  if (isOptOutReply(reply.body)) {
    const nowIso = new Date().toISOString();
    await admin
      .from("outreach_pipeline")
      .update({
        stage: "declined",
        responded_at: nowIso,
        response_summary: "Opted out (unsubscribe reply)",
        response_sentiment: "negative",
        next_follow_up_at: null,
        notes: `${OPTED_OUT_MARKER} ${nowIso} via reply${pipeline.notes ? `\n${pipeline.notes}` : ""}`,
      })
      .eq("id", pipeline.id);
    await expireOpenTasks(pipeline.id);
    await logAgentAction({
      agent_type: "outreach_response",
      action: "opted_out",
      details: { pipeline_id: pipeline.id, center_id: pipeline.center_id, center_name: center?.name },
    });
    return;
  }

  // The center replied — any queued follow-up draft is now stale.
  await expireOpenTasks(pipeline.id, ["outreach_followup"]);

  // Analyze with Claude
  const persona = await resolvePersona();
  const analysis = await analyzeWithClaude<ResponseAnalysis>({
    systemPrompt: `You analyze inbound email replies from rehabilitation centers being invited to join Rehab-Atlas, a free platform that helps people find rehab centers.
Determine the sender's intent and sentiment. We invited them to join our platform for free — create a profile, share their programs, and optionally publish educational blog articles.
There is NO commission, fee or pricing discussion — never mention commission, fees, pricing or referral costs in a suggested reply. This is purely about onboarding their center profile.
Never offer phone calls. Never include passwords or login credentials in a suggested reply. Sign any suggested reply as "${persona}".
Field rules:
- wants_to_join: true if they show interest in being listed or joining, or ask to create/update/rename their profile or add another center.
- explicitly_accepted_terms: true ONLY if the reply explicitly says they accept or agree to our terms, the agreement, or the partnership terms (for example "we accept the terms" or "we agree to the agreement"). Interest in joining, profile updates, name changes, adding a center, thanks or questions are NOT acceptance. If in doubt, false.
- terms_acceptance_quote: when explicitly_accepted_terms is true, copy the exact sentence from their reply that accepts the terms, word for word; otherwise null.
Return JSON with exactly these keys: sentiment, summary, key_points, wants_to_join, explicitly_accepted_terms, terms_acceptance_quote, has_questions, counter_offer_rate (always null), suggested_reply (null if no reply needed).`,
    userPrompt: `Center: ${center?.name || "Unknown"}
Their reply:
${reply.body}

Previous context: We invited them to join Rehab-Atlas for free — set up their center profile and publish blog articles for SEO backlinks.`,
    responseSchema: responseAnalysisSchema,
    maxTokens: 700,
    agentType: "outreach_response",
    operation: "sentiment_analysis",
  });

  const sentiment: ResponseSentiment = analysis?.sentiment || "neutral";
  const summary = analysis?.summary || `Reply received from ${center?.name || "center"}`;

  // Only look up partner accounts when the reply really accepts terms.
  const hasPartnerAccount = isExplicitTermsAcceptance(analysis, reply.body)
    ? await centerHasPartnerAccount(pipeline.center_id)
    : false;

  const outcome = decideReplyOutcome(analysis, {
    replyBody: reply.body,
    currentStage: pipeline.stage,
    hasPartnerAccount,
  });
  const { nextStage, declined } = outcome;

  // Update pipeline (commission fields intentionally not written — policy)
  await admin
    .from("outreach_pipeline")
    .update({
      stage: nextStage,
      responded_at: new Date().toISOString(),
      response_summary: summary,
      response_sentiment: sentiment,
      next_follow_up_at: null,
    })
    .eq("id", pipeline.id);

  if (declined) {
    // Decision task for admin — nothing is drafted or sent automatically.
    await createAgentTask({
      agent_type: "outreach_response",
      entity_type: "outreach_pipeline",
      entity_id: pipeline.id,
      checklist: {
        center_name: center?.name,
        reply_from: reply.from,
        reply_body: reply.body,
        sentiment,
        summary,
        key_points: analysis?.key_points || [],
        admin_decision:
          "Center declined. No reply was sent. Pipeline set to declined. Reply manually only if you decide it is appropriate.",
      },
      ai_summary: `${center?.name || "Center"} declined: ${summary}. No automatic reply sent — admin decides.`,
      ai_recommendation: "needs_info",
      confidence: analysis ? 0.8 : 0.5,
    });
  } else if (outcome.draftReply) {
    // Drafted reply for admin approval (sent only via the approval endpoint)
    await createAgentTask({
      agent_type: "outreach_response",
      entity_type: "outreach_pipeline",
      entity_id: pipeline.id,
      checklist: {
        center_name: center?.name,
        reply_from: reply.from,
        reply_body: reply.body,
        sentiment,
        summary,
        key_points: analysis?.key_points || [],
        suggested_reply: analysis?.suggested_reply,
      },
      ai_summary: `Reply from ${center?.name}: ${summary}`,
      ai_recommendation: sentiment === "positive" ? "approve" : "needs_info",
      confidence: analysis ? 0.8 : 0.5,
    });
  }

  // Explicit agreement and no partner account yet: admin invites the contact
  // manually. No account is created here and no password is generated or emailed.
  if (outcome.partnerInvite) {
    const contactEmail = (reply.from.match(/<([^>]+)>/)?.[1] || reply.from).trim().toLowerCase();
    const contactName = reply.from.match(/^([^<]+)</)?.[1]?.trim() || contactEmail.split("@")[0];

    await createAgentTask({
      agent_type: "outreach_response",
      entity_type: "outreach_partner_invite",
      entity_id: pipeline.id,
      checklist: {
        center_name: center?.name,
        center_id: pipeline.center_id,
        contact_name: contactName,
        contact_email: contactEmail,
        summary,
        terms_acceptance_quote: analysis?.terms_acceptance_quote,
        admin_action:
          "Verify the contact really represents this center, then invite them as a partner yourself (Supabase Auth invite link, role=partner, center_id above). Do NOT set or email a password.",
      },
      ai_summary: `${center?.name} explicitly accepted the terms. Admin to verify the contact and send a partner invite manually.`,
      ai_recommendation: "approve",
      confidence: analysis ? 0.85 : 0.5,
    });
  }

  await logAgentAction({
    agent_type: "outreach_response",
    action: "reply_processed",
    details: {
      pipeline_id: pipeline.id,
      center_id: pipeline.center_id,
      sentiment,
      previous_stage: pipeline.stage,
      next_stage: nextStage,
      agreed: outcome.termsAccepted,
      wants_to_join: analysis?.wants_to_join || false,
      partner_account_exists: outcome.termsAccepted ? hasPartnerAccount : undefined,
      partner_invite_task: outcome.partnerInvite,
    },
  });
}

/**
 * Process a single thread for new replies (used by Gmail webhook).
 */
export async function processThreadReply(threadId: string): Promise<void> {
  const admin = createAdminClient();

  const { data: pipeline } = await admin
    .from("outreach_pipeline")
    .select("*")
    .eq("outreach_thread_id", threadId)
    .single();

  if (!pipeline) return;

  const pipelineData = pipeline as unknown as OutreachPipeline;
  const reply = await getLatestInboundReply(threadId);
  if (!reply) return;

  const lastCheck = pipelineData.responded_at || pipelineData.outreach_sent_at || pipelineData.created_at;
  if (new Date(reply.date) <= new Date(lastCheck)) return;

  await processReply(pipelineData, reply);
}

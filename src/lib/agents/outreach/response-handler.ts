/**
 * Agent 3 — Response Handler
 * Detects inbound replies, analyzes sentiment, updates pipeline.
 * If center asks questions → drafts reply for admin approval.
 * If center agrees → transitions to terms_agreed.
 */

import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { createAgentTask, logAgentAction } from "@/lib/agents/base";
import { analyzeWithClaude } from "@/lib/agents/claude";
import { getLatestInboundReply, getThreadMessages } from "./gmail";
import type { OutreachPipeline, ResponseSentiment } from "@/types/agent";

const responseAnalysisSchema = z.object({
  sentiment: z.enum(["positive", "neutral", "negative", "question"]),
  summary: z.string(),
  key_points: z.array(z.string()),
  agreed_to_partner: z.boolean(),
  has_questions: z.boolean(),
  counter_offer_rate: z.number().nullable(),
  suggested_reply: z.string().nullable(),
});

type ResponseAnalysis = z.infer<typeof responseAnalysisSchema>;

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
    .in("stage", ["outreach_sent", "followed_up", "responded", "negotiating"])
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

  // Analyze with Claude
  const analysis = await analyzeWithClaude<ResponseAnalysis>({
    systemPrompt: `You analyze inbound email replies from rehabilitation centers being invited to join Rehab-Atlas.
Determine the sender's intent and sentiment. Our standard commission is 12% (10% with 3 blogs/month, 8% with 6 blogs/month).
Return JSON with: sentiment, summary, key_points, agreed_to_partner, has_questions, counter_offer_rate (null if none), suggested_reply (null if no reply needed).`,
    userPrompt: `Center: ${center?.name || "Unknown"}
Their reply:
${reply.body}

Previous context: We offered a partnership with ${pipeline.proposed_commission_rate}% commission rate.`,
    responseSchema: responseAnalysisSchema,
    maxTokens: 600,
  });

  // Fallback analysis
  const sentiment: ResponseSentiment = analysis?.sentiment || "neutral";
  const summary = analysis?.summary || `Reply received from ${center?.name || "center"}`;

  // Determine next stage
  let nextStage: string;
  if (analysis?.agreed_to_partner) {
    nextStage = "terms_agreed";
  } else if (sentiment === "negative" && !analysis?.has_questions) {
    nextStage = "declined";
  } else if (analysis?.has_questions || analysis?.counter_offer_rate) {
    nextStage = "negotiating";
  } else {
    nextStage = "responded";
  }

  // Update pipeline
  await admin
    .from("outreach_pipeline")
    .update({
      stage: nextStage,
      responded_at: new Date().toISOString(),
      response_summary: summary,
      response_sentiment: sentiment,
      next_follow_up_at: null,
      ...(analysis?.counter_offer_rate ? { proposed_commission_rate: analysis.counter_offer_rate } : {}),
      ...(analysis?.agreed_to_partner
        ? {
            agreed_commission_rate: analysis.counter_offer_rate || pipeline.proposed_commission_rate,
            agreed_commission_type: "percentage",
          }
        : {}),
    })
    .eq("id", pipeline.id);

  // If they have questions or it needs negotiation, create task for admin
  if (analysis?.has_questions || nextStage === "negotiating") {
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
        counter_offer_rate: analysis?.counter_offer_rate,
        suggested_reply: analysis?.suggested_reply,
      },
      ai_summary: `Reply from ${center?.name}: ${summary}`,
      ai_recommendation: sentiment === "positive" ? "approve" : "needs_info",
      confidence: analysis ? 0.8 : 0.5,
    });
  }

  // If they agreed, create task to confirm and move to agreement
  if (analysis?.agreed_to_partner) {
    await createAgentTask({
      agent_type: "outreach_response",
      entity_type: "outreach_pipeline",
      entity_id: pipeline.id,
      checklist: {
        center_name: center?.name,
        agreed: true,
        commission_rate: analysis.counter_offer_rate || pipeline.proposed_commission_rate,
        summary,
      },
      ai_summary: `${center?.name} has agreed to partner! Commission: ${analysis.counter_offer_rate || pipeline.proposed_commission_rate}%`,
      ai_recommendation: "approve",
      confidence: 0.9,
    });
  }

  await logAgentAction({
    agent_type: "outreach_response",
    action: "reply_processed",
    details: {
      pipeline_id: pipeline.id,
      center_id: pipeline.center_id,
      sentiment,
      next_stage: nextStage,
      agreed: analysis?.agreed_to_partner || false,
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

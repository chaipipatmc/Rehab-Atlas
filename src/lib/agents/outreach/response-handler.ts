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
import { getLatestInboundReply, getThreadMessages, sendEmail } from "./gmail";
import type { OutreachPipeline, ResponseSentiment } from "@/types/agent";

const PERSONA = process.env.OUTREACH_PERSONA_NAME || "Sarah";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://rehab-atlas.com";

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
Determine the sender's intent and sentiment. Our standard commission is 12% (10% with 3 blogs/month, 8% with 5 blogs/month). We also have a launch campaign: 0% commission for first 2 months with 3 blogs/month for 3 months.
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
    // Don't immediately decline — send a polite follow-up to understand why and try to convince
    nextStage = "negotiating";
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

  // If negative, send a polite follow-up to understand why and try to re-engage
  if (sentiment === "negative" && !analysis?.has_questions) {
    try {
      const winBackReply = await analyzeWithClaude<{ body_text: string }>({
        systemPrompt: `You are ${PERSONA} from Rehab-Atlas Partnerships. A rehab center has declined or expressed disinterest in partnering. Write a short, respectful reply that:
1. Thanks them for their honesty
2. Asks politely what their concern is — is it the commission, timing, or something else?
3. Mentions the launch offer (0% commission for 2 months with 3 blogs/month) in case they missed it
4. Keeps the door open without being pushy
5. Max 4-5 sentences. Sound human, not desperate.
6. NO phone calls — email only
Return JSON: { "body_text": "..." }`,
        userPrompt: `Center: ${center?.name || "Unknown"}
Their reply: ${reply.body}
Our previous offer: ${pipeline.proposed_commission_rate}% commission`,
        responseSchema: z.object({ body_text: z.string() }),
        maxTokens: 400,
      });

      const fallbackBody = `Hi,

Thanks for getting back to me — I appreciate you taking the time.

If you don't mind me asking, was there something specific that didn't feel right? I'd genuinely like to understand, whether it's the timing, the commission structure, or something else entirely.

Just in case it wasn't clear in my initial message, we're currently offering 0% commission for the first 2 months for early partners — the only ask is 3 blog articles per month, which come with backlinks to your website for SEO.

Either way, no hard feelings. If anything changes down the road, we'd love to hear from you.

Best,
${PERSONA}
Partnerships, Rehab-Atlas
info@rehab-atlas.com
rehab-atlas.com`;

      const bodyText = winBackReply?.body_text || fallbackBody;

      await sendEmail({
        to: reply.from.match(/<([^>]+)>/)?.[1] || reply.from,
        subject: `Re: ${reply.subject}`,
        bodyText,
        threadId: pipeline.outreach_thread_id || undefined,
      });

      await admin.from("outreach_emails").insert({
        pipeline_id: pipeline.id,
        center_id: pipeline.center_id,
        direction: "outbound",
        gmail_thread_id: pipeline.outreach_thread_id,
        from_email: process.env.GMAIL_OUTREACH_EMAIL || "info@rehab-atlas.com",
        to_email: reply.from.match(/<([^>]+)>/)?.[1] || reply.from,
        subject: `Re: ${reply.subject}`,
        body_text: bodyText,
        email_type: "negotiation",
      });

      await logAgentAction({
        agent_type: "outreach_response",
        action: "win_back_sent",
        details: { pipeline_id: pipeline.id, center_name: center?.name },
      });
    } catch (err) {
      console.error("Win-back reply failed:", err);
    }
  }

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

  // If they agreed, auto-onboard: create partner account + send credentials
  if (analysis?.agreed_to_partner) {
    try {
      await autoOnboardPartner(pipeline, center?.name || "", reply.from);
    } catch (err) {
      console.error("Auto-onboard failed:", err);
    }

    // Also create task for admin visibility
    await createAgentTask({
      agent_type: "outreach_response",
      entity_type: "outreach_pipeline",
      entity_id: pipeline.id,
      checklist: {
        center_name: center?.name,
        agreed: true,
        commission_rate: analysis.counter_offer_rate || pipeline.proposed_commission_rate,
        summary,
        auto_onboarded: true,
      },
      ai_summary: `${center?.name} agreed to partner! Account created and credentials sent. Moving to agreement.`,
      ai_recommendation: "approve",
      confidence: 0.95,
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

/**
 * Auto-onboard a partner when they agree:
 * 1. Create Supabase auth user with temp password
 * 2. Set profile as partner linked to center
 * 3. Send credentials + instructions email
 * 4. Update pipeline stage to terms_agreed
 */
async function autoOnboardPartner(
  pipeline: OutreachPipeline,
  centerName: string,
  replyFromEmail: string
): Promise<void> {
  const admin = createAdminClient();

  // Extract clean email from "Name <email>" format
  const emailMatch = replyFromEmail.match(/<([^>]+)>/) || [null, replyFromEmail];
  const contactEmail = (emailMatch[1] || replyFromEmail).trim().toLowerCase();

  // Extract contact name from reply email
  const nameMatch = replyFromEmail.match(/^([^<]+)</);
  const contactName = nameMatch ? nameMatch[1].trim() : contactEmail.split("@")[0];

  const tempPassword = "Welcome2RehabAtlas!";

  // Verify center exists before creating account
  const { data: centerCheck } = await admin
    .from("centers")
    .select("id, name")
    .eq("id", pipeline.center_id)
    .single();

  if (!centerCheck) {
    console.error("Auto-onboard: center not found:", pipeline.center_id);
    return;
  }

  console.log(`Auto-onboard: creating account for ${contactName} → center "${centerCheck.name}" (${pipeline.center_id})`);

  // Check if user already exists
  const { data: { users } } = await admin.auth.admin.listUsers();
  const existing = users?.find((u) => u.email === contactEmail);

  let userId: string;

  if (existing) {
    userId = existing.id;
    // Update to partner role
    await admin.from("profiles").upsert({
      id: userId,
      role: "partner",
      center_id: pipeline.center_id,
      full_name: contactName,
    });
  } else {
    // Create new user
    const { data: newUser, error } = await admin.auth.admin.createUser({
      email: contactEmail,
      password: tempPassword,
      email_confirm: true,
    });

    if (error || !newUser.user) {
      console.error("Failed to create partner user:", error?.message);
      return;
    }

    userId = newUser.user.id;

    await admin.from("profiles").upsert({
      id: userId,
      role: "partner",
      center_id: pipeline.center_id,
      full_name: contactName,
    });
  }

  // Send credentials email
  const credentialsBody = `Hi ${contactName.split(" ")[0]},

That's great to hear — welcome to Rehab-Atlas!

I've set up your partner account. Here are your login details:

Website: ${APP_URL}/auth/login
Email: ${contactEmail}
Temporary password: ${tempPassword}

Please log in and change your password right away. Once you're in, you'll find your partner dashboard where you can:

- Set up your center profile (description, photos, services, pricing)
- Start writing and submitting blog articles
- Track referrals and performance

Feel free to start building out your profile and drafting your first articles whenever you're ready. I'll send over our partnership agreement separately via PandaDoc for you to review and e-sign.

If you have any questions along the way, just reply to this email.

Best,
${PERSONA}
Partnerships, Rehab-Atlas
info@rehab-atlas.com
rehab-atlas.com`;

  await sendEmail({
    to: contactEmail,
    subject: `Re: Welcome to Rehab-Atlas — your partner account is ready`,
    bodyText: credentialsBody,
    threadId: pipeline.outreach_thread_id || undefined,
  });

  // Log the email
  await admin.from("outreach_emails").insert({
    pipeline_id: pipeline.id,
    center_id: pipeline.center_id,
    direction: "outbound",
    gmail_thread_id: pipeline.outreach_thread_id,
    from_email: process.env.GMAIL_OUTREACH_EMAIL || "info@rehab-atlas.com",
    to_email: contactEmail,
    subject: "Re: Welcome to Rehab-Atlas — your partner account is ready",
    body_text: credentialsBody,
    email_type: "negotiation",
  });

  // Update pipeline to terms_agreed
  await admin.from("outreach_pipeline").update({
    stage: "terms_agreed",
  }).eq("id", pipeline.id);

  // Update research data with contact info
  const research = pipeline.research_data || {};
  await admin.from("outreach_pipeline").update({
    research_data: { ...research, contact_person_name: contactName } as unknown as Record<string, unknown>,
  }).eq("id", pipeline.id);

  await logAgentAction({
    agent_type: "outreach_response",
    action: "partner_auto_onboarded",
    details: {
      pipeline_id: pipeline.id,
      center_id: pipeline.center_id,
      center_name: centerName,
      contact_email: contactEmail,
      contact_name: contactName,
      user_id: userId,
    },
  });
}

/**
 * Follow-up Admin Agent
 * Scans for stale items and sends follow-up emails to users.
 * Triggered by: Daily cron (09:00 Bangkok / 02:00 UTC)
 */

import { createAdminClient } from "@/lib/supabase/admin";
import { logAgentAction } from "./base";
import { sendFollowUpEmail, sendDailyDigest, sendLineNotify } from "./notify";
import { analyzeWithClaude } from "./claude";
import { z } from "zod";

const FOLLOW_UP_MESSAGE_SCHEMA = z.object({
  subject: z.string(),
  body: z.string(),
});

// ── Scan for Stale Items ──

interface StaleItem {
  entityType: string;
  entityId: string;
  label: string;
  email: string;
  userId: string | null;
  reason: string;
  daysSinceCreated: number;
}

async function findStaleItems(): Promise<StaleItem[]> {
  const admin = createAdminClient();
  const items: StaleItem[] = [];

  // 1. Draft centers older than 3 days with linked partners
  const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
  const { data: staleCenters } = await admin
    .from("centers")
    .select("id, name, created_at")
    .eq("status", "draft")
    .lt("created_at", threeDaysAgo);

  for (const center of staleCenters || []) {
    const { data: partner } = await admin
      .from("profiles")
      .select("id, email")
      .eq("center_id", center.id)
      .eq("role", "partner")
      .limit(1)
      .single();

    if (partner?.email) {
      items.push({
        entityType: "center",
        entityId: center.id,
        label: center.name || "Unnamed Center",
        email: partner.email,
        userId: partner.id,
        reason: "Center profile is still in draft. Please complete your profile to go live.",
        daysSinceCreated: Math.floor((Date.now() - new Date(center.created_at).getTime()) / (24 * 60 * 60 * 1000)),
      });
    }
  }

  // 2. Draft pages older than 7 days
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const { data: stalePages } = await admin
    .from("pages")
    .select("id, title, submitted_by, created_at")
    .eq("status", "draft")
    .lt("created_at", sevenDaysAgo)
    .not("content", "is", null);

  for (const page of stalePages || []) {
    if (page.submitted_by) {
      const { data: user } = await admin
        .from("profiles")
        .select("id, email")
        .eq("id", page.submitted_by)
        .single();

      if (user?.email) {
        items.push({
          entityType: "page",
          entityId: page.id,
          label: page.title || "Untitled Article",
          email: user.email,
          userId: user.id,
          reason: "Your article is still in draft. Please review and finalize it for publication.",
          daysSinceCreated: Math.floor((Date.now() - new Date(page.created_at).getTime()) / (24 * 60 * 60 * 1000)),
        });
      }
    }
  }

  return items;
}

// ── Generate Personalized Follow-up Message ──

async function generateFollowUpMessage(item: StaleItem, attemptNumber: number): Promise<{ subject: string; body: string }> {
  const tone = attemptNumber === 1 ? "gentle and encouraging" : attemptNumber === 2 ? "friendly but more direct" : "final reminder, polite but firm";

  const aiResult = await analyzeWithClaude({
    systemPrompt: `You are a friendly assistant for Rehab-Atlas. Write a follow-up email to remind someone to complete their ${item.entityType === "center" ? "center profile" : "article"}.
Tone: ${tone}. Be concise. Do not use markdown. Return JSON with "subject" and "body" (plain text, use \\n for line breaks).`,
    userPrompt: `Item: "${item.label}"
Type: ${item.entityType}
Days since created: ${item.daysSinceCreated}
Attempt: ${attemptNumber} of 3
Reason: ${item.reason}

Return JSON: { "subject": "email subject", "body": "email body text" }`,
    responseSchema: FOLLOW_UP_MESSAGE_SCHEMA,
    maxTokens: 300,
  });

  if (aiResult) return aiResult;

  // Template fallback
  const prefix = attemptNumber === 3 ? "Final Reminder" : attemptNumber === 2 ? "Friendly Reminder" : "Quick Reminder";
  return {
    subject: `${prefix}: Complete your ${item.entityType === "center" ? "center profile" : "article"} on Rehab-Atlas`,
    body: `Hi,\n\nThis is a ${tone.split(" ")[0]} reminder that your ${item.entityType === "center" ? "center profile" : "article"} "${item.label}" on Rehab-Atlas is still incomplete.\n\n${item.reason}\n\nPlease log in to Rehab-Atlas to complete it.\n\nBest regards,\nRehab-Atlas Team`,
  };
}

// ── Main Agent Function ──

export async function processFollowUp(): Promise<void> {
  const admin = createAdminClient();

  await logAgentAction({
    agent_type: "follow_up",
    action: "cron_started",
    details: { timestamp: new Date().toISOString() },
  });

  let followUpsSent = 0;
  let followUpsAbandoned = 0;
  const digestItems: Array<{ label: string; status: string; detail: string }> = [];

  // 1. Process existing active follow-ups that are due
  const { data: dueFollowUps } = await admin
    .from("agent_follow_ups")
    .select("*")
    .eq("status", "sent")
    .lte("next_follow_up", new Date().toISOString());

  for (const fu of dueFollowUps || []) {
    if (fu.attempt_number >= fu.max_attempts) {
      // Abandon
      await admin.from("agent_follow_ups").update({ status: "abandoned" }).eq("id", fu.id);
      followUpsAbandoned++;
      digestItems.push({
        label: fu.reason.slice(0, 50),
        status: "Abandoned",
        detail: `${fu.max_attempts} attempts, no response`,
      });
      continue;
    }

    // Send next follow-up
    const msg = await generateFollowUpMessage(
      {
        entityType: fu.entity_type,
        entityId: fu.entity_id,
        label: fu.reason,
        email: fu.target_email,
        userId: fu.target_user_id,
        reason: fu.reason,
        daysSinceCreated: Math.floor((Date.now() - new Date(fu.created_at).getTime()) / (24 * 60 * 60 * 1000)),
      },
      fu.attempt_number + 1
    );

    await sendFollowUpEmail({
      to: fu.target_email,
      subject: msg.subject,
      bodyHtml: `<p style="font-size:14px;line-height:1.6;white-space:pre-wrap;">${msg.body.replace(/\n/g, "<br>")}</p>`,
    });

    await admin.from("agent_follow_ups").update({
      attempt_number: fu.attempt_number + 1,
      message_sent: msg.body,
      next_follow_up: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
    }).eq("id", fu.id);

    followUpsSent++;
    digestItems.push({
      label: fu.target_email,
      status: `Attempt ${fu.attempt_number + 1}/${fu.max_attempts}`,
      detail: msg.subject,
    });
  }

  // 2. Find new stale items and create follow-up sequences
  const staleItems = await findStaleItems();

  for (const item of staleItems) {
    // Check if follow-up already exists
    const { data: existing } = await admin
      .from("agent_follow_ups")
      .select("id")
      .eq("entity_type", item.entityType)
      .eq("entity_id", item.entityId)
      .in("status", ["pending", "sent"])
      .limit(1)
      .single();

    if (existing) continue; // Already tracking

    // Create new follow-up and send first message
    const msg = await generateFollowUpMessage(item, 1);

    await sendFollowUpEmail({
      to: item.email,
      subject: msg.subject,
      bodyHtml: `<p style="font-size:14px;line-height:1.6;white-space:pre-wrap;">${msg.body.replace(/\n/g, "<br>")}</p>`,
    });

    await admin.from("agent_follow_ups").insert({
      entity_type: item.entityType,
      entity_id: item.entityId,
      target_user_id: item.userId,
      target_email: item.email,
      reason: item.reason,
      message_sent: msg.body,
      attempt_number: 1,
      status: "sent",
      next_follow_up: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
    });

    followUpsSent++;
    digestItems.push({
      label: item.label,
      status: "New follow-up",
      detail: `${item.entityType} — ${item.email}`,
    });
  }

  // 3. Send daily digest to owner
  const { count: pendingTasks } = await admin
    .from("agent_tasks")
    .select("*", { count: "exact", head: true })
    .in("status", ["pending", "awaiting_owner"]);

  await sendDailyDigest({
    followUpsSent,
    followUpsAbandoned,
    pendingTasks: pendingTasks || 0,
    items: digestItems,
  });

  // LINE for abandoned items
  if (followUpsAbandoned > 0) {
    await sendLineNotify(`📋 ${followUpsAbandoned} follow-up(s) abandoned (max attempts reached). Check your digest email.`);
  }

  await logAgentAction({
    agent_type: "follow_up",
    action: "cron_completed",
    details: { followUpsSent, followUpsAbandoned, staleItemsFound: staleItems.length, pendingTasks },
  });
}

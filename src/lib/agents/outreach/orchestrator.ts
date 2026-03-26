/**
 * Agent 6 — Master Orchestrator
 * Coordinates all outreach agents, advances pipeline stages,
 * computes metrics, handles monthly blog tier calculations.
 */

import { createAdminClient } from "@/lib/supabase/admin";
import { logAgentAction } from "@/lib/agents/base";
import { isAgentEnabled } from "@/lib/agents/config";
import { sendAgentEmail } from "@/lib/agents/notify";
import { processResearchAndDraft } from "./research";
import { processFollowUps } from "./followup";
import { processInboundReplies } from "./response-handler";
import { prepareAgreement, checkAgreementStatus } from "./agreement";
import { activateCenter } from "./activation";
import type { OutreachStage, PipelineFunnelMetrics } from "@/types/agent";

/**
 * Main orchestrator loop — called by cron every 30 minutes.
 * Advances pipeline stages and triggers sub-agents.
 */
export async function runOrchestrator(): Promise<void> {
  const admin = createAdminClient();

  // Check if orchestrator is enabled
  const enabled = await isAgentEnabled("outreach_orchestrator");
  if (!enabled) return;

  await logAgentAction({
    agent_type: "outreach_orchestrator",
    action: "orchestrator_run_started",
  });

  // 1. Process new centers → start research (1 at a time to stay within serverless timeout)
  if (await isAgentEnabled("outreach_research")) {
    const { data: newEntries } = await admin
      .from("outreach_pipeline")
      .select("center_id")
      .eq("stage", "new")
      .order("created_at", { ascending: true })
      .limit(1);

    for (const entry of newEntries || []) {
      try {
        await processResearchAndDraft(entry.center_id as string);
      } catch (err) {
        console.error("Research failed for center:", entry.center_id, err);
      }
    }
  }

  // 2. Process follow-ups
  if (await isAgentEnabled("outreach_followup")) {
    await processFollowUps();
  }

  // 3. Check for inbound replies
  if (await isAgentEnabled("outreach_response")) {
    await processInboundReplies();
  }

  // 4. Prepare agreements for terms_agreed centers
  if (await isAgentEnabled("outreach_agreement")) {
    const { data: agreed } = await admin
      .from("outreach_pipeline")
      .select("id")
      .eq("stage", "terms_agreed")
      .limit(10);

    for (const entry of agreed || []) {
      await prepareAgreement(entry.id as string);
    }
  }

  // 5. Check agreement signing status
  const { data: sentAgreements } = await admin
    .from("outreach_pipeline")
    .select("id")
    .eq("stage", "agreement_sent")
    .limit(20);

  for (const entry of sentAgreements || []) {
    await checkAgreementStatus(entry.id as string);
  }

  // 6. Activate centers with signed agreements
  if (await isAgentEnabled("outreach_activation")) {
    const { data: signed } = await admin
      .from("outreach_pipeline")
      .select("id")
      .eq("stage", "agreement_signed")
      .limit(10);

    for (const entry of signed || []) {
      await activateCenter(entry.id as string);
    }
  }

  // 7. Detect stalled pipelines (no update in 30 days)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  await admin
    .from("outreach_pipeline")
    .update({ stage: "stalled" })
    .in("stage", ["responded", "negotiating"])
    .lt("updated_at", thirtyDaysAgo.toISOString());

  await logAgentAction({
    agent_type: "outreach_orchestrator",
    action: "orchestrator_run_completed",
  });
}

/**
 * Calculate pipeline funnel metrics.
 */
export async function getFunnelMetrics(): Promise<PipelineFunnelMetrics> {
  const admin = createAdminClient();

  // Get counts by stage
  const { data: pipelines } = await admin
    .from("outreach_pipeline")
    .select("stage, created_at, outreach_sent_at, agreement_signed_at");

  const allStages: OutreachStage[] = [
    "new", "researching", "research_complete", "outreach_drafted",
    "outreach_sent", "followed_up", "responded", "negotiating", "terms_agreed",
    "agreement_drafted", "agreement_sent", "agreement_signed", "active",
    "stalled", "declined",
  ];

  const byStage = {} as Record<OutreachStage, number>;
  for (const stage of allStages) {
    byStage[stage] = 0;
  }

  const total = pipelines?.length || 0;
  let totalContacted = 0;
  let totalResponded = 0;
  let totalActive = 0;
  let totalDaysToClose = 0;
  let closedCount = 0;

  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
  let weekContacted = 0;
  let weekResponded = 0;
  let weekSigned = 0;

  for (const p of pipelines || []) {
    const stage = p.stage as OutreachStage;
    byStage[stage] = (byStage[stage] || 0) + 1;

    // Count contacted (any stage past outreach_sent)
    const contactedStages: OutreachStage[] = [
      "outreach_sent", "followed_up", "responded", "negotiating", "terms_agreed",
      "agreement_drafted", "agreement_sent", "agreement_signed", "active", "stalled", "declined",
    ];
    if (contactedStages.includes(stage)) totalContacted++;

    const respondedStages: OutreachStage[] = [
      "responded", "negotiating", "terms_agreed",
      "agreement_drafted", "agreement_sent", "agreement_signed", "active",
    ];
    if (respondedStages.includes(stage)) totalResponded++;

    if (stage === "active") totalActive++;

    // Calculate days to close
    if (stage === "active" && p.outreach_sent_at && p.agreement_signed_at) {
      const days = (new Date(p.agreement_signed_at as string).getTime() - new Date(p.outreach_sent_at as string).getTime()) / (1000 * 60 * 60 * 24);
      totalDaysToClose += days;
      closedCount++;
    }

    // This week stats
    if (p.outreach_sent_at && new Date(p.outreach_sent_at as string) > oneWeekAgo) weekContacted++;
    if (stage === "responded" && p.created_at && new Date(p.created_at as string) > oneWeekAgo) weekResponded++;
    if (p.agreement_signed_at && new Date(p.agreement_signed_at as string) > oneWeekAgo) weekSigned++;
  }

  return {
    total_centers: total,
    by_stage: byStage,
    response_rate: totalContacted > 0 ? totalResponded / totalContacted : 0,
    close_rate: totalResponded > 0 ? totalActive / totalResponded : 0,
    avg_days_to_close: closedCount > 0 ? totalDaysToClose / closedCount : 0,
    this_week_contacted: weekContacted,
    this_week_responded: weekResponded,
    this_week_signed: weekSigned,
  };
}

/**
 * Monthly blog tier calculation.
 * Run on the 1st of each month to count approved partner blogs and adjust commission.
 */
export async function calculateMonthlyBlogTiers(): Promise<void> {
  const admin = createAdminClient();

  // Calculate for last month
  const now = new Date();
  const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const yearMonth = `${lastMonth.getFullYear()}-${String(lastMonth.getMonth() + 1).padStart(2, "0")}`;

  const startOfLastMonth = new Date(lastMonth.getFullYear(), lastMonth.getMonth(), 1).toISOString();
  const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  // Count approved partner blogs per center
  const { data: pages } = await admin
    .from("pages")
    .select("author_center_id")
    .eq("status", "published")
    .eq("author_type", "partner")
    .gte("created_at", startOfLastMonth)
    .lt("created_at", startOfThisMonth)
    .not("author_center_id", "is", null);

  // Group by center
  const counts: Record<string, number> = {};
  for (const page of pages || []) {
    const centerId = page.author_center_id as string;
    counts[centerId] = (counts[centerId] || 0) + 1;
  }

  // Update blog counts and commission rates
  for (const [centerId, count] of Object.entries(counts)) {
    const tier = count >= 6 ? "premium" : count >= 3 ? "standard" : "none";
    const rate = tier === "premium" ? 8 : tier === "standard" ? 10 : 12;

    // Upsert blog count
    await admin.from("outreach_blog_counts").upsert(
      {
        center_id: centerId,
        year_month: yearMonth,
        approved_count: count,
        tier,
        effective_rate: rate,
        calculated_at: new Date().toISOString(),
      },
      { onConflict: "center_id,year_month" }
    );

    // Update center's commission rate if they have an active agreement
    const { data: center } = await admin
      .from("centers")
      .select("agreement_status")
      .eq("id", centerId)
      .single();

    if (center?.agreement_status === "active") {
      await admin
        .from("centers")
        .update({ commission_rate: rate })
        .eq("id", centerId);
    }
  }

  // Also handle active centers with 0 blogs — reset to 12%
  const { data: activeCenters } = await admin
    .from("centers")
    .select("id")
    .eq("agreement_status", "active")
    .neq("commission_rate", 12);

  for (const center of activeCenters || []) {
    if (!counts[center.id as string]) {
      // No blogs published — reset to standard rate
      await admin
        .from("centers")
        .update({ commission_rate: 12 })
        .eq("id", center.id);

      await admin.from("outreach_blog_counts").upsert(
        {
          center_id: center.id as string,
          year_month: yearMonth,
          approved_count: 0,
          tier: "none",
          effective_rate: 12,
          calculated_at: new Date().toISOString(),
        },
        { onConflict: "center_id,year_month" }
      );
    }
  }

  await logAgentAction({
    agent_type: "outreach_orchestrator",
    action: "blog_tiers_calculated",
    details: { year_month: yearMonth, centers_processed: Object.keys(counts).length },
  });
}

/**
 * Generate and send daily pipeline digest to admin.
 */
export async function sendDailyDigest(): Promise<void> {
  const metrics = await getFunnelMetrics();

  const stageLabels: Partial<Record<OutreachStage, string>> = {
    new: "New (queued)",
    researching: "Researching",
    research_complete: "Research Done",
    outreach_drafted: "Email Drafted (awaiting approval)",
    outreach_sent: "Outreach Sent",
    followed_up: "Follow-up Sent",
    responded: "Responded",
    negotiating: "Negotiating",
    terms_agreed: "Terms Agreed",
    agreement_drafted: "Agreement Drafted (awaiting approval)",
    agreement_sent: "Agreement Sent",
    agreement_signed: "Agreement Signed",
    active: "Active Partner",
    stalled: "Stalled",
    declined: "Declined",
  };

  const rows = Object.entries(metrics.by_stage)
    .filter(([, count]) => count > 0)
    .map(([stage, count]) => `<tr><td>${stageLabels[stage as OutreachStage] || stage}</td><td><strong>${count}</strong></td></tr>`)
    .join("");

  await sendAgentEmail({
    subject: `Outreach Pipeline Digest — ${new Date().toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}`,
    agentLabel: "Outreach Orchestrator",
    bodyHtml: `
      <h2>Pipeline Overview</h2>
      <table style="border-collapse:collapse;width:100%">
        <tr style="background:#f5f5f5"><td style="padding:8px"><strong>Total Centers</strong></td><td style="padding:8px"><strong>${metrics.total_centers}</strong></td></tr>
        ${rows}
      </table>
      <h3>This Week</h3>
      <ul>
        <li>Contacted: ${metrics.this_week_contacted}</li>
        <li>Responded: ${metrics.this_week_responded}</li>
        <li>Signed: ${metrics.this_week_signed}</li>
      </ul>
      <h3>Conversion Rates</h3>
      <ul>
        <li>Response rate: ${(metrics.response_rate * 100).toFixed(1)}%</li>
        <li>Close rate: ${(metrics.close_rate * 100).toFixed(1)}%</li>
        <li>Avg days to close: ${metrics.avg_days_to_close.toFixed(0)} days</li>
      </ul>
    `,
    actions: [],
  });
}

/**
 * Add centers to the pipeline from the database.
 * Used to bulk-load centers for outreach.
 */
export async function addCentersToPipeline(centerIds: string[]): Promise<number> {
  const admin = createAdminClient();
  let added = 0;

  for (const centerId of centerIds) {
    // Check if already in pipeline
    const { data: existing } = await admin
      .from("outreach_pipeline")
      .select("id")
      .eq("center_id", centerId)
      .single();

    if (existing) continue;

    const { error } = await admin
      .from("outreach_pipeline")
      .insert({ center_id: centerId, stage: "new" });

    if (!error) added++;
  }

  if (added > 0) {
    await logAgentAction({
      agent_type: "outreach_orchestrator",
      action: "centers_added_to_pipeline",
      details: { count: added, center_ids: centerIds },
    });
  }

  return added;
}

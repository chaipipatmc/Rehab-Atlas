/**
 * Content Orchestrator Agent
 *
 * Domain orchestrator for the content pillar (planner → creator → admin →
 * scheduler). Each leaf agent still runs on its own cron — this orchestrator
 * acts as a *supervisor* that detects stalls and triggers remediation:
 *
 *   1. If today is past the 25th and there's no calendar for next month,
 *      kick off the planner.
 *   2. If the content pool is below target *and* no creator run has happened
 *      in 24h, kick off the creator.
 *   3. If approved articles exist but no scheduler run today, kick off the
 *      scheduler.
 *   4. Run auto-approve to clear any drafts that pass quality.
 *
 * Returns a summary the system orchestrator and admin dashboard can read.
 */

import { createAdminClient } from "@/lib/supabase/admin";
import { isAgentEnabled, getAgentSettingNumber } from "./config";
import { logAgentAction } from "./base";
import { planMonthlyCalendar } from "./content-planner";
import { createArticleDraft } from "./content-creator";
import { autoApproveContent } from "./content-auto-approve";
import { publishFromPool } from "./content-scheduler";

export interface ContentOrchestratorResult {
  enabled: boolean;
  steps: Array<{
    step: string;
    triggered: boolean;
    reason: string;
    detail?: Record<string, unknown>;
  }>;
}

const DEFAULT_POOL_TARGET = 20;
const DEFAULT_CREATOR_STALL_HOURS = 24;

export async function runContentOrchestrator(): Promise<ContentOrchestratorResult> {
  const enabled = await isAgentEnabled("content_orchestrator");
  if (!enabled) {
    return { enabled: false, steps: [] };
  }

  const admin = createAdminClient();
  const result: ContentOrchestratorResult = { enabled: true, steps: [] };
  const now = new Date();

  // ── Step 1: Check planner — does next month have a calendar? ────────────
  if (now.getDate() >= 25) {
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const startISO = nextMonth.toISOString().slice(0, 10);
    const endOfNextMonth = new Date(now.getFullYear(), now.getMonth() + 2, 0)
      .toISOString()
      .slice(0, 10);

    const { count: existingCount } = await admin
      .from("content_calendar")
      .select("id", { count: "exact", head: true })
      .gte("planned_date", startISO)
      .lte("planned_date", endOfNextMonth);

    if (!existingCount || existingCount === 0) {
      const planResult = await planMonthlyCalendar();
      result.steps.push({
        step: "planner",
        triggered: planResult.success,
        reason: planResult.success
          ? `Planned ${planResult.count} topics for next month`
          : `Skipped: ${planResult.reason}`,
        detail: { count: planResult.count },
      });
    } else {
      result.steps.push({
        step: "planner",
        triggered: false,
        reason: `Calendar already exists for next month (${existingCount} topics)`,
      });
    }
  } else {
    result.steps.push({
      step: "planner",
      triggered: false,
      reason: `Day ${now.getDate()} — planner runs after the 25th`,
    });
  }

  // ── Step 2: Creator — is the pool below target and stale? ────────────────
  const poolTarget = await getAgentSettingNumber(
    "content_creator",
    "pool_target",
    DEFAULT_POOL_TARGET
  );
  const { count: draftCount } = await admin
    .from("pages")
    .select("id", { count: "exact", head: true })
    .eq("page_type", "blog")
    .eq("status", "draft");
  const { count: approvedCount } = await admin
    .from("pages")
    .select("id", { count: "exact", head: true })
    .eq("page_type", "blog")
    .eq("status", "approved");
  const poolSize = (draftCount || 0) + (approvedCount || 0);

  if (poolSize < poolTarget) {
    // Check when content_creator last ran
    const stallHours = await getAgentSettingNumber(
      "content_orchestrator",
      "creator_stall_hours",
      DEFAULT_CREATOR_STALL_HOURS
    );
    const stallCutoff = new Date(now.getTime() - stallHours * 3600_000).toISOString();

    const { data: lastCreatorRun } = await admin
      .from("agent_log")
      .select("created_at")
      .eq("agent_type", "content_creator")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const creatorIsStale =
      !lastCreatorRun || (lastCreatorRun.created_at as string) < stallCutoff;

    if (creatorIsStale) {
      const creatorResult = await createArticleDraft({
        maxArticles: 2,
        skipWeekendCheck: true,
      });
      // Auto-approve any drafts that pass quality gates
      const approveResult = await autoApproveContent();
      result.steps.push({
        step: "creator",
        triggered: creatorResult.written > 0,
        reason: creatorResult.written > 0
          ? `Drafted ${creatorResult.written} articles, pool now ${creatorResult.poolSize}`
          : `No new drafts (pool at ${creatorResult.poolSize}/${poolTarget})`,
        detail: {
          drafted: creatorResult.written,
          autoApproved: approveResult.approved,
          autoSkipped: approveResult.skipped,
          poolSize: creatorResult.poolSize,
        },
      });
    } else {
      result.steps.push({
        step: "creator",
        triggered: false,
        reason: `Pool below target (${poolSize}/${poolTarget}) but creator ran recently`,
      });
    }
  } else {
    result.steps.push({
      step: "creator",
      triggered: false,
      reason: `Pool full (${poolSize}/${poolTarget})`,
    });
  }

  // ── Step 3: Scheduler — anything to publish today? ──────────────────────
  if ((approvedCount || 0) > 0) {
    const todayStart = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate()
    ).toISOString();
    const { count: publishedToday } = await admin
      .from("pages")
      .select("id", { count: "exact", head: true })
      .eq("page_type", "blog")
      .eq("status", "published")
      .gte("published_at", todayStart);

    if (!publishedToday || publishedToday === 0) {
      const published = await publishFromPool();
      result.steps.push({
        step: "scheduler",
        triggered: published,
        reason: published
          ? "Published 1 article from pool"
          : "Scheduler ran, nothing to publish",
      });
    } else {
      result.steps.push({
        step: "scheduler",
        triggered: false,
        reason: `Already published ${publishedToday} article(s) today`,
      });
    }
  } else {
    result.steps.push({
      step: "scheduler",
      triggered: false,
      reason: "No approved articles in pool to publish",
    });
  }

  // ── Log + return ─────────────────────────────────────────────────────────
  await logAgentAction({
    agent_type: "content_orchestrator",
    action: "supervised",
    details: { result },
  });

  return result;
}

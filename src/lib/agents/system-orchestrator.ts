/**
 * System Orchestrator Agent
 *
 * Top-level supervisor that watches every other agent's heartbeat and
 * surfaces health on the admin dashboard. It is intentionally narrow:
 *
 *   1. Health watcher — for each cron-driven agent, compare last log entry
 *      to its expected interval. Flag stale ones.
 *   2. Status persistence — write a snapshot to site_settings under
 *      `system_health_snapshot` so admin UI can read it without re-querying.
 *
 * Cross-pillar routing (e.g. "outreach activated → trigger content for
 * partner's country") is intentionally NOT included in v1 — once we see
 * which routings actually matter in production we can add them as a small
 * allowlist of trigger rules. Until then this stays a read-only watcher.
 */

import { createAdminClient } from "@/lib/supabase/admin";
import {
  isAgentEnabled,
  getAgentSettingNumber,
  setAgentSetting,
} from "./config";
import { logAgentAction } from "./base";
import type { AgentType } from "@/types/agent";

// Expected cadence per cron agent, in minutes. Must stay in sync with
// vercel.json. Webhook-driven agents are intentionally absent (no expected
// interval) and are handled via a long fallback threshold.
const EXPECTED_INTERVAL_MIN: Partial<Record<AgentType, number>> = {
  outreach_orchestrator: 30,
  outreach_response: 15,
  outreach_followup: 60 * 24, // daily
  content_creator: 60 * 24,
  content_scheduler: 60 * 24,
  content_planner: 60 * 24 * 30, // monthly
  follow_up: 60 * 24,
  content_orchestrator: 30,
};

// Webhook-driven agents — flagged stale only after this many days of silence.
const WEBHOOK_FALLBACK_DAYS = 14;

export type AgentHealth = "healthy" | "stale" | "never_run" | "disabled" | "unknown";

export interface AgentHealthEntry {
  agent: AgentType;
  enabled: boolean;
  lastRunAt: string | null;
  expectedIntervalMin: number | null;
  ageMinutes: number | null;
  health: AgentHealth;
  detail: string;
}

export interface SystemOrchestratorResult {
  enabled: boolean;
  generatedAt: string;
  staleCount: number;
  healthyCount: number;
  agents: AgentHealthEntry[];
}

const ALL_AGENTS: AgentType[] = [
  "center_admin",
  "content_admin",
  "follow_up",
  "lead_verify",
  "outreach_research",
  "outreach_followup",
  "outreach_response",
  "outreach_agreement",
  "outreach_activation",
  "outreach_orchestrator",
  "content_creator",
  "content_scheduler",
  "content_planner",
  "content_auto_approve",
  "content_orchestrator",
];

export async function runSystemOrchestrator(): Promise<SystemOrchestratorResult> {
  const enabled = await isAgentEnabled("system_orchestrator");
  if (!enabled) {
    return {
      enabled: false,
      generatedAt: new Date().toISOString(),
      staleCount: 0,
      healthyCount: 0,
      agents: [],
    };
  }

  const admin = createAdminClient();
  const now = Date.now();
  const stallMultiplier = await getAgentSettingNumber(
    "system_orchestrator",
    "stale_threshold_multiplier",
    2
  );

  // Pull most recent log entry per agent in one query (window function would
  // be ideal, but we keep it simple and bucket on the client).
  const { data: recentLogs } = await admin
    .from("agent_log")
    .select("agent_type, created_at")
    .order("created_at", { ascending: false })
    .limit(500);

  const lastSeen = new Map<string, string>();
  for (const row of recentLogs || []) {
    const key = row.agent_type as string;
    if (!lastSeen.has(key)) lastSeen.set(key, row.created_at as string);
  }

  // Pull enabled flags for all agents in one shot
  const { data: settings } = await admin
    .from("site_settings")
    .select("key, value")
    .like("key", "agent_%_enabled");

  const enabledMap = new Map<string, boolean>();
  for (const row of settings || []) {
    const m = (row.key as string).match(/^agent_(.+)_enabled$/);
    if (!m) continue;
    enabledMap.set(m[1], row.value === "true" || row.value === true);
  }

  const entries: AgentHealthEntry[] = [];
  for (const agent of ALL_AGENTS) {
    const isOn = enabledMap.get(agent) ?? false;
    const lastRunAt = lastSeen.get(agent) ?? null;
    const expectedIntervalMin = EXPECTED_INTERVAL_MIN[agent] ?? null;
    const ageMinutes = lastRunAt
      ? Math.round((now - new Date(lastRunAt).getTime()) / 60_000)
      : null;

    let health: AgentHealth;
    let detail = "";

    if (!isOn) {
      health = "disabled";
      detail = "Agent toggled off";
    } else if (!lastRunAt) {
      health = "never_run";
      detail = "No log entries yet";
    } else if (expectedIntervalMin !== null) {
      const threshold = expectedIntervalMin * stallMultiplier;
      if ((ageMinutes ?? 0) > threshold) {
        health = "stale";
        detail = `Last run ${formatAge(ageMinutes!)} ago (expected every ${formatAge(expectedIntervalMin)})`;
      } else {
        health = "healthy";
        detail = `Last run ${formatAge(ageMinutes!)} ago`;
      }
    } else {
      // Webhook-driven agent — fall back to the long threshold
      const thresholdMin = WEBHOOK_FALLBACK_DAYS * 24 * 60;
      if ((ageMinutes ?? 0) > thresholdMin) {
        health = "stale";
        detail = `No webhook activity in ${formatAge(ageMinutes!)} (threshold ${WEBHOOK_FALLBACK_DAYS}d)`;
      } else {
        health = "healthy";
        detail = `Last webhook ${formatAge(ageMinutes!)} ago`;
      }
    }

    entries.push({
      agent,
      enabled: isOn,
      lastRunAt,
      expectedIntervalMin,
      ageMinutes,
      health,
      detail,
    });
  }

  const staleCount = entries.filter((e) => e.health === "stale").length;
  const healthyCount = entries.filter((e) => e.health === "healthy").length;

  const result: SystemOrchestratorResult = {
    enabled: true,
    generatedAt: new Date().toISOString(),
    staleCount,
    healthyCount,
    agents: entries,
  };

  // Persist snapshot for the dashboard
  await setAgentSetting(
    "system_orchestrator",
    "health_snapshot",
    JSON.stringify(result)
  );

  await logAgentAction({
    agent_type: "system_orchestrator",
    action: "health_check",
    details: {
      stale: staleCount,
      healthy: healthyCount,
      stale_agents: entries.filter((e) => e.health === "stale").map((e) => e.agent),
    },
  });

  return result;
}

/**
 * Read the last persisted health snapshot. Cheap; safe to call from RSC.
 */
export async function getSystemHealthSnapshot(): Promise<SystemOrchestratorResult | null> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("site_settings")
    .select("value")
    .eq("key", "agent_system_orchestrator_setting_health_snapshot")
    .maybeSingle();
  if (!data?.value) return null;
  try {
    return JSON.parse(data.value as string) as SystemOrchestratorResult;
  } catch {
    return null;
  }
}

function formatAge(min: number): string {
  if (min < 60) return `${min}m`;
  const h = Math.round(min / 60);
  if (h < 48) return `${h}h`;
  const d = Math.round(h / 24);
  return `${d}d`;
}

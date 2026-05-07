/**
 * Rehab-Atlas Agent System — Configuration
 * Controls which agents are active. Owner can toggle each agent on/off.
 *
 * When an agent is OFF, the system works exactly like before (manual admin).
 * When ON, the agent processes events and emails the owner for approval.
 */

import { createAdminClient } from "@/lib/supabase/admin";
import type { AgentType } from "@/types/agent";

// Default: all agents OFF (manual mode) until owner enables them
const DEFAULT_CONFIG: Record<AgentType, boolean> = {
  center_admin: false,
  content_admin: false,
  follow_up: false,
  lead_verify: false,
  outreach_research: false,
  outreach_followup: false,
  outreach_response: false,
  outreach_agreement: false,
  outreach_activation: false,
  outreach_orchestrator: false,
  content_creator: false,
  content_scheduler: false,
  content_planner: false,
  content_auto_approve: false,
};

/**
 * Check if a specific agent is enabled.
 * Reads from site_settings or falls back to defaults.
 */
export async function isAgentEnabled(agentType: AgentType): Promise<boolean> {
  try {
    const admin = createAdminClient();
    const { data } = await admin
      .from("site_settings")
      .select("value")
      .eq("key", `agent_${agentType}_enabled`)
      .single();

    if (data?.value !== undefined) {
      return data.value === "true" || data.value === true;
    }
  } catch {
    // Table might not exist yet or key not set
  }

  return DEFAULT_CONFIG[agentType] || false;
}

/**
 * Get all agent states.
 */
export async function getAgentConfig(): Promise<Record<AgentType, boolean>> {
  const agents: AgentType[] = [
    "center_admin", "content_admin", "follow_up", "lead_verify",
    "outreach_research", "outreach_followup", "outreach_response",
    "outreach_agreement", "outreach_activation", "outreach_orchestrator",
    "content_creator", "content_scheduler", "content_planner", "content_auto_approve",
  ];
  const config: Record<string, boolean> = {};

  for (const agent of agents) {
    config[agent] = await isAgentEnabled(agent);
  }

  return config as Record<AgentType, boolean>;
}

/**
 * Toggle an agent on or off.
 */
export async function setAgentEnabled(agentType: AgentType, enabled: boolean): Promise<void> {
  const admin = createAdminClient();

  // Upsert into site_settings
  await admin.from("site_settings").upsert(
    { key: `agent_${agentType}_enabled`, value: String(enabled) },
    { onConflict: "key" }
  );
}

// ─── Per-agent settings (beyond the on/off toggle) ─────────────────────────
//
// Each agent can store arbitrary key/value config in site_settings under the
// pattern `agent_<type>_setting_<key>`. Helpers below read/write these with
// type coercion + sensible defaults so agent code can opt in without
// breaking when a setting is unset.

function settingKey(agentType: AgentType, key: string): string {
  return `agent_${agentType}_setting_${key}`;
}

export async function getAgentSettingRaw(
  agentType: AgentType,
  key: string
): Promise<string | null> {
  try {
    const admin = createAdminClient();
    const { data } = await admin
      .from("site_settings")
      .select("value")
      .eq("key", settingKey(agentType, key))
      .maybeSingle();
    return (data?.value as string) ?? null;
  } catch {
    return null;
  }
}

export async function getAgentSettingNumber(
  agentType: AgentType,
  key: string,
  fallback: number
): Promise<number> {
  const raw = await getAgentSettingRaw(agentType, key);
  if (raw === null || raw === "") return fallback;
  const n = Number(raw);
  return Number.isFinite(n) ? n : fallback;
}

export async function getAgentSettingString(
  agentType: AgentType,
  key: string,
  fallback: string
): Promise<string> {
  const raw = await getAgentSettingRaw(agentType, key);
  return raw ?? fallback;
}

export async function getAgentSettingNumberArray(
  agentType: AgentType,
  key: string,
  fallback: number[]
): Promise<number[]> {
  const raw = await getAgentSettingRaw(agentType, key);
  if (!raw) return fallback;
  const parts = raw
    .split(",")
    .map((p) => Number(p.trim()))
    .filter((n) => Number.isFinite(n));
  return parts.length > 0 ? parts : fallback;
}

export async function setAgentSetting(
  agentType: AgentType,
  key: string,
  value: string
): Promise<void> {
  const admin = createAdminClient();
  await admin
    .from("site_settings")
    .upsert(
      { key: settingKey(agentType, key), value },
      { onConflict: "key" }
    );
}

/**
 * Read all per-agent settings as a nested map: { [agent]: { [key]: value } }.
 * Used by the admin UI to render configuration panels.
 */
export async function getAllAgentSettings(): Promise<
  Record<string, Record<string, string>>
> {
  try {
    const admin = createAdminClient();
    const { data } = await admin
      .from("site_settings")
      .select("key, value")
      .like("key", "agent_%_setting_%");
    const out: Record<string, Record<string, string>> = {};
    for (const row of data || []) {
      const m = (row.key as string).match(/^agent_(.+)_setting_(.+)$/);
      if (!m) continue;
      const [, agent, key] = m;
      if (!out[agent]) out[agent] = {};
      out[agent][key] = row.value as string;
    }
    return out;
  } catch {
    return {};
  }
}

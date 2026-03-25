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

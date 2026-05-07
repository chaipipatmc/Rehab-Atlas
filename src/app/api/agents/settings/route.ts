/**
 * Agent Settings API — read/write per-agent configuration knobs.
 * On/off toggles live at /api/agents/config; everything else lives here.
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  getAllAgentSettings,
  setAgentSetting,
} from "@/lib/agents/config";
import type { AgentType } from "@/types/agent";

const VALID_AGENTS: AgentType[] = [
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
];

// Allowlist of editable keys per agent. Anything not in this map is rejected
// to keep accidental writes from accumulating dead settings.
const ALLOWED_KEYS: Partial<Record<AgentType, string[]>> = {
  content_creator: ["pool_target", "articles_per_run"],
  content_scheduler: ["daily_publish_count"],
  content_planner: ["topics_per_day"],
  outreach_research: ["persona_name", "max_drafts_per_run"],
  outreach_followup: ["follow_up_days"],
};

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, status: 401, error: "Unauthorized" };
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "admin") {
    return { ok: false as const, status: 403, error: "Admin only" };
  }
  return { ok: true as const };
}

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const settings = await getAllAgentSettings();
  return NextResponse.json({ settings, allowedKeys: ALLOWED_KEYS });
}

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const body = (await request.json()) as { agent?: string; key?: string; value?: unknown };
  const { agent, key, value } = body;

  if (!agent || !VALID_AGENTS.includes(agent as AgentType)) {
    return NextResponse.json({ error: "Invalid agent" }, { status: 400 });
  }
  if (!key || typeof key !== "string") {
    return NextResponse.json({ error: "Invalid key" }, { status: 400 });
  }
  const allowed = ALLOWED_KEYS[agent as AgentType] || [];
  if (!allowed.includes(key)) {
    return NextResponse.json(
      { error: `Setting '${key}' is not editable for ${agent}` },
      { status: 400 }
    );
  }

  // Coerce value to string for storage; client is expected to send the right
  // shape (numbers as strings, csv for arrays, etc.)
  const stringValue =
    value === null || value === undefined ? "" : String(value);

  await setAgentSetting(agent as AgentType, key, stringValue);
  return NextResponse.json({ success: true, agent, key, value: stringValue });
}

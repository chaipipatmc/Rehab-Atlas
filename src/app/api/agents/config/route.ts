/**
 * Agent Config API — Toggle agents on/off
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAgentConfig, setAgentEnabled } from "@/lib/agents/config";
import type { AgentType } from "@/types/agent";

const VALID_AGENTS: AgentType[] = [
  "center_admin", "content_admin", "follow_up", "lead_verify",
  "outreach_research", "outreach_followup", "outreach_response",
  "outreach_agreement", "outreach_activation", "outreach_orchestrator",
  "content_creator", "content_scheduler", "content_planner",
];

// GET: Return current agent config
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") return NextResponse.json({ error: "Admin only" }, { status: 403 });

  const config = await getAgentConfig();
  return NextResponse.json(config);
}

// POST: Toggle an agent
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") return NextResponse.json({ error: "Admin only" }, { status: 403 });

  const { agent, enabled } = await request.json();

  if (!VALID_AGENTS.includes(agent)) {
    return NextResponse.json({ error: "Invalid agent type" }, { status: 400 });
  }

  await setAgentEnabled(agent, !!enabled);
  return NextResponse.json({ success: true, agent, enabled: !!enabled });
}

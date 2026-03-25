/**
 * Outreach Activation API — Manual trigger for center activation
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isAgentEnabled } from "@/lib/agents/config";
import { activateCenter } from "@/lib/agents/outreach/activation";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") return NextResponse.json({ error: "Admin only" }, { status: 403 });

  const { pipeline_id } = await request.json();
  if (!pipeline_id) return NextResponse.json({ error: "pipeline_id required" }, { status: 400 });

  const enabled = await isAgentEnabled("outreach_activation");
  if (!enabled) return NextResponse.json({ error: "Activation agent disabled" }, { status: 400 });

  const success = await activateCenter(pipeline_id);
  return NextResponse.json({ success });
}

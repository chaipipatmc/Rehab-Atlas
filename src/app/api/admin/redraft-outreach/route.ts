import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createAgentTask } from "@/lib/agents/base";
import {
  generateInitialOutreach,
  getOutreachSystemPrompt,
  getOutreachUserPrompt,
} from "@/lib/agents/outreach/templates/outreach-email";
import type { CenterResearch } from "@/types/agent";

const PERSONA = process.env.OUTREACH_PERSONA_NAME || "Sarah";

/**
 * Delete all drafted outreach emails and re-create them with the new template.
 * POST /api/admin/redraft-outreach
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminClient();

  // 1. Get all drafted pipelines
  const { data: pipelines } = await admin
    .from("outreach_pipeline")
    .select("*")
    .eq("stage", "outreach_drafted");

  if (!pipelines?.length) {
    return NextResponse.json({ redrafted: 0, message: "No drafted emails found" });
  }

  const pipelineIds = pipelines.map((p) => p.id);

  // 2. Delete old outreach emails for these pipelines
  await admin
    .from("outreach_emails")
    .delete()
    .in("pipeline_id", pipelineIds)
    .eq("email_type", "outreach")
    .eq("direction", "outbound");

  // 3. Delete old agent tasks for these pipelines
  await admin
    .from("agent_tasks")
    .delete()
    .in("entity_id", pipelineIds)
    .eq("agent_type", "outreach_research");

  // 4. Set up Claude AI
  let anthropic: InstanceType<typeof import("@anthropic-ai/sdk").default> | null = null;
  if (process.env.ANTHROPIC_API_KEY) {
    const Anthropic = (await import("@anthropic-ai/sdk")).default;
    anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }

  // 5. Re-draft each email fresh
  let redrafted = 0;
  let failed = 0;

  for (const pipeline of pipelines) {
    try {
      const research = (pipeline.research_data || {}) as unknown as CenterResearch;
      const contactPerson = research.contact_person_name || null;

      const { data: center } = await admin
        .from("centers")
        .select("name, email")
        .eq("id", pipeline.center_id)
        .single();

      if (!center) { failed++; continue; }

      let subject: string;
      let bodyText: string;

      // Try Claude AI first
      if (anthropic) {
        try {
          const response = await anthropic.messages.create({
            model: "claude-sonnet-4-20250514",
            max_tokens: 800,
            system: getOutreachSystemPrompt(),
            messages: [{
              role: "user",
              content: getOutreachUserPrompt({
                centerName: center.name,
                contactPerson,
                research,
              }),
            }],
          });

          const text = response.content[0].type === "text" ? response.content[0].text : "";
          const jsonMatch = text.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            subject = parsed.subject;
            bodyText = parsed.body_text;
          } else {
            throw new Error("No JSON in response");
          }
        } catch {
          const tmpl = generateInitialOutreach({ centerName: center.name, contactPerson, research });
          subject = tmpl.subject;
          bodyText = tmpl.bodyText;
        }
      } else {
        const tmpl = generateInitialOutreach({ centerName: center.name, contactPerson, research });
        subject = tmpl.subject;
        bodyText = tmpl.bodyText;
      }

      const toEmail = pipeline.contact_email || center.email;

      // Insert new outreach email
      await admin.from("outreach_emails").insert({
        pipeline_id: pipeline.id,
        center_id: pipeline.center_id,
        direction: "outbound",
        from_email: process.env.GMAIL_OUTREACH_EMAIL || "info@rehab-atlas.com",
        to_email: toEmail,
        subject,
        body_text: bodyText,
        email_type: "outreach",
      });

      // Create new agent task for approval
      await createAgentTask({
        agent_type: "outreach_research",
        entity_type: "outreach_pipeline",
        entity_id: pipeline.id,
        checklist: {
          center_name: center.name,
          to_email: toEmail,
          from_email: process.env.GMAIL_OUTREACH_EMAIL || "info@rehab-atlas.com",
          subject,
          body_text: bodyText,
        },
        ai_summary: `Outreach email drafted for ${center.name} (${toEmail}). Subject: "${subject}"`,
        ai_recommendation: "approve",
        confidence: 0.9,
      });

      redrafted++;
    } catch (err) {
      console.error("Redraft failed for pipeline:", pipeline.id, err);
      failed++;
    }
  }

  return NextResponse.json({ redrafted, failed, total: pipelines.length });
}

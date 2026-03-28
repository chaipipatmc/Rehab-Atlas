import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  generateInitialOutreach,
  getOutreachSystemPrompt,
  getOutreachUserPrompt,
} from "@/lib/agents/outreach/templates/outreach-email";
import type { CenterResearch } from "@/types/agent";

/**
 * Re-draft all outreach_drafted emails with the new template (no commission).
 * POST /api/admin/redraft-outreach
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminClient();

  // Get all drafted pipelines
  const { data: pipelines } = await admin
    .from("outreach_pipeline")
    .select("*")
    .eq("stage", "outreach_drafted");

  if (!pipelines?.length) {
    return NextResponse.json({ redrafted: 0, message: "No drafted emails found" });
  }

  let redrafted = 0;
  let failed = 0;

  // Try to use Claude for personalized emails
  const hasAI = !!process.env.ANTHROPIC_API_KEY;
  let Anthropic: typeof import("@anthropic-ai/sdk").default | null = null;
  let anthropic: InstanceType<typeof import("@anthropic-ai/sdk").default> | null = null;

  if (hasAI) {
    const mod = await import("@anthropic-ai/sdk");
    Anthropic = mod.default;
    anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }

  for (const pipeline of pipelines) {
    try {
      const research = (pipeline.research_data || {}) as unknown as CenterResearch;
      const contactPerson = research.contact_person_name || null;

      // Get center info
      const { data: center } = await admin
        .from("centers")
        .select("name, email")
        .eq("id", pipeline.center_id)
        .single();

      if (!center) continue;

      let subject: string;
      let bodyText: string;

      if (anthropic) {
        // Use Claude AI for personalized email
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
            // Fallback to template
            const tmpl = generateInitialOutreach({ centerName: center.name, contactPerson, research });
            subject = tmpl.subject;
            bodyText = tmpl.bodyText;
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

      // Update the outreach_emails record
      await admin
        .from("outreach_emails")
        .update({ subject, body_text: bodyText })
        .eq("pipeline_id", pipeline.id)
        .eq("email_type", "outreach")
        .eq("direction", "outbound");

      // Update agent_task checklist with new email content
      await admin
        .from("agent_tasks")
        .update({
          checklist: {
            center_name: center.name,
            to_email: pipeline.contact_email || center.email,
            from_email: process.env.GMAIL_OUTREACH_EMAIL || "info@rehab-atlas.com",
            subject,
            body_text: bodyText,
          },
          ai_summary: `Outreach email drafted for ${center.name} (${pipeline.contact_email || center.email}). Subject: "${subject}"`,
        })
        .eq("entity_id", pipeline.id)
        .eq("agent_type", "outreach_research")
        .eq("status", "awaiting_owner");

      redrafted++;
    } catch (err) {
      console.error("Redraft failed for pipeline:", pipeline.id, err);
      failed++;
    }
  }

  return NextResponse.json({ redrafted, failed, total: pipelines.length });
}

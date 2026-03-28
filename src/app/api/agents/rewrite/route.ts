/**
 * Agent Rewrite API — regenerate a task's content based on admin feedback.
 * POST /api/agents/rewrite
 * Body: { taskId, feedback }
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { logClaudeUsage } from "@/lib/api-usage";

export const maxDuration = 60;

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") return NextResponse.json({ error: "Admin only" }, { status: 403 });

  const { taskId, feedback } = await request.json();
  if (!taskId || !feedback) return NextResponse.json({ error: "taskId and feedback required" }, { status: 400 });

  const admin = createAdminClient();

  // Get the task
  const { data: task } = await admin
    .from("agent_tasks")
    .select("*")
    .eq("id", taskId)
    .eq("status", "awaiting_owner")
    .single();

  if (!task) return NextResponse.json({ error: "Task not found" }, { status: 404 });

  const checklist = task.checklist as Record<string, unknown> | null;
  if (!checklist?.body_text) return NextResponse.json({ error: "No content to rewrite" }, { status: 400 });

  // Use Claude to rewrite based on feedback
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "AI not configured" }, { status: 500 });
  }

  try {
    const Anthropic = (await import("@anthropic-ai/sdk")).default;
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const isEmail = !!checklist.to_email;
    const model = "claude-sonnet-4-20250514";

    const response = await anthropic.messages.create({
      model,
      max_tokens: 1000,
      system: isEmail
        ? `You rewrite outreach emails for Rehab-Atlas based on admin feedback. Keep the same general structure and tone (warm, professional, human-sounding). Apply the feedback precisely. Return JSON: { "subject": "...", "body_text": "..." }. Use the signature: Sarah\\nPartnerships, Rehab-Atlas\\ninfo@rehab-atlas.com\\nrehab-atlas.com`
        : `You rewrite content for Rehab-Atlas based on admin feedback. Apply the feedback precisely and return the improved version. Return JSON with the same fields as the original.`,
      messages: [{
        role: "user",
        content: `Here is the current draft:

${isEmail ? `Subject: ${checklist.subject}\n\n` : ""}${checklist.body_text}

---

Admin feedback — please revise based on this:
${feedback}

${isEmail ? "Return JSON: { \"subject\": \"...\", \"body_text\": \"...\" }" : "Return the revised content as JSON with the same fields."}`,
      }],
    });

    await logClaudeUsage(response, task.agent_type, "rewrite_feedback", model, { taskId, feedback: feedback.slice(0, 100) });

    const text = response.content[0].type === "text" ? response.content[0].text : "";
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return NextResponse.json({ error: "Failed to parse rewrite" }, { status: 500 });

    const rewritten = JSON.parse(match[0]);

    // Update the task checklist with rewritten content
    const updatedChecklist = {
      ...checklist,
      ...(rewritten.subject ? { subject: rewritten.subject } : {}),
      ...(rewritten.body_text ? { body_text: rewritten.body_text } : {}),
      feedback_history: [
        ...((checklist.feedback_history as string[]) || []),
        feedback,
      ],
    };

    await admin.from("agent_tasks").update({ checklist: updatedChecklist }).eq("id", taskId);

    // Also update outreach_emails if this is an outreach email
    if (isEmail && task.entity_id) {
      await admin.from("outreach_emails").update({
        subject: rewritten.subject || checklist.subject,
        body_text: rewritten.body_text || checklist.body_text,
      }).eq("pipeline_id", task.entity_id).eq("email_type", "outreach").eq("direction", "outbound");
    }

    return NextResponse.json({
      success: true,
      subject: rewritten.subject || checklist.subject,
      body_text: rewritten.body_text || checklist.body_text,
    });
  } catch (err) {
    console.error("Rewrite failed:", err);
    return NextResponse.json({ error: "Rewrite failed" }, { status: 500 });
  }
}

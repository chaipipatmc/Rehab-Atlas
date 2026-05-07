/**
 * Bulk Action Endpoint
 * Processes multiple agent tasks at once.
 * For outreach emails: marks all as approved immediately, then sends
 * emails sequentially (non-blocking — response returns before all send).
 */

import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { logAgentAction } from "@/lib/agents/base";
import { sendEmail } from "@/lib/agents/outreach/gmail";
import { validateOrigin } from "@/lib/csrf";
import { pingIndexNow } from "@/lib/seo/indexnow";

export const maxDuration = 300; // 5 minutes for bulk sends

export async function POST(request: Request) {
  const originError = validateOrigin(request);
  if (originError) return originError;

  // Auth check
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "admin") {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }

  const { task_ids, decision } = await request.json();
  if (
    !Array.isArray(task_ids) ||
    task_ids.length === 0 ||
    !["approve", "reject"].includes(decision)
  ) {
    return NextResponse.json(
      { error: "Invalid parameters" },
      { status: 400 }
    );
  }

  const admin = createAdminClient();
  const dbDecision = decision === "approve" ? "approved" : "rejected";

  // 1. Fetch all tasks
  const { data: tasks } = await admin
    .from("agent_tasks")
    .select("id, agent_type, entity_type, entity_id, checklist, status")
    .in("id", task_ids)
    .eq("status", "awaiting_owner");

  if (!tasks || tasks.length === 0) {
    return NextResponse.json(
      { error: "No awaiting tasks found" },
      { status: 404 }
    );
  }

  // 2. Mark ALL tasks as approved/rejected immediately
  await admin
    .from("agent_tasks")
    .update({
      status: dbDecision,
      owner_decision: dbDecision,
      decided_at: new Date().toISOString(),
    })
    .in(
      "id",
      tasks.map((t) => t.id)
    );

  // 3. Process side effects by agent type
  const outreachTasks = tasks.filter(
    (t) => t.agent_type === "outreach_research" && decision === "approve"
  );
  const contentTasks = tasks.filter(
    (t) => t.agent_type === "content_admin" && decision === "approve"
  );

  // Publish approved content
  const publishedSlugs: string[] = [];
  for (const task of contentTasks) {
    const { data: page } = await admin
      .from("pages")
      .update({ status: "published", published_at: new Date().toISOString() })
      .eq("id", task.entity_id)
      .select("slug, page_type")
      .maybeSingle();
    if (page?.slug && page.page_type === "blog") {
      publishedSlugs.push(page.slug as string);
    }
  }
  if (publishedSlugs.length > 0) {
    await pingIndexNow([
      "/blog",
      "/sitemap.xml",
      ...publishedSlugs.map((s) => `/blog/${s}`),
    ]);
  }

  // Handle rejected outreach — mark pipeline as declined
  const rejectedOutreach = tasks.filter(
    (t) => t.agent_type === "outreach_research" && decision === "reject"
  );
  for (const task of rejectedOutreach) {
    await admin
      .from("outreach_pipeline")
      .update({ stage: "declined" })
      .eq("id", task.entity_id);
  }

  // 4. Send outreach emails sequentially (within this request)
  let emailsSent = 0;
  let emailsFailed = 0;

  for (const task of outreachTasks) {
    const cl = task.checklist as Record<string, unknown> | null;
    if (!cl?.to_email || !cl?.body_text) continue;

    try {
      const result = await sendEmail({
        to: cl.to_email as string,
        subject: (cl.subject as string) || "Partnership with Rehab-Atlas",
        bodyText: cl.body_text as string,
      });

      if (result) {
        emailsSent++;

        // Update pipeline stage
        await admin
          .from("outreach_pipeline")
          .update({
            stage: "outreach_sent",
            outreach_sent_at: new Date().toISOString(),
            gmail_thread_id: result.threadId || null,
          })
          .eq("id", task.entity_id);

        // Log email
        await admin.from("outreach_emails").insert({
          pipeline_id: task.entity_id,
          direction: "outbound",
          from_email: "info@rehab-atlas.com",
          to_email: cl.to_email as string,
          subject: cl.subject as string,
          body_text: cl.body_text as string,
          email_type: "initial_outreach",
          gmail_message_id: result.messageId,
          gmail_thread_id: result.threadId,
        });
      } else {
        emailsFailed++;
      }
    } catch (err) {
      emailsFailed++;
      console.error("Bulk email send error:", (err as Error).message);
    }

    // Small delay between sends to avoid rate limits
    await new Promise((r) => setTimeout(r, 500));
  }

  // Log bulk action
  await logAgentAction({
    agent_type: "center_admin" as const, // reuse existing type for logging
    action: `bulk_${dbDecision}`,
    details: {
      task_count: tasks.length,
      emails_sent: emailsSent,
      emails_failed: emailsFailed,
    },
  });

  return NextResponse.json({
    processed: tasks.length,
    emails_queued: outreachTasks.length,
    emails_sent: emailsSent,
    emails_failed: emailsFailed,
  });
}

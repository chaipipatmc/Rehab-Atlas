/**
 * Bulk Action Endpoint
 * Processes multiple agent tasks at once.
 * Bulk approve supports only outreach_research (sends the initial email) and
 * content_admin (publishes). Other types are rejected with a clear error.
 * Outreach emails are sent sequentially within the request; any task whose
 * send is blocked or fails is put back to awaiting_owner.
 */

import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { logAgentAction } from "@/lib/agents/base";
import { sendApprovedOutreach } from "@/lib/agents/outreach/research";
import { OutreachBlockedError } from "@/lib/agents/outreach/policy";
import { validateOrigin } from "@/lib/csrf";
import { pingIndexNow } from "@/lib/seo/indexnow";

export const maxDuration = 300; // 5 minutes for bulk sends

const BULK_APPROVE_TYPES = new Set(["outreach_research", "content_admin"]);

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

  // 1b. Bulk APPROVE only supports types whose side effects are implemented
  // here: outreach_research (send initial email) and content_admin (publish).
  // Any other type (follow-up / response / activation / agreement drafts,
  // center/lead/data reviews) must be approved one by one so it is actually
  // sent/applied — never silently marked approved without its side effect.
  if (decision === "approve") {
    const unsupported = tasks.filter((t) => !BULK_APPROVE_TYPES.has(t.agent_type as string));
    if (unsupported.length > 0) {
      const types = [...new Set(unsupported.map((t) => t.agent_type as string))];
      return NextResponse.json(
        {
          error: `Bulk approve is not supported for: ${types.join(", ")}. Approve these tasks one at a time. Nothing was changed.`,
          unsupported_task_ids: unsupported.map((t) => t.id),
          unsupported_types: types,
        },
        { status: 400 }
      );
    }
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

  // 4. Send outreach emails sequentially (within this request).
  // Each send goes through the policy guard (exclusions, opt-out, per-email
  // daily cap). When a send is blocked, that task and every task not yet
  // sent are put back to awaiting_owner so nothing is silently lost.
  let emailsSent = 0;
  let emailsFailed = 0;
  let blockedReason: string | null = null;
  const requeueIds: string[] = [];
  // Non-policy send failures: nothing was sent, so the task goes back to
  // awaiting approval with the error recorded (never left as "approved").
  const failed: { id: string; error: string }[] = [];

  for (const task of outreachTasks) {
    if (blockedReason) {
      requeueIds.push(task.id);
      continue;
    }

    const cl = task.checklist as Record<string, unknown> | null;
    if (!cl?.to_email || !cl?.body_text) {
      emailsFailed++;
      failed.push({ id: task.id, error: "No email draft (to_email/body_text missing)" });
      continue;
    }

    try {
      const ok = await sendApprovedOutreach(task.entity_id as string, {
        to_email: cl.to_email as string,
        subject: (cl.subject as string) || "Partnership with Rehab-Atlas",
        body_text: cl.body_text as string,
      });
      if (ok) emailsSent++;
      else {
        emailsFailed++;
        failed.push({ id: task.id, error: "Pipeline not found — not sent" });
      }
    } catch (err) {
      if (err instanceof OutreachBlockedError) {
        requeueIds.push(task.id);
        // Daily cap / unverifiable count → stop the whole batch.
        // Per-recipient block (excluded, opted out) → skip just this one.
        if (err.scope === "global") blockedReason = err.reason;
        else console.warn("Bulk send skipped (recipient blocked):", err.reason);
        continue;
      }
      emailsFailed++;
      failed.push({ id: task.id, error: (err as Error).message || String(err) });
      console.error("Bulk email send error:", (err as Error).message);
    }

    // Small delay between sends to avoid rate limits
    await new Promise((r) => setTimeout(r, 500));
  }

  if (requeueIds.length > 0) {
    await admin
      .from("agent_tasks")
      .update({ status: "awaiting_owner", owner_decision: null, decided_at: null })
      .in("id", requeueIds);
  }

  for (const f of failed) {
    await admin
      .from("agent_tasks")
      .update({
        status: "awaiting_owner",
        owner_decision: null,
        decided_at: null,
        error_message: f.error.slice(0, 1000),
      })
      .eq("id", f.id);
  }

  // Log bulk action
  await logAgentAction({
    agent_type: "center_admin" as const, // reuse existing type for logging
    action: `bulk_${dbDecision}`,
    details: {
      task_count: tasks.length,
      emails_sent: emailsSent,
      emails_failed: emailsFailed,
      emails_requeued: requeueIds.length,
      emails_failed_requeued: failed.length,
      blocked_reason: blockedReason,
    },
  });

  return NextResponse.json({
    processed: tasks.length,
    emails_queued: outreachTasks.length,
    emails_sent: emailsSent,
    emails_failed: emailsFailed,
    emails_requeued: requeueIds.length,
    blocked_reason: blockedReason,
  });
}

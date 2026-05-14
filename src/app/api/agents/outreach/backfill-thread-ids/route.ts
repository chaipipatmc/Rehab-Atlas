/**
 * Backfill `outreach_pipeline.outreach_thread_id` for sent pipelines that
 * are missing it. Without a thread_id the response handler can't find
 * replies (see response-handler.ts → .not("outreach_thread_id", "is", null)).
 *
 * Strategy per pipeline (admin POST, dry-run by default):
 *   1. Look up the most recent outbound email row in `outreach_emails`
 *      (direction='outbound') for this pipeline_id.
 *   2. If it has a gmail_message_id → fetch the message from Gmail to read
 *      its threadId.
 *   3. Else, fall back to Gmail search by `to:<email> subject:"<subject>"`.
 *   4. If found, update both outreach_pipeline.outreach_thread_id and the
 *      email row's gmail_thread_id.
 *
 * Runs in batches (default 25) and returns a summary so admin can dry-run
 * before applying. Trigger with ?apply=1 to persist changes.
 *
 * Admin-only. Idempotent: never overwrites an existing thread_id.
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  getMessageThreadId,
  searchThreadIdByQuery,
} from "@/lib/agents/outreach/gmail";

export const maxDuration = 120;

const DEFAULT_BATCH_SIZE = 25;
const STAGES_TO_FIX = [
  "outreach_sent",
  "followed_up",
  "responded",
  "negotiating",
  "stalled",
];

interface PipelineRow {
  id: string;
  center_id: string;
  stage: string;
  outreach_email_id: string | null;
  outreach_sent_at: string | null;
}

interface EmailRow {
  id: string;
  gmail_message_id: string | null;
  to_email: string | null;
  subject: string | null;
  sent_at: string | null;
  created_at: string;
}

interface ResultRow {
  pipelineId: string;
  centerId: string;
  stage: string;
  source: "message_id" | "search" | "no_outbound" | "no_match" | "skipped";
  threadId: string | null;
  applied: boolean;
  detail: string;
}

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

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const url = new URL(request.url);
  const apply = url.searchParams.get("apply") === "1";
  const batchSize = Math.max(
    1,
    Math.min(100, Number(url.searchParams.get("batch")) || DEFAULT_BATCH_SIZE)
  );

  const admin = createAdminClient();

  // Find pipelines missing a thread_id in actionable stages
  const { data: pipelines, error: pipeErr } = await admin
    .from("outreach_pipeline")
    .select("id, center_id, stage, outreach_email_id, outreach_sent_at")
    .in("stage", STAGES_TO_FIX)
    .is("outreach_thread_id", null)
    .order("outreach_sent_at", { ascending: false })
    .limit(batchSize);

  if (pipeErr) {
    return NextResponse.json({ error: pipeErr.message }, { status: 500 });
  }

  const candidates = (pipelines || []) as PipelineRow[];

  const results: ResultRow[] = [];
  let summary = {
    examined: candidates.length,
    foundViaMessageId: 0,
    foundViaSearch: 0,
    noOutboundRow: 0,
    noMatch: 0,
    applied: 0,
    dryRun: !apply,
    batchSize,
  };

  for (const p of candidates) {
    // Find the most recent outbound email row for this pipeline
    const { data: emails } = await admin
      .from("outreach_emails")
      .select("id, gmail_message_id, to_email, subject, sent_at, created_at")
      .eq("pipeline_id", p.id)
      .eq("direction", "outbound")
      .order("created_at", { ascending: false })
      .limit(1);

    const email = (emails || [])[0] as EmailRow | undefined;

    if (!email) {
      results.push({
        pipelineId: p.id,
        centerId: p.center_id,
        stage: p.stage,
        source: "no_outbound",
        threadId: null,
        applied: false,
        detail: "No outbound email row found — cannot resolve via Gmail",
      });
      summary.noOutboundRow++;
      continue;
    }

    // Strategy 1: lookup by gmail_message_id
    let threadId: string | null = null;
    let source: ResultRow["source"] = "no_match";

    if (email.gmail_message_id) {
      threadId = await getMessageThreadId(email.gmail_message_id);
      if (threadId) {
        source = "message_id";
        summary.foundViaMessageId++;
      }
    }

    // Strategy 2: search by to + subject
    if (!threadId && email.to_email && email.subject) {
      // Escape quotes in subject for Gmail search syntax
      const safeSubject = email.subject.replace(/"/g, "");
      const query = `to:${email.to_email} subject:"${safeSubject}"`;
      threadId = await searchThreadIdByQuery(query);
      if (threadId) {
        source = "search";
        summary.foundViaSearch++;
      }
    }

    if (!threadId) {
      results.push({
        pipelineId: p.id,
        centerId: p.center_id,
        stage: p.stage,
        source: "no_match",
        threadId: null,
        applied: false,
        detail: email.gmail_message_id
          ? `Gmail message ${email.gmail_message_id} not found (deleted?) and search by subject returned nothing`
          : "No gmail_message_id and Gmail search returned nothing",
      });
      summary.noMatch++;
      continue;
    }

    // Apply if requested
    let applied = false;
    if (apply) {
      const { error: upErr } = await admin
        .from("outreach_pipeline")
        .update({ outreach_thread_id: threadId })
        .eq("id", p.id)
        .is("outreach_thread_id", null); // idempotent — never overwrite

      if (!upErr) {
        // Also fill the email row's thread_id if missing
        if (!email.id) {
          /* defensive: email.id should exist */
        } else {
          await admin
            .from("outreach_emails")
            .update({ gmail_thread_id: threadId })
            .eq("id", email.id)
            .is("gmail_thread_id", null);
        }
        applied = true;
        summary.applied++;
      }
    }

    results.push({
      pipelineId: p.id,
      centerId: p.center_id,
      stage: p.stage,
      source,
      threadId,
      applied,
      detail: applied
        ? `Resolved via ${source} and updated`
        : `Resolved via ${source} (dry run, not applied)`,
    });
  }

  return NextResponse.json({ summary, results });
}

export async function GET(request: Request) {
  // GET = dry run, never applies
  const url = new URL(request.url);
  url.searchParams.delete("apply");
  return POST(new Request(url.toString(), request));
}

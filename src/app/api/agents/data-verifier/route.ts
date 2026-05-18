/**
 * Data Verifier Agent — Cron endpoint
 *
 * Nightly: cross-checks a batch of published centers against their official
 * websites, flags field mismatches + suspicious photos for admin review.
 *
 * Admin-trigger: POST /api/agents/data-verifier?center_id=<uuid> while signed
 * in as admin runs it for a single center (force=true, bypasses agent toggle).
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { verifyWebhookSecret } from "@/lib/agents/base";
import { runDataVerifier } from "@/lib/agents/data-verifier";

export const maxDuration = 300;

const CRON_SECRET = process.env.CRON_SECRET;

export async function POST(request: Request) {
  const authHeader = request.headers.get("authorization");
  const isCron = !!CRON_SECRET && authHeader === `Bearer ${CRON_SECRET}`;
  const isWebhook = verifyWebhookSecret(request);

  let isAdminManual = false;
  if (!isCron && !isWebhook) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
    if (profile?.role !== "admin") return NextResponse.json({ error: "Admin only" }, { status: 403 });
    isAdminManual = true;
  }

  try {
    const url = new URL(request.url);
    const centerId = url.searchParams.get("center_id");

    const result = await runDataVerifier({
      centerIds: centerId ? [centerId] : undefined,
      // Admin manual triggers bypass the toggle so we can test without
      // flipping the agent on globally.
      force: isAdminManual,
    });

    return NextResponse.json({
      success: true,
      processed: result.processed,
      flagged: result.flagged,
      enabled: result.enabled,
      // Don't leak the full results array in the response (it can include
      // base64-ish photo URLs and Claude responses). Caller can read
      // agent_log for details.
      summary: result.results.map((r) => ({
        center_id: r.center_id,
        center_name: r.center_name,
        status: r.center_status,
        mismatch_count: r.mismatch_count,
        suspicious_photo_count: r.suspicious_photo_count,
      })),
    });
  } catch (err) {
    console.error("Data Verifier error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function GET(request: Request) {
  return POST(request);
}

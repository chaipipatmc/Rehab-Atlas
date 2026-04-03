/**
 * Content Creator Agent — Cron endpoint
 * Runs daily to generate SEO blog article drafts.
 * Supports "fill" mode to batch-draft articles until pool reaches target.
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { verifyWebhookSecret } from "@/lib/agents/base";
import { createArticleDraft } from "@/lib/agents/content-creator";
import { autoApproveContent } from "@/lib/agents/content-auto-approve";

export const maxDuration = 300;

const CRON_SECRET = process.env.CRON_SECRET;
// Max articles per single serverless invocation (budget ~60s each, 4.5min safety)
const BATCH_SIZE = 4;

export async function POST(request: Request) {
  const authHeader = request.headers.get("authorization");
  const isCron = authHeader === `Bearer ${CRON_SECRET}`;
  const isWebhook = verifyWebhookSecret(request);

  if (!isCron && !isWebhook) {
    // Admin manual trigger
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
    if (profile?.role !== "admin") return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }

  try {
    const startTime = Date.now();
    const SAFE_DURATION_MS = 270000; // 4.5 minutes safety margin
    let totalWritten = 0;
    let poolSize = 0;

    // Loop: draft batches until pool is full or time runs out
    while (Date.now() - startTime < SAFE_DURATION_MS) {
      const result = await createArticleDraft({
        maxArticles: BATCH_SIZE,
        skipWeekendCheck: !isCron, // Allow manual triggers on weekends
      });

      totalWritten += result.written;
      poolSize = result.poolSize;

      // Stop if nothing was written (pool full, no topics, or agent disabled)
      if (result.written === 0) break;

      // Auto-approve after each batch
      await autoApproveContent();

      console.log(`Content Creator: batch done — ${totalWritten} total, pool at ${poolSize}, elapsed ${Math.round((Date.now() - startTime) / 1000)}s`);
    }

    return NextResponse.json({
      success: totalWritten > 0,
      articles_drafted: totalWritten,
      pool_size: poolSize,
    });
  } catch (err) {
    console.error("Content Creator error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function GET(request: Request) {
  return POST(request);
}

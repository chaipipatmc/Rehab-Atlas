/**
 * Daily Brief cron endpoint (08:00 Bangkok = 01:00 UTC, see vercel.json).
 * Pushes one LINE Flex card to the owner summarising yesterday:
 * assessments, leads, partner replies, page views, plus a needs-action footer.
 *
 * GET/POST /api/agents/daily-brief             send the card
 * GET/POST /api/agents/daily-brief?preview=1   return metrics + Flex JSON, no send
 *
 * Auth: Vercel cron (Authorization: Bearer CRON_SECRET) or a logged-in admin.
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { collectBriefMetrics, buildDailyBriefCard, buildDailyBriefAltText } from "@/lib/daily-brief";
import { isLineConfigured, pushFlex } from "@/lib/line";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

async function authorize(request: Request): Promise<NextResponse | null> {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");
  if (cronSecret && authHeader === `Bearer ${cronSecret}`) return null;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") return NextResponse.json({ error: "Admin only" }, { status: 403 });
  return null;
}

async function handle(request: Request) {
  const denied = await authorize(request);
  if (denied) return denied;

  const preview = new URL(request.url).searchParams.get("preview") === "1";

  try {
    const metrics = await collectBriefMetrics();
    const card = buildDailyBriefCard(metrics);
    const altText = buildDailyBriefAltText(metrics);

    if (preview) {
      return NextResponse.json({ configured: isLineConfigured(), metrics, altText, flex: card });
    }

    if (!isLineConfigured()) {
      return NextResponse.json({
        sent: false,
        reason: "LINE_CHANNEL_ACCESS_TOKEN / LINE_OWNER_USER_ID not set",
        metrics,
      });
    }

    const result = await pushFlex(altText, card);
    await createAdminClient().from("agent_log").insert({
      agent_type: "daily_brief",
      action: result.ok ? "sent" : "send_failed",
      details: { date: metrics.ymd, altText, lineStatus: result.status ?? null, lineError: result.error ?? null },
    });
    return NextResponse.json({
      sent: result.ok,
      lineStatus: result.status ?? null,
      lineError: result.error ?? null,
      metrics,
    });
  } catch (err) {
    console.error("Daily brief error:", err);
    return NextResponse.json({ error: "Daily brief failed" }, { status: 500 });
  }
}

export async function GET(request: Request) {
  return handle(request);
}

export async function POST(request: Request) {
  return handle(request);
}

/**
 * Content Planner Agent — Cron endpoint + calendar management
 * Runs monthly (25th) to plan next month's editorial calendar.
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { verifyWebhookSecret } from "@/lib/agents/base";
import { planMonthlyCalendar, approveCalendarMonth } from "@/lib/agents/content-planner";

export const maxDuration = 300;

const CRON_SECRET = process.env.CRON_SECRET;

export async function POST(request: Request) {
  const authHeader = request.headers.get("authorization");
  const isCron = authHeader === `Bearer ${CRON_SECRET}`;
  const isWebhook = verifyWebhookSecret(request);

  if (!isCron && !isWebhook) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
    if (profile?.role !== "admin") return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }

  const url = new URL(request.url);
  const action = url.searchParams.get("action");

  // Approve a month's calendar
  if (action === "approve") {
    const yearMonth = url.searchParams.get("month");
    if (!yearMonth) return NextResponse.json({ error: "month param required (YYYY-MM)" }, { status: 400 });

    const count = await approveCalendarMonth(yearMonth);
    return NextResponse.json({ success: true, approved: count });
  }

  // Plan next month
  try {
    const success = await planMonthlyCalendar();
    return NextResponse.json({ success });
  } catch (err) {
    console.error("Content Planner error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function GET(request: Request) {
  return POST(request);
}

/**
 * Content Creator Agent — Cron endpoint
 * Runs daily to generate one SEO blog article draft.
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { verifyWebhookSecret } from "@/lib/agents/base";
import { createArticleDraft } from "@/lib/agents/content-creator";

export const maxDuration = 300;

const CRON_SECRET = process.env.CRON_SECRET;

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
    const success = await createArticleDraft();
    return NextResponse.json({ success });
  } catch (err) {
    console.error("Content Creator error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function GET(request: Request) {
  return POST(request);
}

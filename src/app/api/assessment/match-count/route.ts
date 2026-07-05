import { NextResponse } from "next/server";
import { createPublicClient } from "@/lib/supabase/server";
import { rankCenters } from "@/lib/matching/scoring";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import { validateOrigin } from "@/lib/csrf";
import type { AssessmentAnswers } from "@/types/assessment";
import type { Center } from "@/types/center";

/**
 * Pre-submit match teaser: returns how many centers the current answers
 * would match, WITHOUT storing anything. Shown on the final assessment step
 * so users see concrete value before the email gate.
 */
export async function POST(request: Request) {
  const csrfError = validateOrigin(request);
  if (csrfError) return csrfError;

  const ip = getClientIp(request);
  const rl = await rateLimit(`match-count:${ip}`, { limit: 30, windowSeconds: 3600 });
  if (!rl.success) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  try {
    const answers = (await request.json()) as Partial<AssessmentAnswers>;

    const supabase = createPublicClient();
    const { data: centers } = await supabase
      .from("centers")
      .select("*")
      .eq("status", "published");

    if (!centers || centers.length === 0) {
      return NextResponse.json({ count: 0 });
    }

    const { primary, alternatives } = rankCenters(
      answers as AssessmentAnswers,
      centers as unknown as Center[]
    );

    return NextResponse.json({ count: primary.length + alternatives.length });
  } catch {
    // Teaser is best-effort — never block the flow on it
    return NextResponse.json({ count: 0 });
  }
}

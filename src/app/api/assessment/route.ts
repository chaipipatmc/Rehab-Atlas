import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";
import { rankCenters } from "@/lib/matching/scoring";
import { generateExplanations } from "@/lib/matching/explain";
import { assessmentSchema } from "@/lib/validators";
import type { Center } from "@/types/center";
import { randomUUID, createHmac } from "crypto";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import { validateOrigin } from "@/lib/csrf";
import { sendAssessmentConfirmation, sendAssessmentAdminNotification } from "@/lib/email/send";

export async function POST(request: Request) {
  // CSRF check
  const csrfError = validateOrigin(request);
  if (csrfError) return csrfError;

  // Rate limit: 5 assessments per hour per IP (calls Claude API = cost)
  const ip = getClientIp(request);
  const rl = rateLimit(`assessment:${ip}`, { limit: 5, windowSeconds: 3600 });
  if (!rl.success) {
    return NextResponse.json(
      { error: "Too many assessment requests. Please try again later." },
      { status: 429 }
    );
  }

  try {
    const body = await request.json();
    const parsed = assessmentSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid assessment data", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const answers = parsed.data;
    const supabase = createAdminClient();

    // Fetch all published centers
    const { data: centers, error: centersError } = await supabase
      .from("centers")
      .select("*")
      .eq("status", "published");

    if (centersError || !centers || centers.length === 0) {
      return NextResponse.json(
        { error: "No centers available for matching" },
        { status: 500 }
      );
    }

    // Map DB rows to Center type — validate essential fields exist
    const typedCenters = (centers as Record<string, unknown>[])
      .filter((c) => c.id && c.name && c.country)
      .map((c) => ({
        ...c,
        treatment_focus: Array.isArray(c.treatment_focus) ? c.treatment_focus : [],
        conditions: Array.isArray(c.conditions) ? c.conditions : [],
        services: Array.isArray(c.services) ? c.services : [],
        treatment_methods: Array.isArray(c.treatment_methods) ? c.treatment_methods : [],
        insurance: Array.isArray(c.insurance) ? c.insurance : [],
        languages: Array.isArray(c.languages) ? c.languages : [],
      })) as Center[];

    // Run scoring
    const { primary, alternatives } = rankCenters(answers, typedCenters);

    if (primary.length === 0) {
      return NextResponse.json(
        { error: "No matching centers found" },
        { status: 404 }
      );
    }

    // Build centers map for explanations
    const centersMap = new Map<string, Center>();
    typedCenters.forEach((c) => centersMap.set(c.id, c));

    // Generate Claude explanations for top 3
    const explanations = await generateExplanations(
      answers,
      primary,
      centersMap
    );

    // Generate signed session ID
    const cookieStore = await cookies();
    const hmacKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!hmacKey) {
      return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
    }
    let sessionId = cookieStore.get("assessment_session")?.value;

    // Verify existing session signature
    if (sessionId) {
      const [id, sig] = sessionId.split(".");
      const expectedSig = createHmac("sha256", hmacKey).update(id).digest("hex").slice(0, 16);
      if (sig !== expectedSig) {
        sessionId = undefined; // Invalid signature, generate new
      } else {
        sessionId = id; // Strip signature for DB storage
      }
    }

    if (!sessionId) {
      sessionId = randomUUID();
    }

    const signedSession = `${sessionId}.${createHmac("sha256", hmacKey).update(sessionId).digest("hex").slice(0, 16)}`;

    // Build match scores
    const matchScores: Record<string, number> = {};
    [...primary, ...alternatives].forEach((m) => {
      matchScores[m.center_id] = m.score;
    });

    // Save to database — store contact fields as dedicated columns
    // (still kept inside answers JSON for full audit trail)
    const { data: assessment, error: insertError } = await supabase
      .from("assessments")
      .insert({
        session_id: sessionId,
        answers,
        matched_center_ids: primary.map((m) => m.center_id),
        match_scores: matchScores,
        explanations,
        urgency_level: answers.urgency,
        contact_email: answers.contact_email.trim().toLowerCase(),
        contact_name: answers.contact_name?.trim() || null,
        contact_phone: answers.contact_phone?.trim() || null,
        completed: true,
      })
      .select("id")
      .single();

    if (insertError) {
      console.error("Failed to save assessment:", insertError);
      return NextResponse.json(
        { error: "Failed to save assessment" },
        { status: 500 }
      );
    }

    // Log traffic attribution for early conversion-by-source visibility.
    // The same data lives in assessments.answers->'_source' for SQL queries.
    if (answers._source) {
      const s = answers._source;
      console.log(
        `[assessment ${assessment.id}] source=${s.channel ?? "unknown"}` +
          (s.utm_source ? ` utm=${s.utm_source}/${s.utm_medium ?? ""}/${s.utm_campaign ?? ""}` : "") +
          (s.referrer ? ` ref=${s.referrer.slice(0, 80)}` : "") +
          (s.landing_path ? ` landed=${s.landing_path.slice(0, 80)}` : ""),
      );
    }

    // Fire-and-forget notifications — do not block response on email delivery
    const topMatch = primary[0];
    const topCenter = topMatch ? centersMap.get(topMatch.center_id) : null;
    const matchesPreview = primary.slice(0, 3).map((m, i) => {
      const center = centersMap.get(m.center_id);
      return {
        name: center?.name || "Match",
        location: [center?.city, center?.country].filter(Boolean).join(", "),
        score: m.score,
        fit_summary: explanations[i]?.fit_summary || "",
      };
    });

    void sendAssessmentConfirmation({
      to: answers.contact_email.trim().toLowerCase(),
      name: answers.contact_name?.trim() || undefined,
      assessmentId: assessment.id,
      matches: matchesPreview,
      urgency: answers.urgency,
    });

    void sendAssessmentAdminNotification({
      assessmentId: assessment.id,
      contactEmail: answers.contact_email.trim().toLowerCase(),
      contactName: answers.contact_name?.trim() || undefined,
      contactPhone: answers.contact_phone?.trim() || undefined,
      urgency: answers.urgency,
      severity: answers.severity,
      whoFor: answers.who_for,
      primaryIssue: answers.primary_issue,
      topMatchName: topCenter?.name,
      topMatchScore: topMatch?.score ?? null,
    });

    // Set session cookie
    const response = NextResponse.json({
      assessment_id: assessment.id,
      primary_matches: primary.map((m, i) => ({
        ...m,
        ...explanations[i],
      })),
      alternatives,
      urgency_level: answers.urgency,
    });

    response.cookies.set("assessment_session", signedSession, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30, // 30 days
    });

    return response;
  } catch (error) {
    console.error("Assessment error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";
import { leadFormSchema } from "@/lib/validators";
import { sendAdminNotification } from "@/lib/email/send";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import { validateOrigin } from "@/lib/csrf";

export async function POST(request: Request) {
  // CSRF check
  const csrfError = validateOrigin(request);
  if (csrfError) return csrfError;

  // Rate limit: 10 submissions per hour per IP
  const ip = getClientIp(request);
  const rl = rateLimit(`leads:${ip}`, { limit: 10, windowSeconds: 3600 });
  if (!rl.success) {
    return NextResponse.json(
      { error: "Too many submissions. Please try again later." },
      { status: 429 }
    );
  }

  try {
    const body = await request.json();
    const parsed = leadFormSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid form data", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const data = parsed.data;
    const supabase = createAdminClient();

    // Check for assessment session
    const cookieStore = await cookies();
    const sessionId = cookieStore.get("assessment_session")?.value;
    let assessmentId: string | null = null;

    if (sessionId) {
      const { data: assessment } = await supabase
        .from("assessments")
        .select("id")
        .eq("session_id", sessionId)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();
      assessmentId = assessment?.id || null;
    }

    // Insert lead using service role (bypasses RLS)
    const { error: insertError } = await supabase.from("leads").insert({
      name: data.name,
      email: data.email,
      phone: data.phone || null,
      country: data.country || null,
      who_for: data.who_for || null,
      age_range: data.age_range || null,
      concern: data.concern,
      urgency: data.urgency || null,
      preferred_center_id: data.preferred_center_id || null,
      budget: data.budget || null,
      message: data.message || null,
      consent: data.consent,
      request_call: data.request_call,
      assessment_id: assessmentId,
      source_page: request.headers.get("referer") || null,
      status: "new",
    });

    if (insertError) {
      console.error("Failed to insert lead:", insertError);
      return NextResponse.json(
        { error: "Failed to submit inquiry" },
        { status: 500 }
      );
    }

    // Send admin notification email (non-blocking)
    sendAdminNotification({
      name: data.name,
      email: data.email,
      urgency: data.urgency || "not_urgent",
      concern: data.concern,
    }).catch((err) => console.error("Failed to send admin notification:", err));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Lead submission error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

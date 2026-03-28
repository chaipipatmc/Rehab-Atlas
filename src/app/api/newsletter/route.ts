import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { validateOrigin } from "@/lib/csrf";
import { rateLimit, getClientIp } from "@/lib/rate-limit";

export async function POST(request: Request) {
  const csrfError = validateOrigin(request);
  if (csrfError) return csrfError;

  // Rate limit: 10 subscriptions per hour per IP
  const ip = getClientIp(request);
  const rl = rateLimit(`newsletter:${ip}`, { limit: 10, windowSeconds: 3600 });
  if (!rl.success) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      { status: 429 }
    );
  }

  try {
    const { email, source } = await request.json();

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "Valid email required" }, { status: 400 });
    }

    const admin = createAdminClient();

    const { error } = await admin.from("newsletter_subscribers").upsert(
      { email: email.toLowerCase().trim(), source: source || "footer", status: "active" },
      { onConflict: "email" }
    );

    if (error) {
      return NextResponse.json({ error: "Failed to subscribe" }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

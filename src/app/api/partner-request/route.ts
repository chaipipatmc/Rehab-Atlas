import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendPartnerRequestNotification } from "@/lib/email/send";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import { validateOrigin } from "@/lib/csrf";

export async function POST(request: Request) {
  // CSRF check
  const csrfError = validateOrigin(request);
  if (csrfError) return csrfError;

  // Rate limit: 3 partner requests per hour per IP
  const ip = getClientIp(request);
  const rl = rateLimit(`partner-req:${ip}`, { limit: 3, windowSeconds: 3600 });
  if (!rl.success) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      { status: 429 }
    );
  }

  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const { email, full_name, center_name, center_website, message } = body;

    if (!email || !center_name) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (typeof email !== "string" || !emailRegex.test(email)) {
      return NextResponse.json({ error: "Invalid email address" }, { status: 400 });
    }

    const admin = createAdminClient();

    await admin.from("profiles").update({ full_name }).eq("id", user.id);

    // Create a lead entry so admin sees it
    await admin.from("leads").insert({
      name: full_name || email,
      email,
      concern: `PARTNER REQUEST: ${center_name}\n\nWebsite: ${center_website || "Not provided"}\n\nMessage: ${message || "No message"}\n\nUser ID: ${user.id}`,
      source_page: "partner_request",
      status: "new",
      consent: true,
    });

    // Send email notification
    await sendPartnerRequestNotification({
      name: full_name || email,
      email,
      centerName: center_name,
      centerWebsite: center_website,
      message,
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

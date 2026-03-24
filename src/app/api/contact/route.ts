import { NextResponse } from "next/server";
import { Resend } from "resend";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import { validateOrigin } from "@/lib/csrf";

function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

const resend = new Resend(process.env.RESEND_API_KEY);
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "chaipipat.mc@gmail.com";
const FROM_EMAIL = "Rehab-Atlas <onboarding@resend.dev>";

const SUBJECT_LABELS: Record<string, string> = {
  general: "General Inquiry",
  treatment: "Treatment Question",
  partnership: "Partnership",
  media: "Media",
};

export async function POST(request: Request) {
  // CSRF check
  const csrfError = validateOrigin(request);
  if (csrfError) return csrfError;

  // Rate limit: 5 contact messages per hour per IP
  const ip = getClientIp(request);
  const rl = rateLimit(`contact:${ip}`, { limit: 5, windowSeconds: 3600 });
  if (!rl.success) {
    return NextResponse.json(
      { error: "Too many messages. Please try again later." },
      { status: 429 }
    );
  }

  try {
    const body = await request.json();
    const { name, email, phone, subject, message } = body;

    if (!name || !email || !message) {
      return NextResponse.json({ error: "Name, email, and message are required." }, { status: 400 });
    }

    const subjectLabel = SUBJECT_LABELS[subject as string] ?? subject ?? "General Inquiry";

    const safeName = escapeHtml(String(name));
    const safeEmail = escapeHtml(String(email));
    const safePhone = phone ? escapeHtml(String(phone)) : undefined;
    const safeSubjectLabel = escapeHtml(String(subjectLabel));
    const safeMessage = escapeHtml(String(message));

    try {
      await resend.emails.send({
        from: FROM_EMAIL,
        to: ADMIN_EMAIL,
        subject: `[Contact] ${safeSubjectLabel} — ${safeName}`,
        html: `
          <div style="font-family: Inter, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #45636b; margin-bottom: 20px;">New Contact Form Submission</h2>
            <table style="width: 100%; border-collapse: collapse;">
              <tr><td style="padding: 8px 0; color: #6b7d82; font-size: 12px; text-transform: uppercase;">Name</td><td style="padding: 8px 0; font-weight: 600;">${safeName}</td></tr>
              <tr><td style="padding: 8px 0; color: #6b7d82; font-size: 12px; text-transform: uppercase;">Email</td><td style="padding: 8px 0;">${safeEmail}</td></tr>
              ${safePhone ? `<tr><td style="padding: 8px 0; color: #6b7d82; font-size: 12px; text-transform: uppercase;">Phone</td><td style="padding: 8px 0;">${safePhone}</td></tr>` : ""}
              <tr><td style="padding: 8px 0; color: #6b7d82; font-size: 12px; text-transform: uppercase;">Subject</td><td style="padding: 8px 0;">${safeSubjectLabel}</td></tr>
            </table>
            <div style="background: #f4f6f7; border-radius: 12px; padding: 16px; margin-top: 16px;">
              <p style="color: #6b7d82; font-size: 12px; text-transform: uppercase; margin: 0 0 8px;">Message</p>
              <p style="margin: 0; color: #2b3437; white-space: pre-wrap;">${safeMessage}</p>
            </div>
            <p style="color: #6b7d82; font-size: 11px; margin-top: 20px;">Rehab-Atlas — A Digital Sanctuary for Recovery</p>
          </div>
        `,
      });
    } catch (emailErr) {
      // Log but don't fail the request — form submission is still recorded
      console.error("Contact email failed:", emailErr);
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}

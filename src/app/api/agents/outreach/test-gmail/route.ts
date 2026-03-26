/**
 * Temporary test endpoint to diagnose Gmail on Vercel.
 * DELETE THIS FILE after fixing the issue.
 */

import { NextResponse } from "next/server";
import { sendEmail } from "@/lib/agents/outreach/gmail";

export const maxDuration = 30;

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Log env var status
  const envStatus = {
    GMAIL_CLIENT_ID: process.env.GMAIL_CLIENT_ID ? `set (${process.env.GMAIL_CLIENT_ID.slice(0, 10)}...)` : "MISSING",
    GMAIL_CLIENT_SECRET: process.env.GMAIL_CLIENT_SECRET ? `set (${process.env.GMAIL_CLIENT_SECRET.slice(0, 8)}...)` : "MISSING",
    GMAIL_REFRESH_TOKEN: process.env.GMAIL_REFRESH_TOKEN ? `set (${process.env.GMAIL_REFRESH_TOKEN.slice(0, 10)}...)` : "MISSING",
    GMAIL_OUTREACH_EMAIL: process.env.GMAIL_OUTREACH_EMAIL || "NOT SET",
  };

  try {
    const result = await sendEmail({
      to: "info@rehab-atlas.com",
      subject: "Gmail test from Vercel - " + new Date().toISOString(),
      bodyText: "This is a test email to verify Gmail API works on Vercel.",
    });

    return NextResponse.json({ success: true, result, envStatus });
  } catch (err) {
    return NextResponse.json({
      success: false,
      error: String(err),
      envStatus,
    });
  }
}

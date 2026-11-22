/**
 * Resend credential emails with correct login URL.
 * Usage: npx tsx scripts/resend-credentials.ts
 */

import { config } from "dotenv";
config({ path: ".env.local" });
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const APP_URL = "https://rehab-atlas.com";
const PERSONA = process.env.OUTREACH_PERSONA_NAME || "Sarah";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const GMAIL_API = "https://www.googleapis.com/gmail/v1/users/me";
const OUTREACH_EMAIL = (process.env.GMAIL_OUTREACH_EMAIL || "info@rehab-atlas.com").trim();

async function getGmailToken(): Promise<string> {
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GMAIL_CLIENT_ID!.trim(),
      client_secret: process.env.GMAIL_CLIENT_SECRET!.trim(),
      refresh_token: process.env.GMAIL_REFRESH_TOKEN!.trim(),
      grant_type: "refresh_token",
    }).toString(),
  });
  const data = await res.json();
  return data.access_token;
}

async function sendGmail(token: string, to: string, subject: string, body: string, threadId?: string) {
  const safeSubject = subject.replace(/[^\x00-\x7F]/g, "");
  const headers = [
    `From: ${OUTREACH_EMAIL}`,
    `To: ${to}`,
    ...(to.toLowerCase() !== OUTREACH_EMAIL.toLowerCase() ? [`Cc: ${OUTREACH_EMAIL}`] : []),
    `Subject: ${safeSubject}`,
    `MIME-Version: 1.0`,
    `Content-Type: text/plain; charset="UTF-8"`,
  ];
  const raw = Buffer.from(`${headers.join("\r\n")}\r\n\r\n${body}`).toString("base64url");

  const res = await fetch(`${GMAIL_API}/messages/send`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ raw, threadId: threadId || undefined }),
  });
  if (!res.ok) throw new Error(`Gmail send failed: ${res.status} ${await res.text()}`);
  const result = await res.json();
  console.log(`  Sent to ${to} (${result.id})`);
}

function generatePassword(centerName: string): string {
  const part = centerName
    .replace(/[^a-zA-Z0-9\s]/g, "")
    .split(/\s+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join("")
    .slice(0, 20);
  return `${part}${new Date().getFullYear()}!`;
}

const partners = [
  { name: "Alvaro", email: "info@tabularasaretreat.com", center: "Tabula Rasa Retreat", centerId: "60105a8f-1f7f-4fc6-ab10-93cee06b4773" },
  { name: "Patricia", email: "connecting@beginning.pt", center: "The Beginning", centerId: "1b8412ea-809a-4ca6-b7ec-920f53decfd1" },
  { name: "Steven", email: "info@innerliferecovery.com", center: "InnerLife Recovery", centerId: "b4bb7eaa-857e-48ef-bf81-0f0909704571" },
  { name: "Chantelle", email: "chantelle.bradshaw@stepstogether.co.uk", center: "Steps Together - Rainford Hall", centerId: "552e1d46-9be2-48e0-b983-34a6cf66127c" },
  { name: "Lucas", email: "lucas@cfhh.ca", center: "Centres for Health and Healing", centerId: "d2aafac3-f5e4-42c6-a2b8-caf8a907ed5e" },
  { name: "Info", email: "info@thenorthernlights.ca", center: "The Northern Lights", centerId: "62b797a4-8e6b-46db-b0dc-a54e72e7af6b" },
  { name: "Leandra", email: "l.bechter@kusnachtpractice.ch", center: "Kusnacht Practice", centerId: "4c204b82-5ac8-4443-8af2-8a47e2317fbf" },
];

async function main() {
  const token = await getGmailToken();
  console.log("Gmail token obtained.\n");

  for (const p of partners) {
    console.log(`--- ${p.center} ---`);
    const password = generatePassword(p.center);

    const body = `Hi ${p.name},

Apologies for the earlier email with an incorrect link - here are your updated login details:

Website: ${APP_URL}/auth/login
Email: ${p.email}
Password: ${password}

Please change your password after your first login. Once you're in, you'll find your Partner Dashboard where you can:

- Set up your center profile (description, photos, services, pricing)
- Start writing and submitting blog articles (each one gets a backlink to your website)
- Share your programs and specialties with people searching for help

Our goal is to get your profile to 100% completeness so people can find everything they need about ${p.center}. Feel free to start building it out whenever you're ready - I'm here to help if you need anything.

If you have any questions, just reply to this email.

Best,
${PERSONA}
Partnerships, Rehab-Atlas
info@rehab-atlas.com
rehab-atlas.com`;

    // Get thread ID
    const { data: pipeline } = await supabase
      .from("outreach_pipeline")
      .select("outreach_thread_id")
      .eq("center_id", p.centerId)
      .maybeSingle();

    await sendGmail(
      token,
      p.email,
      `Updated login details - Rehab-Atlas partner account`,
      body,
      pipeline?.outreach_thread_id || undefined
    );

    await new Promise((r) => setTimeout(r, 500));
  }

  console.log("\nAll resent!");
}

main().catch(console.error);

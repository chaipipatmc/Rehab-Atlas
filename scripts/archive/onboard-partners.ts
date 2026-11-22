/**
 * One-time script: Create partner accounts and send credential emails.
 * Usage: npx tsx scripts/onboard-partners.ts
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

// Gmail OAuth
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
  console.log(`  ✓ Email sent to ${to} (${result.id})`);
  return result;
}

interface Partner {
  contactName: string;
  contactEmail: string;
  centerId: string;
  centerName: string;
  threadId?: string | null;
  isResend?: boolean;
}

const partners: Partner[] = [
  {
    contactName: "Alvaro",
    contactEmail: "info@tabularasaretreat.com",
    centerId: "60105a8f-1f7f-4fc6-ab10-93cee06b4773",
    centerName: "Tabula Rasa Retreat",
  },
  {
    contactName: "Patricia Carvalho",
    contactEmail: "connecting@beginning.pt",
    centerId: "1b8412ea-809a-4ca6-b7ec-920f53decfd1",
    centerName: "The Beginning",
  },
  {
    contactName: "Steven James",
    contactEmail: "info@innerliferecovery.com",
    centerId: "b4bb7eaa-857e-48ef-bf81-0f0909704571",
    centerName: "InnerLife Recovery",
  },
  {
    contactName: "Chantelle Bradshaw",
    contactEmail: "chantelle.bradshaw@stepstogether.co.uk",
    centerId: "552e1d46-9be2-48e0-b983-34a6cf66127c",
    centerName: "Steps Together - Rainford Hall",
  },
  {
    contactName: "Lucas Wade",
    contactEmail: "lucas@cfhh.ca",
    centerId: "d2aafac3-f5e4-42c6-a2b8-caf8a907ed5e",
    centerName: "Centres for Health and Healing",
    isResend: true, // account already existed before this script
  },
  {
    contactName: "Info",
    contactEmail: "info@thenorthernlights.ca",
    centerId: "62b797a4-8e6b-46db-b0dc-a54e72e7af6b",
    centerName: "The Northern Lights",
  },
  {
    contactName: "Leandra Bechter",
    contactEmail: "l.bechter@kusnachtpractice.ch",
    centerId: "4c204b82-5ac8-4443-8af2-8a47e2317fbf",
    centerName: "Kusnacht Practice",
  },
];

function generatePassword(centerName: string): string {
  const part = centerName
    .replace(/[^a-zA-Z0-9\s]/g, "")
    .split(/\s+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join("")
    .slice(0, 20);
  return `${part}${new Date().getFullYear()}!`;
}

async function main() {
  const token = await getGmailToken();
  console.log("Gmail token obtained.\n");

  for (const p of partners) {
    console.log(`\n--- ${p.centerName} (${p.contactEmail}) ---`);

    let tempPassword: string;

    if (p.isResend) {
      // Just resend credentials — account already exists
      tempPassword = generatePassword(p.centerName);
      // Reset their password to the new temp
      const { data: existingUsers } = await supabase.auth.admin.listUsers();
      const existing = existingUsers?.users?.find((u) => u.email === p.contactEmail);
      if (existing) {
        await supabase.auth.admin.updateUserById(existing.id, { password: tempPassword });
        console.log(`  Password reset for existing user ${existing.id}`);
      } else {
        console.log(`  WARNING: No existing user found for ${p.contactEmail}, creating new`);
        p.isResend = false;
      }
    }

    if (!p.isResend) {
      tempPassword = generatePassword(p.centerName);

      // Check if user exists
      const { data: existingUsers } = await supabase.auth.admin.listUsers();
      const existing = existingUsers?.users?.find((u) => u.email === p.contactEmail);

      let userId: string;
      if (existing) {
        userId = existing.id;
        await supabase.auth.admin.updateUserById(userId, { password: tempPassword });
        console.log(`  Existing user ${userId}, password reset`);
      } else {
        const { data: newUser, error } = await supabase.auth.admin.createUser({
          email: p.contactEmail,
          password: tempPassword,
          email_confirm: true,
        });
        if (error || !newUser.user) {
          console.error(`  FAILED to create user: ${error?.message}`);
          continue;
        }
        userId = newUser.user.id;
        console.log(`  Created user ${userId}`);
      }

      // Create/update profile
      await supabase.from("profiles").upsert({
        id: userId,
        role: "partner",
        center_id: p.centerId,
        full_name: p.contactName,
      });
      console.log(`  Profile linked to center ${p.centerId}`);

      // Update pipeline to active
      await supabase
        .from("outreach_pipeline")
        .update({ stage: "active" })
        .eq("center_id", p.centerId);
    } else {
      tempPassword = generatePassword(p.centerName);
    }

    // Send credentials email
    const firstName = p.contactName.split(" ")[0];
    const emailBody = `Hi ${firstName},

Thank you for your interest in joining Rehab-Atlas!

I've set up your partner account. Here are your login details:

Website: ${APP_URL}/auth/login
Email: ${p.contactEmail}
Password: ${tempPassword}

Please change your password after your first login. Once you're in, you'll find your Partner Dashboard where you can:

- Set up your center profile (description, photos, services, pricing)
- Start writing and submitting blog articles (each one gets a backlink to your website)
- Share your programs and specialties with people searching for help

Our goal is to get your profile to 100% completeness so people can find everything they need about ${p.centerName}. Feel free to start building it out whenever you're ready - I'm here to help if you need anything.

If you have any questions, just reply to this email.

Best,
${PERSONA}
Partnerships, Rehab-Atlas
info@rehab-atlas.com
rehab-atlas.com`;

    // Get thread ID from pipeline if available
    const { data: pipeline } = await supabase
      .from("outreach_pipeline")
      .select("outreach_thread_id")
      .eq("center_id", p.centerId)
      .single();

    await sendGmail(
      token,
      p.contactEmail,
      `Welcome to Rehab-Atlas - your partner account is ready`,
      emailBody,
      pipeline?.outreach_thread_id || undefined
    );

    // Log email
    await supabase.from("outreach_emails").insert({
      pipeline_id: null,
      center_id: p.centerId,
      direction: "outbound",
      gmail_thread_id: pipeline?.outreach_thread_id,
      from_email: OUTREACH_EMAIL,
      to_email: p.contactEmail,
      subject: "Welcome to Rehab-Atlas - your partner account is ready",
      body_text: emailBody,
      email_type: "negotiation",
    });

    console.log(`  ✓ Done!`);

    // Small delay between sends
    await new Promise((r) => setTimeout(r, 1000));
  }

  console.log("\n=== All done! ===");
}

main().catch(console.error);

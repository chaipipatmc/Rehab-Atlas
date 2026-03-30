import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function getAccessToken() {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GMAIL_CLIENT_ID?.trim(),
      client_secret: process.env.GMAIL_CLIENT_SECRET?.trim(),
      refresh_token: process.env.GMAIL_REFRESH_TOKEN?.trim(),
      grant_type: "refresh_token",
    }),
  });
  return (await res.json()).access_token;
}

async function sendGmail(to, subject, body, threadId) {
  const token = await getAccessToken();
  const from = process.env.GMAIL_OUTREACH_EMAIL?.trim() || "info@rehab-atlas.com";
  const raw = [
    `From: Sarah from Rehab-Atlas <${from}>`,
    `To: ${to}`,
    `Cc: info@rehab-atlas.com`,
    `Subject: =?UTF-8?B?${Buffer.from(subject).toString("base64")}?=`,
    threadId ? `In-Reply-To: <${threadId}>` : "",
    threadId ? `References: <${threadId}>` : "",
    "Content-Type: text/plain; charset=utf-8",
    "",
    body,
  ].filter(Boolean).join("\r\n");
  const res = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ raw: Buffer.from(raw).toString("base64url"), threadId: threadId || undefined }),
  });
  return await res.json();
}

async function createOrResetUser(email, password, fullName) {
  const { data: { users } } = await s.auth.admin.listUsers();
  let user = users?.find((u) => u.email === email);
  if (!user) {
    const { data, error } = await s.auth.admin.createUser({
      email, password, email_confirm: true, user_metadata: { full_name: fullName },
    });
    if (error) { console.log("  Create error:", error.message); return null; }
    user = data.user;
    console.log("  Account created:", user.id);
  } else {
    await s.auth.admin.updateUserById(user.id, { password });
    console.log("  Password reset for:", user.id);
  }
  return user;
}

(async () => {
  // ═══ 1. GREEN WINGS ═══
  console.log("=== 1. Green Wings Recovery Centre ===");
  const gwPw = "GreenWings2026!";
  const gwUser = await createOrResetUser("enquiry@greenwings-psy.com", gwPw, "Green Wings Team");
  if (gwUser) {
    await s.from("profiles").upsert({ id: gwUser.id, email: "enquiry@greenwings-psy.com", full_name: "Green Wings Team", role: "partner", center_id: "5ca0a63e-73f2-497f-b27d-6ee18a214d3d" });
    await s.from("outreach_pipeline").update({ stage: "active", response_sentiment: "positive" }).eq("center_id", "5ca0a63e-73f2-497f-b27d-6ee18a214d3d");
    console.log("  Linked to Green Wings, pipeline active");

    const r = await sendGmail("enquiry@greenwings-psy.com", "Re: Your Rehab-Atlas partner account is ready",
`Hi there,

Thank you for getting back to us - we're glad you're interested in joining Rehab-Atlas.

We've set up your partner account so you can get started right away. The onboarding process is very simple and you can do it entirely at your own pace:

Email: enquiry@greenwings-psy.com
Password: ${gwPw}

Log in at: https://rehab-atlas.com/auth/login

Once logged in, you'll see your Partner Dashboard where you can:
- Complete your center profile (programs, photos, team, specialties)
- Publish educational articles with backlinks to your website
- Track inquiries from people searching for treatment

Please change your password after your first login.

Everything can be managed through the platform - no calls or meetings needed. If you have any questions at all, just reply to this email and I'll help you out.

Best,
Sarah
Partnerships, Rehab-Atlas
info@rehab-atlas.com`, "19d324ba88786087");
    console.log("  Email:", r.id ? "SENT" : JSON.stringify(r));
  }

  // ═══ 2. AIDAN — already has account, just link ═══
  console.log("\n=== 2. Aidan Toal - The Healing Institute ===");
  await s.from("profiles").update({ role: "partner", center_id: "42d10e59-8fb3-4c4e-8429-8695a9db3b35", full_name: "Aidan Toal" }).eq("id", "9a15a0c4-1976-40eb-9fa3-ca26193922d4");
  await s.from("outreach_pipeline").update({ stage: "active", response_sentiment: "positive" }).eq("center_id", "42d10e59-8fb3-4c4e-8429-8695a9db3b35");
  console.log("  Linked to The Healing Institute, pipeline active");

  const aidanR = await sendGmail("Aidan Toal <aidan@thehealinginstitute.ca>", "Welcome to Rehab-Atlas - your partner account is ready",
`Hi Aidan,

Welcome to Rehab-Atlas! I've upgraded your account to a partner account and linked it to The Healing Institute's profile.

You can now log in at https://rehab-atlas.com/auth/login with your existing credentials and you'll see your Partner Dashboard where you can:
- Complete and customize The Healing Institute's profile
- Add photos, team members, and treatment details
- Publish blog articles with backlinks to your website
- Track inquiries from people searching for treatment

The setup process is straightforward - everything is managed through the platform, no calls needed. If you have any questions, just reply to this email.

Best,
Sarah
Partnerships, Rehab-Atlas
info@rehab-atlas.com`, null);
  console.log("  Email:", aidanR.id ? "SENT" : JSON.stringify(aidanR));

  // ═══ 3. SAMSON — Beekeeper House ═══
  console.log("\n=== 3. Samson Ross - The Beekeeper House ===");
  const bkPw = "BeekeeperHouse2026!";
  const samsonUser = await createOrResetUser("samson@mybeekeeper.org", bkPw, "Samson Ross");
  if (samsonUser) {
    await s.from("profiles").upsert({ id: samsonUser.id, email: "samson@mybeekeeper.org", full_name: "Samson Ross", role: "partner", center_id: "67d22a7d-667c-4691-b0c2-0cf5bbf03906" });
    await s.from("outreach_pipeline").update({ stage: "active", response_sentiment: "positive" }).eq("center_id", "67d22a7d-667c-4691-b0c2-0cf5bbf03906");
    console.log("  Linked to Beekeeper House, pipeline active");

    const r = await sendGmail("Samson Ross <samson@mybeekeeper.org>", "Re: Your Rehab-Atlas partner account is ready",
`Hi Samson,

Great to hear you're interested in joining Rehab-Atlas! I've set up your partner account so you can get started right away.

Email: samson@mybeekeeper.org
Password: ${bkPw}

Log in at: https://rehab-atlas.com/auth/login

Once logged in, you'll see your Partner Dashboard where you can:
- Complete The Beekeeper House's profile (programs, photos, team, specialties)
- Publish educational articles with backlinks to your website
- Track inquiries from people looking for treatment

Please change your password after your first login. The onboarding process is very simple and self-guided - no calls needed, everything is done through the platform.

If you have any questions, just reply to this email and I'll walk you through it.

Best,
Sarah
Partnerships, Rehab-Atlas
info@rehab-atlas.com`, "19d3252f5820308f");
    console.log("  Email:", r.id ? "SENT" : JSON.stringify(r));
  }

  console.log("\n=== All 3 done! ===");
})();

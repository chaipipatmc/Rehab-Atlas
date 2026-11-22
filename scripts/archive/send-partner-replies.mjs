// Sends 12 approved partner replies as threaded replies via Gmail API.
// Writes a send-receipts.json file on success so DB inserts can reference message IDs.
import { readFileSync, writeFileSync } from "fs";
import { resolve } from "path";

const env = readFileSync(resolve(".env.local"), "utf-8");
const getVar = (k) => {
  const m = env.match(new RegExp(`^${k}=(.*)$`, "m"));
  return m ? m[1].trim() : "";
};

const clientId = getVar("GMAIL_CLIENT_ID");
const clientSecret = getVar("GMAIL_CLIENT_SECRET");
const refreshToken = getVar("GMAIL_REFRESH_TOKEN");
const FROM = "Sarah <info@rehab-atlas.com>";
const CC = "info@rehab-atlas.com";

const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
  method: "POST",
  headers: { "Content-Type": "application/x-www-form-urlencoded" },
  body: new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: refreshToken,
    grant_type: "refresh_token",
  }).toString(),
});
const { access_token } = await tokenRes.json();
if (!access_token) {
  console.error("Token refresh failed");
  process.exit(1);
}

// Fetch a thread's last message headers so we can set In-Reply-To / References correctly
async function getReplyHeaders(threadId) {
  const r = await fetch(
    `https://www.googleapis.com/gmail/v1/users/me/threads/${threadId}?format=metadata&metadataHeaders=Message-ID&metadataHeaders=References&metadataHeaders=Subject`,
    { headers: { Authorization: `Bearer ${access_token}` } }
  );
  const t = await r.json();
  const msgs = t.messages || [];
  if (msgs.length === 0) return { messageId: "", references: "", subject: "" };
  // Use the most recent inbound message (not from info@rehab-atlas.com) for In-Reply-To
  const getHeader = (m, name) =>
    (m.payload?.headers || []).find((h) => h.name.toLowerCase() === name.toLowerCase())?.value || "";
  const last = msgs[msgs.length - 1];
  const messageId = getHeader(last, "Message-ID");
  const prevRefs = getHeader(last, "References");
  const subject = getHeader(last, "Subject");
  const references = (prevRefs ? prevRefs + " " : "") + messageId;
  return { messageId, references, subject };
}

function sanitizeSubject(s) {
  return s
    .replace(/[\u2014\u2013]/g, "-")
    .replace(/[\u00D7\u2715\u2716]/g, "x")
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2026]/g, "...")
    .replace(/[^\x00-\x7F]/g, "");
}

function buildRaw({ to, subject, bodyText, inReplyTo, references }) {
  const safeSubject = sanitizeSubject(subject);
  const headers = [
    `From: ${FROM}`,
    `To: ${to}`,
    `Cc: ${CC}`,
    `Subject: ${safeSubject}`,
    `MIME-Version: 1.0`,
    `Content-Type: text/plain; charset="UTF-8"`,
  ];
  if (inReplyTo) headers.push(`In-Reply-To: ${inReplyTo}`);
  if (references) headers.push(`References: ${references}`);
  return Buffer.from(`${headers.join("\r\n")}\r\n\r\n${bodyText}`).toString("base64url");
}

async function sendReply({ to, threadId, subject, bodyText }) {
  const { messageId, references } = await getReplyHeaders(threadId);
  const raw = buildRaw({ to, subject, bodyText, inReplyTo: messageId, references });
  const res = await fetch("https://www.googleapis.com/gmail/v1/users/me/messages/send", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${access_token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ raw, threadId }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Send failed (${res.status}): ${err}`);
  }
  const data = await res.json();
  return { gmail_message_id: data.id, gmail_thread_id: data.threadId };
}

const DRAFTS = JSON.parse(readFileSync(resolve("scripts/_drafts.json"), "utf-8"));

const receipts = [];
for (const d of DRAFTS) {
  try {
    console.log(`Sending → ${d.label} (${d.to})...`);
    const r = await sendReply({
      to: d.to,
      threadId: d.threadId,
      subject: d.subject,
      bodyText: d.body,
    });
    console.log(`  ✓ msg=${r.gmail_message_id} thread=${r.gmail_thread_id}`);
    receipts.push({ ...d, ...r, status: "sent" });
  } catch (e) {
    console.error(`  ✗ ${d.label} FAILED: ${e.message}`);
    receipts.push({ ...d, status: "failed", error: e.message });
  }
}

writeFileSync(resolve("scripts/_send-receipts.json"), JSON.stringify(receipts, null, 2));
console.log(`\nDone. Wrote ${receipts.length} receipts to scripts/_send-receipts.json`);

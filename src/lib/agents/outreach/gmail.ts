/**
 * Gmail API Client for Outreach Pipeline
 * Handles sending/receiving emails via info@rehab-atlas.com
 *
 * Setup required:
 * 1. Google Cloud project with Gmail API enabled
 * 2. OAuth2 credentials (client ID, secret, refresh token)
 * 3. Run scripts/gmail-auth.ts to obtain refresh token
 */

import { google, gmail_v1 } from "googleapis";

const OUTREACH_EMAIL = process.env.GMAIL_OUTREACH_EMAIL || "info@rehab-atlas.com";

let gmailClientCache: gmail_v1.Gmail | null | undefined = undefined;

function getGmailClient(): gmail_v1.Gmail | null {
  if (gmailClientCache !== undefined) return gmailClientCache;

  const clientId = process.env.GMAIL_CLIENT_ID;
  const clientSecret = process.env.GMAIL_CLIENT_SECRET;
  const refreshToken = process.env.GMAIL_REFRESH_TOKEN;

  if (!clientId || !clientSecret || !refreshToken) {
    console.warn("Gmail API credentials not configured. Outreach emails will be drafted only.");
    gmailClientCache = null;
    return null;
  }

  const oauth2 = new google.auth.OAuth2(clientId, clientSecret);
  oauth2.setCredentials({ refresh_token: refreshToken });

  gmailClientCache = google.gmail({ version: "v1", auth: oauth2 });
  return gmailClientCache;
}

/**
 * Build a raw RFC 2822 email message for Gmail API
 */
function buildRawEmail(params: {
  to: string;
  from: string;
  subject: string;
  bodyText: string;
  bodyHtml?: string;
  threadId?: string;
  inReplyTo?: string;
  references?: string;
}): string {
  const boundary = `boundary_${Date.now()}`;
  const ccEmail = process.env.GMAIL_OUTREACH_EMAIL || "info@rehab-atlas.com";
  const headers = [
    `From: ${params.from}`,
    `To: ${params.to}`,
    // Always CC info@rehab-atlas.com so admin can track all outreach
    ...(params.to.toLowerCase() !== ccEmail.toLowerCase() ? [`Cc: ${ccEmail}`] : []),
    `Subject: ${params.subject}`,
    `MIME-Version: 1.0`,
  ];

  // Threading headers for replies
  if (params.inReplyTo) {
    headers.push(`In-Reply-To: ${params.inReplyTo}`);
  }
  if (params.references) {
    headers.push(`References: ${params.references}`);
  }

  if (params.bodyHtml) {
    headers.push(`Content-Type: multipart/alternative; boundary="${boundary}"`);
    const body = [
      `--${boundary}`,
      `Content-Type: text/plain; charset="UTF-8"`,
      ``,
      params.bodyText,
      `--${boundary}`,
      `Content-Type: text/html; charset="UTF-8"`,
      ``,
      params.bodyHtml,
      `--${boundary}--`,
    ].join("\r\n");

    return Buffer.from(`${headers.join("\r\n")}\r\n\r\n${body}`).toString("base64url");
  }

  headers.push(`Content-Type: text/plain; charset="UTF-8"`);
  return Buffer.from(`${headers.join("\r\n")}\r\n\r\n${params.bodyText}`).toString("base64url");
}

export interface SendEmailResult {
  messageId: string;
  threadId: string;
}

/**
 * Send an email via Gmail API.
 * Throws if Gmail is configured but sending fails.
 * Returns null only if Gmail credentials are not set.
 */
export async function sendEmail(params: {
  to: string;
  subject: string;
  bodyText: string;
  bodyHtml?: string;
  threadId?: string;
  inReplyTo?: string;
}): Promise<SendEmailResult | null> {
  const gmail = getGmailClient();
  if (!gmail) {
    console.error("Gmail client not available. GMAIL_CLIENT_ID set:", !!process.env.GMAIL_CLIENT_ID, "GMAIL_CLIENT_SECRET set:", !!process.env.GMAIL_CLIENT_SECRET, "GMAIL_REFRESH_TOKEN set:", !!process.env.GMAIL_REFRESH_TOKEN);
    return null;
  }

  const raw = buildRawEmail({
    to: params.to,
    from: OUTREACH_EMAIL,
    subject: params.subject,
    bodyText: params.bodyText,
    bodyHtml: params.bodyHtml,
    inReplyTo: params.inReplyTo,
  });

  try {
    const response = await gmail.users.messages.send({
      userId: "me",
      requestBody: {
        raw,
        threadId: params.threadId || undefined,
      },
    });

    console.log("Gmail sent successfully to:", params.to, "id:", response.data.id);
    return {
      messageId: response.data.id || "",
      threadId: response.data.threadId || "",
    };
  } catch (err) {
    console.error("Gmail API send failed to:", params.to, "error:", err);
    throw err; // Re-throw so callers know it failed
  }
}

/**
 * Get all replies in a Gmail thread.
 * Used to detect inbound responses from centers.
 */
export async function getThreadMessages(threadId: string): Promise<Array<{
  id: string;
  from: string;
  to: string;
  subject: string;
  snippet: string;
  body: string;
  date: string;
  isInbound: boolean;
}>> {
  const gmail = getGmailClient();
  if (!gmail) return [];

  const thread = await gmail.users.threads.get({
    userId: "me",
    id: threadId,
    format: "full",
  });

  const messages = thread.data.messages || [];
  return messages.map((msg) => {
    const headers = msg.payload?.headers || [];
    const getHeader = (name: string) => headers.find((h) => h.name?.toLowerCase() === name.toLowerCase())?.value || "";

    const from = getHeader("From");
    const to = getHeader("To");
    const subject = getHeader("Subject");
    const date = getHeader("Date");

    // Decode body
    let body = "";
    if (msg.payload?.body?.data) {
      body = Buffer.from(msg.payload.body.data, "base64url").toString("utf-8");
    } else if (msg.payload?.parts) {
      const textPart = msg.payload.parts.find((p) => p.mimeType === "text/plain");
      if (textPart?.body?.data) {
        body = Buffer.from(textPart.body.data, "base64url").toString("utf-8");
      }
    }

    // Inbound = not from our outreach email
    const isInbound = !from.toLowerCase().includes(OUTREACH_EMAIL.toLowerCase());

    return {
      id: msg.id || "",
      from,
      to,
      subject,
      snippet: msg.snippet || "",
      body,
      date,
      isInbound,
    };
  });
}

/**
 * Check if a thread has new inbound replies since a given date.
 */
export async function hasNewReplies(threadId: string, sinceDate: Date): Promise<boolean> {
  const messages = await getThreadMessages(threadId);
  return messages.some(
    (msg) => msg.isInbound && new Date(msg.date) > sinceDate
  );
}

/**
 * Get the latest inbound message from a thread.
 */
export async function getLatestInboundReply(threadId: string): Promise<{
  id: string;
  from: string;
  subject: string;
  body: string;
  date: string;
} | null> {
  const messages = await getThreadMessages(threadId);
  const inbound = messages.filter((m) => m.isInbound);
  return inbound.length > 0 ? inbound[inbound.length - 1] : null;
}

/**
 * Check daily send count against limit.
 */
export async function getDailySendCount(): Promise<number> {
  const gmail = getGmailClient();
  if (!gmail) return 0;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const afterEpoch = Math.floor(today.getTime() / 1000);

  const response = await gmail.users.messages.list({
    userId: "me",
    q: `from:${OUTREACH_EMAIL} after:${afterEpoch}`,
    maxResults: 100,
  });

  return response.data.resultSizeEstimate || 0;
}

/**
 * Check if we can still send emails today (respects daily limit).
 */
export async function canSendToday(dailyLimit: number): Promise<boolean> {
  const sent = await getDailySendCount();
  return sent < dailyLimit;
}

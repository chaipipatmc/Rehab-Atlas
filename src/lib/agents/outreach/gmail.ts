/**
 * Gmail API Client for Outreach Pipeline
 * Uses direct fetch calls (no googleapis dependency) for reliable serverless operation.
 *
 * Setup required:
 * 1. Google Cloud project with Gmail API enabled
 * 2. OAuth2 credentials (client ID, secret, refresh token)
 * 3. Run scripts/gmail-auth.ts to obtain refresh token
 */

const GMAIL_API = "https://www.googleapis.com/gmail/v1/users/me";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const OUTREACH_EMAIL = (process.env.GMAIL_OUTREACH_EMAIL || "info@rehab-atlas.com").trim();

// Cache access token in memory (valid ~1 hour)
let accessTokenCache: { token: string; expiresAt: number } | null = null;

/**
 * Get a fresh access token using the refresh token.
 */
async function getAccessToken(): Promise<string | null> {
  // Return cached token if still valid (with 5 min buffer)
  if (accessTokenCache && accessTokenCache.expiresAt > Date.now() + 300000) {
    return accessTokenCache.token;
  }

  const clientId = process.env.GMAIL_CLIENT_ID?.trim();
  const clientSecret = process.env.GMAIL_CLIENT_SECRET?.trim();
  const refreshToken = process.env.GMAIL_REFRESH_TOKEN?.trim();

  if (!clientId || !clientSecret || !refreshToken) {
    console.error("Gmail credentials missing:", {
      clientId: !!clientId,
      clientSecret: !!clientSecret,
      refreshToken: !!refreshToken,
    });
    return null;
  }

  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }).toString(),
  });

  if (!response.ok) {
    const err = await response.text();
    console.error("Gmail token refresh failed:", response.status, err);
    return null;
  }

  const data = await response.json();
  accessTokenCache = {
    token: data.access_token,
    expiresAt: Date.now() + (data.expires_in || 3600) * 1000,
  };

  return data.access_token;
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
  inReplyTo?: string;
  references?: string;
}): string {
  const boundary = `boundary_${Date.now()}`;
  const ccEmail = OUTREACH_EMAIL;
  const headers = [
    `From: ${params.from}`,
    `To: ${params.to}`,
    // Always CC info@rehab-atlas.com so admin can track all outreach
    ...(params.to.toLowerCase() !== ccEmail.toLowerCase() ? [`Cc: ${ccEmail}`] : []),
    `Subject: =?UTF-8?B?${Buffer.from(params.subject, "utf-8").toString("base64")}?=`,
    `MIME-Version: 1.0`,
  ];

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
 * Throws if sending fails. Returns null only if credentials are not set.
 */
export async function sendEmail(params: {
  to: string;
  subject: string;
  bodyText: string;
  bodyHtml?: string;
  threadId?: string;
  inReplyTo?: string;
}): Promise<SendEmailResult | null> {
  const token = await getAccessToken();
  if (!token) return null;

  const raw = buildRawEmail({
    to: params.to,
    from: OUTREACH_EMAIL,
    subject: params.subject,
    bodyText: params.bodyText,
    bodyHtml: params.bodyHtml,
    inReplyTo: params.inReplyTo,
  });

  const response = await fetch(`${GMAIL_API}/messages/send`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      raw,
      threadId: params.threadId || undefined,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    console.error("Gmail send failed:", response.status, err);
    throw new Error(`Gmail send failed: ${response.status} ${err}`);
  }

  const data = await response.json();
  console.log("Gmail sent successfully to:", params.to, "id:", data.id);
  return {
    messageId: data.id || "",
    threadId: data.threadId || "",
  };
}

/**
 * Get all replies in a Gmail thread.
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
  const token = await getAccessToken();
  if (!token) return [];

  const response = await fetch(`${GMAIL_API}/threads/${threadId}?format=full`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) return [];

  const thread = await response.json();
  const messages = thread.messages || [];

  return messages.map((msg: Record<string, unknown>) => {
    const payload = msg.payload as Record<string, unknown> | undefined;
    const headers = (payload?.headers || []) as Array<{ name: string; value: string }>;
    const getHeader = (name: string) => headers.find((h) => h.name?.toLowerCase() === name.toLowerCase())?.value || "";

    const from = getHeader("From");
    const to = getHeader("To");
    const subject = getHeader("Subject");
    const date = getHeader("Date");

    // Decode body
    let body = "";
    const payloadBody = payload?.body as Record<string, unknown> | undefined;
    if (payloadBody?.data) {
      body = Buffer.from(payloadBody.data as string, "base64url").toString("utf-8");
    } else if (payload?.parts) {
      const parts = payload.parts as Array<Record<string, unknown>>;
      const textPart = parts.find((p) => p.mimeType === "text/plain");
      const textBody = textPart?.body as Record<string, unknown> | undefined;
      if (textBody?.data) {
        body = Buffer.from(textBody.data as string, "base64url").toString("utf-8");
      }
    }

    const isInbound = !from.toLowerCase().includes(OUTREACH_EMAIL.toLowerCase());

    return {
      id: (msg.id as string) || "",
      from,
      to,
      subject,
      snippet: (msg.snippet as string) || "",
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
  const token = await getAccessToken();
  if (!token) return 0;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const afterEpoch = Math.floor(today.getTime() / 1000);

  const response = await fetch(
    `${GMAIL_API}/messages?q=${encodeURIComponent(`from:${OUTREACH_EMAIL} after:${afterEpoch}`)}&maxResults=100`,
    { headers: { Authorization: `Bearer ${token}` } }
  );

  if (!response.ok) return 0;
  const data = await response.json();
  return data.resultSizeEstimate || 0;
}

/**
 * Check if we can still send emails today (respects daily limit).
 */
export async function canSendToday(dailyLimit: number): Promise<boolean> {
  const sent = await getDailySendCount();
  return sent < dailyLimit;
}

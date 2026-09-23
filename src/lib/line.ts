/**
 * LINE Messaging API client (push to the owner).
 *
 * Replaces the dead LINE Notify integration (service shut down March 2025).
 * Same pattern as lisa/src/lib/line.ts: direct REST calls, no SDK.
 *
 * Env:
 *   LINE_CHANNEL_ACCESS_TOKEN  long-lived token of the LINE OA (Messaging API)
 *   LINE_OWNER_USER_ID         the owner's LINE user ID (recipient)
 */

const LINE_API = "https://api.line.me/v2/bot";

type LineMessage = Record<string, unknown>;

export function isLineConfigured(): boolean {
  return Boolean(process.env.LINE_CHANNEL_ACCESS_TOKEN && process.env.LINE_OWNER_USER_ID);
}

async function lineFetch(path: string, body: unknown): Promise<boolean> {
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  if (!token) return false;
  const res = await fetch(`${LINE_API}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    console.error(`LINE API ${path} failed (${res.status}): ${text}`);
    return false;
  }
  return true;
}

/** Push up to 5 messages to the owner. Returns false (no-op) when not configured. */
export async function pushToOwner(messages: LineMessage[]): Promise<boolean> {
  const to = process.env.LINE_OWNER_USER_ID;
  if (!to || !isLineConfigured()) return false;
  return lineFetch("/message/push", { to, messages: messages.slice(0, 5) });
}

export async function pushText(text: string): Promise<boolean> {
  return pushToOwner([{ type: "text", text: text.slice(0, 4900) }]);
}

export async function pushFlex(altText: string, contents: Record<string, unknown>): Promise<boolean> {
  return pushToOwner([{ type: "flex", altText: altText.slice(0, 400), contents }]);
}

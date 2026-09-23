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

export type LineResult = { ok: boolean; status?: number; error?: string };

function env(name: string): string | undefined {
  const v = process.env[name];
  return v ? v.trim() : undefined;
}

export function isLineConfigured(): boolean {
  return Boolean(env("LINE_CHANNEL_ACCESS_TOKEN") && env("LINE_OWNER_USER_ID"));
}

async function lineFetch(path: string, body: unknown): Promise<LineResult> {
  const token = env("LINE_CHANNEL_ACCESS_TOKEN");
  if (!token) return { ok: false, error: "LINE_CHANNEL_ACCESS_TOKEN not set" };
  try {
    const res = await fetch(`${LINE_API}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const text = (await res.text().catch(() => "")).slice(0, 500);
      console.error(`LINE API ${path} failed (${res.status}): ${text}`);
      return { ok: false, status: res.status, error: text || res.statusText };
    }
    return { ok: true, status: res.status };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`LINE API ${path} threw:`, msg);
    return { ok: false, error: msg };
  }
}

/** Push up to 5 messages to the owner. Returns ok=false (no-op) when not configured. */
export async function pushToOwner(messages: LineMessage[]): Promise<LineResult> {
  const to = env("LINE_OWNER_USER_ID");
  if (!to || !isLineConfigured()) return { ok: false, error: "LINE env not configured" };
  return lineFetch("/message/push", { to, messages: messages.slice(0, 5) });
}

export async function pushText(text: string): Promise<LineResult> {
  return pushToOwner([{ type: "text", text: text.slice(0, 4900) }]);
}

export async function pushFlex(altText: string, contents: Record<string, unknown>): Promise<LineResult> {
  return pushToOwner([{ type: "flex", altText: altText.slice(0, 400), contents }]);
}

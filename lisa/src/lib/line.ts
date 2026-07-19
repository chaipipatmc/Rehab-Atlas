import crypto from "crypto";
import { requireEnv } from "./env";

const LINE_API = "https://api.line.me/v2/bot";

/** Verify x-line-signature header against the raw request body. */
export function verifyLineSignature(rawBody: string, signature: string | null): boolean {
  if (!signature) return false;
  const expected = crypto
    .createHmac("sha256", requireEnv("LINE_CHANNEL_SECRET"))
    .update(rawBody)
    .digest("base64");
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  } catch {
    return false;
  }
}

type LineMessage = Record<string, unknown>;

/** Quick-reply shortcuts shown under every message Lisa sends. */
const QUICK_REPLY_ITEMS: Record<string, unknown>[] = [
  { type: "action", action: { type: "message", label: "📅 วันนี้", text: "ตารางวันนี้มีอะไรบ้าง" } },
  { type: "action", action: { type: "message", label: "📅 พรุ่งนี้", text: "ตารางพรุ่งนี้มีอะไรบ้าง" } },
  { type: "action", action: { type: "message", label: "🗓 สัปดาห์นี้", text: "สรุปตารางสัปดาห์นี้มีอะไรบ้าง" } },
  { type: "action", action: { type: "message", label: "🕐 เวลาว่าง", text: "ขอตารางว่างประชุมสัปดาห์นี้" } },
  { type: "action", action: { type: "message", label: "🍽 มื้ออาหาร", text: "ตารางทานข้าวสัปดาห์นี้มีอะไรบ้าง" } },
];

function withQuickReply(message: LineMessage): LineMessage {
  return { ...message, quickReply: { items: QUICK_REPLY_ITEMS } };
}

async function lineFetch(path: string, body: unknown): Promise<void> {
  const res = await fetch(`${LINE_API}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${requireEnv("LINE_CHANNEL_ACCESS_TOKEN")}`,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    console.error(`LINE API ${path} failed (${res.status}): ${text}`);
  }
}

/** Push messages to the owner. */
export async function pushToOwner(messages: LineMessage[]): Promise<void> {
  await lineFetch("/message/push", {
    to: requireEnv("LINE_OWNER_USER_ID"),
    messages: messages.slice(0, 5),
  });
}

export async function pushText(text: string): Promise<void> {
  // LINE text messages cap at 5000 chars
  const chunks: LineMessage[] = [];
  let rest = text;
  while (rest.length > 0 && chunks.length < 5) {
    chunks.push({ type: "text", text: rest.slice(0, 4900) });
    rest = rest.slice(4900);
  }
  if (chunks.length > 0) chunks[chunks.length - 1] = withQuickReply(chunks[chunks.length - 1]);
  await pushToOwner(chunks);
}

export async function replyText(replyToken: string, text: string): Promise<void> {
  await lineFetch("/message/reply", {
    replyToken,
    messages: [withQuickReply({ type: "text", text: text.slice(0, 4900) })],
  });
}

export async function pushFlex(altText: string, contents: Record<string, unknown>): Promise<void> {
  await pushToOwner([withQuickReply({ type: "flex", altText, contents })]);
}

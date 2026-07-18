import { after } from "next/server";
import { env } from "@/lib/env";
import { pushText, replyText, verifyLineSignature } from "@/lib/line";
import { runLisaAgent } from "@/lib/agent/run";

export const maxDuration = 300;

interface LineEvent {
  type: string;
  replyToken?: string;
  source?: { type: string; userId?: string };
  message?: { type: string; id: string; text?: string };
}

async function handleEvent(event: LineEvent): Promise<void> {
  const ownerId = env("LINE_OWNER_USER_ID");
  const senderId = event.source?.userId ?? "";

  // Setup helper: before the owner ID is configured, echo back the sender's
  // user ID so the owner can copy it into the env vars.
  if (!ownerId) {
    if (event.replyToken) {
      await replyText(
        event.replyToken,
        `สวัสดีค่ะ Lisa ยังตั้งค่าไม่เสร็จ — LINE user ID ของคุณคือ:\n${senderId}\n\nนำไปใส่ env LINE_OWNER_USER_ID แล้ว deploy ใหม่นะคะ`
      );
    }
    return;
  }

  // Lisa is a personal assistant — ignore everyone except the owner.
  if (senderId !== ownerId) return;

  if (event.type !== "message") return;

  if (event.message?.type !== "text") {
    await pushText("ตอนนี้ Lisa อ่านได้เฉพาะข้อความตัวอักษรนะคะ 🙏 รูป/ไฟล์ยังไม่รองรับค่ะ");
    return;
  }

  const text = event.message.text ?? "";
  if (!text.trim()) return;

  try {
    const reply = await runLisaAgent(text);
    await pushText(reply);
  } catch (err) {
    console.error("Lisa agent failed:", err);
    await pushText("ขอโทษค่ะ มีข้อผิดพลาดภายใน Lisa ลองอีกครั้งได้เลยนะคะ 🙏");
  }
}

export async function POST(req: Request) {
  const rawBody = await req.text();
  const signature = req.headers.get("x-line-signature");

  if (!verifyLineSignature(rawBody, signature)) {
    return new Response("invalid signature", { status: 401 });
  }

  let body: { events?: LineEvent[] };
  try {
    body = JSON.parse(rawBody);
  } catch {
    return new Response("bad request", { status: 400 });
  }

  const events = body.events ?? [];

  // Ack LINE immediately; process (Claude + Calendar can take a while) after the response.
  after(async () => {
    for (const event of events) {
      try {
        await handleEvent(event);
      } catch (err) {
        console.error("handleEvent failed:", err);
      }
    }
  });

  return Response.json({ ok: true });
}

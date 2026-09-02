import { after } from "next/server";
import { env } from "@/lib/env";
import { patchEvent, respondToInvite, simplifyEvent } from "@/lib/google";
import { pushText, replyText, verifyLineSignature } from "@/lib/line";
import { db } from "@/lib/supabase";
import { runLisaAgent } from "@/lib/agent/run";

export const maxDuration = 300;

interface LineEvent {
  type: string;
  replyToken?: string;
  source?: { type: string; userId?: string };
  message?: { type: string; id: string; text?: string };
  postback?: { data?: string };
}

/** Handle invite accept/decline button presses from invitation cards. */
async function handleInvitePostback(data: string): Promise<void> {
  const m = data.match(/^invite:(accepted|declined):(.+)$/);
  if (!m) return;
  const [, decision, eventId] = m;
  try {
    const ev = await respondToInvite(eventId, decision as "accepted" | "declined");
    await db()
      .from("lisa_invite_notices")
      .update({ decision, decided_at: new Date().toISOString() })
      .eq("event_id", eventId);
    await pushText(
      decision === "accepted"
        ? `✅ ตอบรับคำเชิญ "${ev.summary ?? ""}" เรียบร้อยค่ะ ลงตารางให้แล้วนะคะ`
        : `❌ ปฏิเสธคำเชิญ "${ev.summary ?? ""}" ให้เรียบร้อยค่ะ`
    );
  } catch (err) {
    console.error("invite postback failed:", err);
    await pushText("ขอโทษค่ะ ตอบกลับคำเชิญไม่สำเร็จ ลองกดอีกครั้งได้นะคะ 🙏");
  }
}

/** Handle Confirm/Cancel button presses on a staged outbound-invitation card. */
async function handleSendInvitePostback(data: string): Promise<void> {
  const m = data.match(/^send_invite:(confirm|cancel):(.+)$/);
  if (!m) return;
  const [, decision, pendingId] = m;
  try {
    const { data: pending, error } = await db()
      .from("lisa_pending_actions")
      .select("id, payload, status, expires_at")
      .eq("id", pendingId)
      .eq("action_type", "send_invitation")
      .maybeSingle();
    if (error || !pending) {
      await pushText("ขอโทษค่ะ ไม่พบคำเชิญนี้แล้วค่ะ");
      return;
    }
    if (pending.status !== "pending") {
      await pushText("คำเชิญนี้ไม่พร้อมใช้งานแล้วค่ะ (อาจถูกยกเลิกหรือแทนที่ด้วยรายการใหม่) ลองขอให้ Lisa เตรียมคำเชิญใหม่นะคะ");
      return;
    }

    if (decision === "cancel") {
      await db().from("lisa_pending_actions").update({ status: "cancelled" }).eq("id", pendingId);
      await pushText("❌ ยกเลิกการส่งคำเชิญเรียบร้อยค่ะ");
      return;
    }

    if (new Date(pending.expires_at).getTime() < Date.now()) {
      await db().from("lisa_pending_actions").update({ status: "cancelled" }).eq("id", pendingId);
      await pushText("คำเชิญนี้หมดอายุแล้วค่ะ (เกิน 24 ชม.) รบกวนขอให้ Lisa เตรียมคำเชิญใหม่นะคะ");
      return;
    }

    const payload = pending.payload as { event_id: string; attendees: { name: string; email: string }[] };
    const ev = await patchEvent(
      payload.event_id,
      { attendees: payload.attendees.map((a) => ({ email: a.email, displayName: a.name })) },
      { sendUpdates: "all" }
    );
    await db().from("lisa_pending_actions").update({ status: "done" }).eq("id", pendingId);
    const names = payload.attendees.map((a) => a.name).join(", ");
    await pushText(`✅ ส่งคำเชิญ "${simplifyEvent(ev).title}" ให้ ${names} เรียบร้อยค่ะ`);
  } catch (err) {
    console.error("send_invite postback failed:", err);
    await pushText("ขอโทษค่ะ ส่งคำเชิญไม่สำเร็จ ลองกดอีกครั้งได้นะคะ 🙏");
  }
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

  if (event.type === "postback") {
    const data = event.postback?.data ?? "";
    if (data.startsWith("send_invite:")) {
      await handleSendInvitePostback(data);
    } else {
      await handleInvitePostback(data);
    }
    return;
  }

  if (event.type !== "message") return;

  if (event.message?.type !== "text") {
    await pushText("ตอนนี้ Lisa อ่านได้เฉพาะข้อความตัวอักษรนะคะ 🙏 รูป/ไฟล์ยังไม่รองรับค่ะ");
    return;
  }

  const text = event.message.text ?? "";
  if (!text.trim()) return;

  try {
    const reply = await runLisaAgent(text);
    if (reply) await pushText(reply);
  } catch (err) {
    console.error("Lisa agent failed:", err);
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("usage limits")) {
      await pushText(
        "ขอโทษค่ะ ตอนนี้โควต้า Claude API ประจำเดือนเต็มแล้ว 😢 สมองของลิซ่าเลยหยุดทำงานชั่วคราวค่ะ\n\nแก้ได้โดยเพิ่ม Monthly spend limit ที่ console.anthropic.com → Settings → Limits แล้วกลับมาคุยกันต่อได้ทันทีค่ะ"
      );
    } else if (msg.includes("credit balance")) {
      await pushText(
        "ขอโทษค่ะ เครดิต Claude API หมดแล้ว 😢 เติมเครดิตที่ console.anthropic.com → Billing แล้วกลับมาคุยกันต่อได้ทันทีค่ะ"
      );
    } else if (msg.includes("rate_limit") || msg.includes("Overloaded") || msg.includes("overloaded")) {
      await pushText("ระบบกำลังหนาแน่นชั่วคราวค่ะ รอสัก 1 นาทีแล้วส่งข้อความเดิมอีกครั้งนะคะ 🙏");
    } else {
      await pushText("ขอโทษค่ะ มีข้อผิดพลาดภายใน Lisa ลองอีกครั้งได้เลยนะคะ 🙏");
    }
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

import { requireEnv } from "@/lib/env";
import { extractMeetingLink, isAllDay, listEvents } from "@/lib/google";
import { pushText } from "@/lib/line";
import { db } from "@/lib/supabase";
import { fmtTime } from "@/lib/time";

export const maxDuration = 60;

const REMIND_WINDOW_MIN = 31; // remind at the first 5-min tick where start is ≤31 min away

function authorized(req: Request): boolean {
  const secret = requireEnv("CRON_SECRET");
  if (req.headers.get("authorization") === `Bearer ${secret}`) return true;
  // Manual trigger for testing: /api/cron/reminders?key=<CRON_SECRET>
  return new URL(req.url).searchParams.get("key") === secret;
}

export async function GET(req: Request) {
  if (!authorized(req)) return new Response("unauthorized", { status: 401 });

  const now = new Date();
  const events = await listEvents({
    timeMin: now.toISOString(),
    timeMax: new Date(now.getTime() + 45 * 60_000).toISOString(),
  });

  let sent = 0;
  for (const ev of events) {
    if (isAllDay(ev) || !ev.start?.dateTime) continue;

    // Skip events the owner declined
    const self = ev.attendees?.find((a) => a.self);
    if (self?.responseStatus === "declined") continue;

    const start = new Date(ev.start.dateTime);
    const minsUntil = (start.getTime() - now.getTime()) / 60_000;
    if (minsUntil <= 0 || minsUntil > REMIND_WINDOW_MIN) continue;

    // At-most-once: claim the reminder row first; unique PK blocks duplicates.
    const { error } = await db()
      .from("lisa_reminded_events")
      .insert({ event_id: ev.id, start_time: start.toISOString() });
    if (error) continue; // already reminded (23505) or DB issue — don't double-send

    const link = extractMeetingLink(ev);
    const lines = [
      `⏰ อีก ${Math.round(minsUntil)} นาที ถึงนัดถัดไป`,
      `📅 ${ev.summary ?? "(ไม่มีชื่อ)"}`,
      `🕐 ${fmtTime(start)}${ev.end?.dateTime ? `–${fmtTime(new Date(ev.end.dateTime))}` : ""}`,
    ];
    if (ev.location) lines.push(`📍 ${ev.location}`);
    if (link) lines.push(`🔗 ${link}`);
    await pushText(lines.join("\n"));
    sent++;
  }

  return Response.json({ ok: true, checked: events.length, sent });
}

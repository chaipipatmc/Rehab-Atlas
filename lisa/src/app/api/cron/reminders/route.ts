import { requireEnv } from "@/lib/env";
import { buildInviteCard } from "@/lib/flex";
import {
  extractMeetingLink,
  isAllDay,
  listEvents,
  shortLocation,
  type GcalEvent,
} from "@/lib/google";
import { pushFlex, pushText } from "@/lib/line";
import { db } from "@/lib/supabase";
import { fmtTime } from "@/lib/time";

export const maxDuration = 60;

const REMIND_WINDOW_MIN = 31; // remind at the first 5-min tick where start is ≤31 min away
const INVITE_HORIZON_DAYS = 45; // scan this far ahead for unanswered invitations

function authorized(req: Request): boolean {
  const secret = requireEnv("CRON_SECRET");
  if (req.headers.get("authorization") === `Bearer ${secret}`) return true;
  // Manual trigger for testing: /api/cron/reminders?key=<CRON_SECRET>
  return new URL(req.url).searchParams.get("key") === secret;
}

function overlaps(a: GcalEvent, b: GcalEvent): boolean {
  if (!a.start?.dateTime || !a.end?.dateTime || !b.start?.dateTime || !b.end?.dateTime) return false;
  return (
    Date.parse(a.start.dateTime) < Date.parse(b.end.dateTime) &&
    Date.parse(b.start.dateTime) < Date.parse(a.end.dateTime)
  );
}

/** Push 30-minute-before reminders for upcoming events. */
async function sendReminders(now: Date): Promise<{ checked: number; sent: number }> {
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
    if (ev.location) lines.push(`📍 ${shortLocation(ev.location)}`);
    if (link) lines.push(`🔗 ${link}`);
    await pushText(lines.join("\n"));
    sent++;
  }
  return { checked: events.length, sent };
}

/** Detect new unanswered invitations and push an accept/decline card for each. */
async function sendInviteCards(now: Date): Promise<{ invites: number }> {
  const horizon = await listEvents({
    timeMin: now.toISOString(),
    timeMax: new Date(now.getTime() + INVITE_HORIZON_DAYS * 86400_000).toISOString(),
  });

  let invites = 0;
  for (const ev of horizon) {
    const self = ev.attendees?.find((a) => a.self);
    if (self?.responseStatus !== "needsAction") continue;
    if (ev.organizer?.self) continue; // own events never need an RSVP card

    // At-most-once per event: claim the notice row first.
    const { error } = await db().from("lisa_invite_notices").insert({ event_id: ev.id });
    if (error) continue; // already notified

    const conflicts = horizon.filter(
      (other) =>
        other.id !== ev.id &&
        !isAllDay(other) &&
        other.attendees?.find((a) => a.self)?.responseStatus !== "declined" &&
        overlaps(ev, other)
    );
    await pushFlex(
      `คำเชิญประชุมใหม่: ${ev.summary ?? "(ไม่มีชื่อ)"}`,
      buildInviteCard(ev, conflicts)
    );
    invites++;
  }
  return { invites };
}

export async function GET(req: Request) {
  if (!authorized(req)) return new Response("unauthorized", { status: 401 });

  const now = new Date();
  const reminders = await sendReminders(now);
  let invites = { invites: 0 };
  try {
    invites = await sendInviteCards(now);
  } catch (err) {
    console.error("invite scan failed:", err);
  }

  return Response.json({ ok: true, ...reminders, ...invites });
}

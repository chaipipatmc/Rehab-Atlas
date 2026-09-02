import type Anthropic from "@anthropic-ai/sdk";
import { buildInviteConfirmCard, buildScheduleCard, buildWeekCarousel, eventDayStart } from "../flex";
import {
  createEvent,
  deleteEvent,
  getEvent,
  listEvents,
  patchEvent,
  simplifyEvent,
} from "../google";
import { pushFlex, pushText } from "../line";
import { db } from "../supabase";
import { bangkokYmd, fmtThaiDay, TZ } from "../time";

/** Bangkok calendar-day keys (ymd) spanning [minIso, maxIso). Capped to avoid runaway loops. */
function daysInRange(minIso: string, maxIso: string): string[] {
  const start = Date.parse(minIso);
  const end = Date.parse(maxIso);
  if (Number.isNaN(start) || Number.isNaN(end)) return [];
  const days: string[] = [];
  let cursor = new Date(`${bangkokYmd(new Date(start))}T00:00:00+07:00`).getTime();
  while (cursor < end && days.length < 40) {
    days.push(bangkokYmd(new Date(cursor)));
    cursor += 86400_000;
  }
  return days;
}

/** "9:00" style Bangkok time (no leading zero, matches the owner's availability format). */
function fmtTimeLocal(ms: number): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: TZ,
    hour: "numeric",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(ms));
}

export const TITLE_PREFIX = "[LISA] - ";
export const DEFAULT_DURATION_MIN = 30;

/** Owner's category → Google Calendar event colorId (API supports 11 fixed colors). */
const CATEGORY_COLORS: Record<string, string> = {
  tp: "10", // Basil (dark green)
  aqua: "7", // Peacock (blue)
  fab: "6", // Tangerine (orange)
  hills: "4", // Flamingo (pink — closest to Cherry Blossom)
  meal: "11", // Tomato (red)
  sport: "2", // Sage (light green — closest to Avocado)
  personal: "8", // Graphite (gray — closest to Birch)
  other: "5", // Banana (yellow)
};

export interface ToolContext {
  /** Incremented when a tool pushes a LINE message directly (card / forward summary). */
  pushState: { count: number };
}

export const TOOLS: Anthropic.Tool[] = [
  {
    name: "list_events",
    description:
      "List Google Calendar events between two times (use for conflict checks and questions about the schedule). Times are RFC3339 with +07:00 offset.",
    input_schema: {
      type: "object",
      properties: {
        time_min: { type: "string", description: "RFC3339 start of range, e.g. 2026-07-18T00:00:00+07:00" },
        time_max: { type: "string", description: "RFC3339 end of range" },
        query: { type: "string", description: "Optional free-text search within the range" },
      },
      required: ["time_min", "time_max"],
    },
  },
  {
    name: "create_event",
    description:
      "Create a calendar event. Pass only the topic — the system prefixes '[LISA] - ' automatically. If end/duration_minutes are omitted the event is 30 minutes. Set online=true to auto-create a Google Meet link. No attendees are invited at creation.",
    input_schema: {
      type: "object",
      properties: {
        topic: { type: "string", description: "Topic WITHOUT the [LISA] prefix" },
        start: { type: "string", description: "RFC3339 start, e.g. 2026-07-20T14:00:00+07:00" },
        end: { type: "string", description: "RFC3339 end. Omit to default to 30 minutes (or use duration_minutes)" },
        duration_minutes: { type: "number", description: "Only when the owner explicitly asked for a non-default duration" },
        online: { type: "boolean", description: "true = online meeting → create Google Meet" },
        location: { type: "string", description: "Plain place name (resolved from alias). Required for onsite events" },
        description: { type: "string", description: "Optional notes/agenda summarized from the owner's message" },
        category: {
          type: "string",
          enum: ["tp", "aqua", "fab", "hills", "meal", "sport", "personal", "other"],
          description:
            "Event color category: tp = TP/Thai Parcel (Basil green), aqua = AQUA group incl. TCDC/EP (Peacock blue), fab = FAB Food (Tangerine orange), hills = The Hills / Mantra (pink), meal = eating/drinking with someone — lunch, dinner, coffee, drinks at any time of day (Tomato red — takes priority over the company category even if it's a business meal), sport = sport/training/exercise (light green), personal = personal/family/pets/doctor (gray), other = everything else incl. 7X (Banana yellow)",
        },
      },
      required: ["topic", "start", "online", "category"],
    },
  },
  {
    name: "update_event",
    description: "Update an existing event (time, topic, location, description). Does not touch attendees.",
    input_schema: {
      type: "object",
      properties: {
        event_id: { type: "string" },
        topic: { type: "string", description: "New topic WITHOUT the [LISA] prefix" },
        start: { type: "string", description: "New RFC3339 start" },
        end: { type: "string", description: "New RFC3339 end" },
        location: { type: "string" },
        description: { type: "string" },
        category: {
          type: "string",
          enum: ["tp", "aqua", "fab", "hills", "meal", "sport", "personal", "other"],
          description: "Change the event's color category",
        },
      },
      required: ["event_id"],
    },
  },
  {
    name: "delete_event",
    description: "Delete an event from the calendar.",
    input_schema: {
      type: "object",
      properties: { event_id: { type: "string" } },
      required: ["event_id"],
    },
  },
  {
    name: "search_contacts",
    description: "Search saved contacts by name, nickname, company, or email fragment. Use before sending invitations.",
    input_schema: {
      type: "object",
      properties: { query: { type: "string" } },
      required: ["query"],
    },
  },
  {
    name: "add_contact",
    description: "Save a new contact (or a corrected email) for future invitations.",
    input_schema: {
      type: "object",
      properties: {
        name: { type: "string", description: "Full name" },
        email: { type: "string" },
        nickname: { type: "string", description: "Common/short name the owner uses" },
        company: { type: "string", description: "Related company/organization" },
      },
      required: ["name", "email"],
    },
  },
  {
    name: "find_free_slots",
    description:
      "Compute the owner's open meeting slots between two times. Working window is 09:00–18:00 Bangkok per day; slots shorter than 60 minutes are flagged online_only (too tight for travel — online meetings only). Use when the owner asks for available time to offer someone (e.g. 'ขอเวลารับนัด วันพฤหัส').",
    input_schema: {
      type: "object",
      properties: {
        time_min: { type: "string", description: "RFC3339 start of range with +07:00 offset" },
        time_max: { type: "string", description: "RFC3339 end of range" },
      },
      required: ["time_min", "time_max"],
    },
  },
  {
    name: "add_location",
    description: "Save a location alias so the owner can refer to it by short name next time.",
    input_schema: {
      type: "object",
      properties: {
        alias: { type: "string", description: "Short name the owner uses, e.g. 'tp office'" },
        full_name: { type: "string", description: "Plain place name to put in the event location field" },
      },
      required: ["alias", "full_name"],
    },
  },
  {
    name: "request_invitation_confirmation",
    description:
      "Stage an invitation for an event and push a Confirm/Cancel button card to the owner. Call this AFTER resolving attendee emails. Nothing is sent until the owner taps Confirm on the card — do not ask them to type a confirmation word, and there is no separate 'send' tool to call afterward.",
    input_schema: {
      type: "object",
      properties: {
        event_id: { type: "string" },
        attendees: {
          type: "array",
          items: {
            type: "object",
            properties: {
              name: { type: "string" },
              email: { type: "string" },
            },
            required: ["name", "email"],
          },
        },
      },
      required: ["event_id", "attendees"],
    },
  },
  {
    name: "add_note",
    description:
      "Save a freeform reminder/note the owner asks Lisa to remember — things WITHOUT a specific date/time (decisions to make, things to look into, ideas). If the owner gives a concrete date/time, use create_event instead — never this. Trigger phrases: 'จำไว้ว่า...', 'ฝากไว้...', 'อย่าลืม...', 'ต้องคิดเรื่อง...'.",
    input_schema: {
      type: "object",
      properties: {
        content: { type: "string", description: "Concise summary of what to remember, in the owner's language" },
        category: {
          type: "string",
          enum: ["work", "personal", "other"],
          description: "work = business/company-related, personal = personal life, other = unclear",
        },
      },
      required: ["content", "category"],
    },
  },
  {
    name: "list_notes",
    description:
      "List saved reminders/notes. Use when the owner asks what they've asked Lisa to remember or what's pending ('มีอะไรฝากไว้บ้าง', 'สิ่งที่ค้างอยู่มีอะไรบ้าง', 'เตือนอะไรไว้บ้าง'). Defaults to open (unresolved) notes across all categories.",
    input_schema: {
      type: "object",
      properties: {
        status: { type: "string", enum: ["open", "done", "all"], description: "Defaults to open" },
        category: { type: "string", enum: ["work", "personal", "other", "all"], description: "Defaults to all" },
      },
    },
  },
  {
    name: "complete_note",
    description:
      "Mark a saved note as done/resolved, e.g. when the owner says a decision has been made or a task is handled. Call list_notes first if you need the note_id.",
    input_schema: {
      type: "object",
      properties: { note_id: { type: "string" } },
      required: ["note_id"],
    },
  },
  {
    name: "send_schedule_card",
    description:
      "Fetch events in a time range and push a rich schedule card to the owner. ALWAYS use this instead of a text list when the owner asks what's on their schedule for a day or range. Ranges spanning 2–12 days automatically render as a horizontally swipeable carousel of daily cards (one bubble per day, including empty days); single-day or longer ranges render as one combined card. If it returns events=0 no card is sent — answer briefly in text instead. After the card is sent, keep your final reply to one short line or nothing.",
    input_schema: {
      type: "object",
      properties: {
        time_min: { type: "string", description: "RFC3339 start of range with +07:00 offset" },
        time_max: { type: "string", description: "RFC3339 end of range" },
        title: { type: "string", description: "Card title, e.g. 'จันทร์ 20 ก.ค.' or 'สัปดาห์นี้' — ignored for multi-day carousels (each day gets its own label)" },
        query: { type: "string", description: "Optional free-text filter (Google Calendar search) for a subset, e.g. 'ข้าว' when the owner asks specifically for a meal/mealtime schedule" },
      },
      required: ["time_min", "time_max", "title"],
    },
  },
  {
    name: "send_forward_summary",
    description:
      "Push a standalone formal text message the owner can forward to external parties. Call this right after successfully booking or rescheduling a meeting. The text must be formal Thai business style: no emoji, no markdown, no [LISA] prefix — including เรื่อง / วันที่ (Thai date, พ.ศ.) / เวลา / สถานที่ / ลิงก์ประชุม (if any).",
    input_schema: {
      type: "object",
      properties: {
        text: { type: "string", description: "The formal summary text, ready to forward" },
      },
      required: ["text"],
    },
  },
];

function ok(data: unknown): string {
  return JSON.stringify({ ok: true, data });
}
function fail(message: string): string {
  return JSON.stringify({ ok: false, error: message });
}

function resolveEnd(start: string, end?: string, durationMinutes?: number): string {
  if (end) return end;
  const startMs = Date.parse(start);
  if (Number.isNaN(startMs)) throw new Error(`Invalid start datetime: ${start}`);
  const mins = durationMinutes && durationMinutes > 0 ? durationMinutes : DEFAULT_DURATION_MIN;
  return new Date(startMs + mins * 60_000).toISOString();
}

/* eslint-disable @typescript-eslint/no-explicit-any */
export async function executeTool(
  name: string,
  input: any,
  ctx: ToolContext
): Promise<string> {
  try {
    switch (name) {
      case "list_events": {
        const events = await listEvents({
          timeMin: input.time_min,
          timeMax: input.time_max,
          q: input.query || undefined,
        });
        return ok(events.map(simplifyEvent));
      }

      case "create_event": {
        const ev = await createEvent({
          summary: TITLE_PREFIX + String(input.topic).trim(),
          description: input.description || undefined,
          location: input.location || undefined,
          startISO: input.start,
          endISO: resolveEnd(input.start, input.end, input.duration_minutes),
          withMeet: Boolean(input.online),
          colorId: CATEGORY_COLORS[input.category] ?? CATEGORY_COLORS.other,
        });
        return ok(simplifyEvent(ev));
      }

      case "update_event": {
        const patch: Record<string, unknown> = {};
        if (input.topic) patch.summary = TITLE_PREFIX + String(input.topic).trim();
        if (input.location !== undefined) patch.location = input.location;
        if (input.description !== undefined) patch.description = input.description;
        if (input.start) patch.start = { dateTime: input.start, timeZone: TZ };
        if (input.end) patch.end = { dateTime: input.end, timeZone: TZ };
        if (input.category) patch.colorId = CATEGORY_COLORS[input.category] ?? CATEGORY_COLORS.other;
        const ev = await patchEvent(input.event_id, patch);
        return ok(simplifyEvent(ev));
      }

      case "delete_event": {
        await deleteEvent(input.event_id);
        return ok({ deleted: input.event_id });
      }

      case "search_contacts": {
        const q = `%${String(input.query).trim()}%`;
        const { data, error } = await db()
          .from("lisa_contacts")
          .select("name, nickname, company, email")
          .or(`name.ilike.${q},nickname.ilike.${q},email.ilike.${q},company.ilike.${q}`)
          .limit(10);
        if (error) return fail(error.message);
        return ok(data);
      }

      case "add_contact": {
        const { error } = await db().from("lisa_contacts").upsert(
          {
            name: String(input.name).trim(),
            nickname: input.nickname ? String(input.nickname).trim() : null,
            company: input.company ? String(input.company).trim() : null,
            email: String(input.email).trim().toLowerCase(),
            updated_at: new Date().toISOString(),
          },
          { onConflict: "email" }
        );
        if (error) return fail(error.message);
        return ok({ saved: input.email });
      }

      case "find_free_slots": {
        const events = await listEvents({ timeMin: input.time_min, timeMax: input.time_max });
        const busyEvents = events.filter(
          (ev) =>
            ev.start?.dateTime &&
            ev.end?.dateTime &&
            ev.transparency !== "transparent" &&
            ev.attendees?.find((a) => a.self)?.responseStatus !== "declined"
        );
        const now = Date.now();
        const rangeStart = Date.parse(input.time_min);
        const rangeEnd = Date.parse(input.time_max);
        if (Number.isNaN(rangeStart) || Number.isNaN(rangeEnd)) return fail("invalid time range");

        const days: { label: string; slots: { start: string; end: string; online_only: boolean }[] }[] = [];
        // Iterate Bangkok days across the range
        let dayStart = new Date(`${bangkokYmd(new Date(rangeStart))}T00:00:00+07:00`).getTime();
        while (dayStart < rangeEnd && days.length < 14) {
          const workStart = dayStart + 9 * 3600_000;
          const workEnd = dayStart + 18 * 3600_000;
          const windowStart = Math.max(workStart, now, rangeStart);
          const windowEnd = Math.min(workEnd, rangeEnd);
          if (windowStart < windowEnd) {
            const busy = busyEvents
              .map((ev) => [Date.parse(ev.start!.dateTime!), Date.parse(ev.end!.dateTime!)] as [number, number])
              .filter(([s, e]) => e > windowStart && s < windowEnd)
              .sort((a, b) => a[0] - b[0]);
            const merged: [number, number][] = [];
            for (const [s, e] of busy) {
              const last = merged[merged.length - 1];
              if (last && s <= last[1]) last[1] = Math.max(last[1], e);
              else merged.push([s, e]);
            }
            const gaps: [number, number][] = [];
            let cursor = windowStart;
            for (const [s, e] of merged) {
              if (s > cursor) gaps.push([cursor, Math.min(s, windowEnd)]);
              cursor = Math.max(cursor, e);
            }
            if (cursor < windowEnd) gaps.push([cursor, windowEnd]);

            const slots = gaps
              .filter(([s, e]) => e - s >= 30 * 60_000) // drop slivers under 30 min
              .map(([s, e]) => ({
                start: fmtTimeLocal(s),
                end: fmtTimeLocal(e),
                online_only: e - s < 60 * 60_000,
              }));
            if (slots.length > 0) {
              const d = new Date(dayStart + 12 * 3600_000);
              const label = `${new Intl.DateTimeFormat("en-US", { timeZone: TZ, month: "long", day: "numeric", year: "numeric" }).format(d)} (${new Intl.DateTimeFormat("en-US", { timeZone: TZ, weekday: "short" }).format(d)})`;
              days.push({ label, slots });
            }
          }
          dayStart += 86400_000;
        }
        return ok({ days, note: "online_only=true means the slot is squeezed between meetings — offer it for online meetings only, mark it (online)." });
      }

      case "add_location": {
        const { error } = await db().from("lisa_locations").upsert(
          {
            alias: String(input.alias).trim().toLowerCase(),
            full_name: String(input.full_name).trim(),
          },
          { onConflict: "alias" }
        );
        if (error) return fail(error.message);
        return ok({ saved: input.alias });
      }

      case "request_invitation_confirmation": {
        const attendees = (input.attendees ?? []) as { name: string; email: string }[];
        if (attendees.length === 0) return fail("attendees list is empty");
        // Verify the event exists before staging
        const ev = await getEvent(input.event_id);
        // Superseding a card the owner never tapped: cancel any earlier pending
        // invitation for the same event so a stale button can't fire a stale list.
        await db()
          .from("lisa_pending_actions")
          .update({ status: "cancelled" })
          .eq("action_type", "send_invitation")
          .eq("status", "pending")
          .contains("payload", { event_id: input.event_id });
        const { data, error } = await db()
          .from("lisa_pending_actions")
          .insert({
            action_type: "send_invitation",
            payload: { event_id: input.event_id, attendees },
            status: "pending",
            expires_at: new Date(Date.now() + 24 * 3600_000).toISOString(),
          })
          .select("id")
          .single();
        if (error) return fail(error.message);
        await pushFlex(
          `ยืนยันส่งคำเชิญ: ${ev.summary ?? ""}`,
          buildInviteConfirmCard(data.id, ev, attendees)
        );
        ctx.pushState.count++;
        return ok({
          staged: true,
          card_sent: true,
          event: simplifyEvent(ev),
          attendees,
          next_step:
            "A Confirm/Cancel button card was already sent — do NOT ask the owner to type ยืนยัน, and do not call another tool to send it. Reply with nothing or at most one short line.",
        });
      }

      case "add_note": {
        const { data, error } = await db()
          .from("lisa_notes")
          .insert({
            content: String(input.content).trim(),
            category: input.category || "other",
          })
          .select("id")
          .single();
        if (error) return fail(error.message);
        return ok({ saved: true, id: data.id });
      }

      case "list_notes": {
        const status = input.status || "open";
        const category = input.category || "all";
        let q = db()
          .from("lisa_notes")
          .select("id, content, category, status, created_at")
          .order("created_at", { ascending: true });
        if (status !== "all") q = q.eq("status", status);
        if (category !== "all") q = q.eq("category", category);
        const { data, error } = await q;
        if (error) return fail(error.message);
        return ok(data);
      }

      case "complete_note": {
        const { error } = await db()
          .from("lisa_notes")
          .update({ status: "done", done_at: new Date().toISOString() })
          .eq("id", input.note_id);
        if (error) return fail(error.message);
        return ok({ completed: input.note_id });
      }

      case "send_schedule_card": {
        const events = await listEvents({
          timeMin: input.time_min,
          timeMax: input.time_max,
          q: input.query || undefined,
        });
        if (events.length === 0) {
          return ok({ events: 0, card_sent: false, note: "No events — answer in text instead." });
        }
        const dayKeys = daysInRange(input.time_min, input.time_max);
        if (dayKeys.length > 1 && dayKeys.length <= 12) {
          const days = dayKeys.map((key) => ({
            label: fmtThaiDay(new Date(`${key}T12:00:00+07:00`)),
            events: events.filter((ev) => bangkokYmd(eventDayStart(ev)) === key),
          }));
          await pushFlex(`ตารางนัดหมาย ${events.length} รายการ`, buildWeekCarousel(days));
        } else {
          await pushFlex(
            `ตารางนัดหมาย ${events.length} รายการ`,
            buildScheduleCard({
              header: "Lisa · Schedule",
              title: String(input.title),
              subtitle: `${events.length} นัดหมาย`,
              events,
            })
          );
        }
        ctx.pushState.count++;
        return ok({ events: events.length, card_sent: true, days: dayKeys.length });
      }

      case "send_forward_summary": {
        const text = String(input.text ?? "").trim();
        if (!text) return fail("text is empty");
        await pushText(text);
        ctx.pushState.count++;
        return ok({ sent: true });
      }

      default:
        return fail(`Unknown tool: ${name}`);
    }
  } catch (err) {
    return fail(err instanceof Error ? err.message : String(err));
  }
}

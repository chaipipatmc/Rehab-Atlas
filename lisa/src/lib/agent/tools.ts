import type Anthropic from "@anthropic-ai/sdk";
import {
  createEvent,
  deleteEvent,
  getEvent,
  listEvents,
  patchEvent,
  simplifyEvent,
} from "../google";
import { db } from "../supabase";
import { TZ } from "../time";

export const TITLE_PREFIX = "[LISA] - ";
export const DEFAULT_DURATION_MIN = 30;

/** The confirmation words the owner must type before invitations go out. */
export function isConfirmationMessage(text: string): boolean {
  const t = text.trim().toLowerCase();
  return t.includes("ยืนยัน") || /(^|[^a-z])(confirm|cf)([^a-z]|$)/.test(t);
}

export interface ToolContext {
  /** The owner's latest LINE message — used to enforce the invitation confirmation gate. */
  latestUserText: string;
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
      },
      required: ["topic", "start", "online"],
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
    description: "Search saved contacts by name, nickname, or email fragment. Use before sending invitations.",
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
        name: { type: "string" },
        email: { type: "string" },
        nickname: { type: "string" },
      },
      required: ["name", "email"],
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
      "Stage an invitation for an event. Call this AFTER resolving attendee emails. Then ask the owner to reply ยืนยัน / confirm / cf. Nothing is sent yet.",
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
    name: "send_invitations",
    description:
      "Send the most recently staged invitation. ONLY call this when the owner's latest message is a confirmation (ยืนยัน / confirm / cf) — the system rejects it otherwise.",
    input_schema: { type: "object", properties: {} },
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
          .select("name, nickname, email")
          .or(`name.ilike.${q},nickname.ilike.${q},email.ilike.${q}`)
          .limit(10);
        if (error) return fail(error.message);
        return ok(data);
      }

      case "add_contact": {
        const { error } = await db().from("lisa_contacts").upsert(
          {
            name: String(input.name).trim(),
            nickname: input.nickname ? String(input.nickname).trim() : null,
            email: String(input.email).trim().toLowerCase(),
            updated_at: new Date().toISOString(),
          },
          { onConflict: "email" }
        );
        if (error) return fail(error.message);
        return ok({ saved: input.email });
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
        const { error } = await db().from("lisa_pending_actions").insert({
          action_type: "send_invitation",
          payload: { event_id: input.event_id, attendees },
          status: "pending",
          expires_at: new Date(Date.now() + 24 * 3600_000).toISOString(),
        });
        if (error) return fail(error.message);
        return ok({
          staged: true,
          event: simplifyEvent(ev),
          attendees,
          next_step: "Ask the owner to reply ยืนยัน / confirm / cf to send.",
        });
      }

      case "send_invitations": {
        if (!isConfirmationMessage(ctx.latestUserText)) {
          return fail(
            "REJECTED: the owner's latest message is not a confirmation (ยืนยัน / confirm / cf). Ask them to confirm first."
          );
        }
        const { data: pending, error } = await db()
          .from("lisa_pending_actions")
          .select("id, payload")
          .eq("action_type", "send_invitation")
          .eq("status", "pending")
          .gt("expires_at", new Date().toISOString())
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (error) return fail(error.message);
        if (!pending) return fail("No pending invitation found — stage one with request_invitation_confirmation first.");

        const payload = pending.payload as { event_id: string; attendees: { name: string; email: string }[] };
        const ev = await patchEvent(
          payload.event_id,
          { attendees: payload.attendees.map((a) => ({ email: a.email, displayName: a.name })) },
          { sendUpdates: "all" }
        );
        await db()
          .from("lisa_pending_actions")
          .update({ status: "done" })
          .eq("id", pending.id);
        return ok({ sent: true, event: simplifyEvent(ev) });
      }

      default:
        return fail(`Unknown tool: ${name}`);
    }
  } catch (err) {
    return fail(err instanceof Error ? err.message : String(err));
  }
}

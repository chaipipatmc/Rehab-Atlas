import crypto from "crypto";
import { requireEnv } from "./env";
import { getSetting, setSetting } from "./supabase";
import { TZ } from "./time";

const CAL_API = "https://www.googleapis.com/calendar/v3";
const TOKEN_URL = "https://oauth2.googleapis.com/token";

// ── OAuth ──────────────────────────────────────────────────────────────

export function oauthRedirectUri(): string {
  return `${requireEnv("LISA_BASE_URL").replace(/\/$/, "")}/api/google/callback`;
}

export function oauthConsentUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: requireEnv("GOOGLE_CLIENT_ID"),
    redirect_uri: oauthRedirectUri(),
    response_type: "code",
    scope: "openid email https://www.googleapis.com/auth/calendar.events",
    access_type: "offline",
    prompt: "consent",
    state,
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

export async function exchangeCodeForTokens(code: string): Promise<{
  refresh_token?: string;
  access_token: string;
  expires_in: number;
  id_token?: string;
}> {
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: requireEnv("GOOGLE_CLIENT_ID"),
      client_secret: requireEnv("GOOGLE_CLIENT_SECRET"),
      redirect_uri: oauthRedirectUri(),
      grant_type: "authorization_code",
    }),
  });
  if (!res.ok) throw new Error(`Token exchange failed (${res.status}): ${await res.text()}`);
  return res.json();
}

/** Get a valid access token, refreshing via the stored refresh token when needed. */
export async function getAccessToken(): Promise<string> {
  const cachedToken = await getSetting("google_access_token");
  const cachedExpiry = await getSetting("google_access_token_expires_at");
  if (cachedToken && cachedExpiry && Date.parse(cachedExpiry) - Date.now() > 60_000) {
    return cachedToken;
  }

  const refreshToken = await getSetting("google_refresh_token");
  if (!refreshToken) {
    throw new Error("Google Calendar not connected yet — open /api/google/auth?key=<CRON_SECRET> to authorize.");
  }

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: requireEnv("GOOGLE_CLIENT_ID"),
      client_secret: requireEnv("GOOGLE_CLIENT_SECRET"),
      grant_type: "refresh_token",
    }),
  });
  if (!res.ok) throw new Error(`Token refresh failed (${res.status}): ${await res.text()}`);
  const data = (await res.json()) as { access_token: string; expires_in: number };

  await setSetting("google_access_token", data.access_token);
  await setSetting(
    "google_access_token_expires_at",
    new Date(Date.now() + data.expires_in * 1000).toISOString()
  );
  return data.access_token;
}

// ── Calendar API ───────────────────────────────────────────────────────

async function calFetch(path: string, init?: RequestInit): Promise<Response> {
  const token = await getAccessToken();
  return fetch(`${CAL_API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
}

export interface GcalEvent {
  id: string;
  status?: string;
  summary?: string;
  description?: string;
  location?: string;
  hangoutLink?: string;
  htmlLink?: string;
  transparency?: string;
  organizer?: { email?: string; displayName?: string; self?: boolean };
  start?: { dateTime?: string; date?: string; timeZone?: string };
  end?: { dateTime?: string; date?: string; timeZone?: string };
  attendees?: { email: string; displayName?: string; responseStatus?: string; self?: boolean }[];
  conferenceData?: {
    entryPoints?: { entryPointType?: string; uri?: string }[];
  };
}

export async function listEvents(opts: {
  timeMin: string;
  timeMax: string;
  q?: string;
}): Promise<GcalEvent[]> {
  const params = new URLSearchParams({
    timeMin: opts.timeMin,
    timeMax: opts.timeMax,
    singleEvents: "true",
    orderBy: "startTime",
    maxResults: "50",
    timeZone: TZ,
  });
  if (opts.q) params.set("q", opts.q);
  const res = await calFetch(`/calendars/primary/events?${params.toString()}`);
  if (!res.ok) throw new Error(`listEvents failed (${res.status}): ${await res.text()}`);
  const data = (await res.json()) as { items?: GcalEvent[] };
  return (data.items ?? []).filter((e) => e.status !== "cancelled");
}

export async function getEvent(eventId: string): Promise<GcalEvent> {
  const res = await calFetch(`/calendars/primary/events/${encodeURIComponent(eventId)}`);
  if (!res.ok) throw new Error(`getEvent failed (${res.status}): ${await res.text()}`);
  return res.json();
}

export async function createEvent(opts: {
  summary: string;
  description?: string;
  location?: string;
  startISO: string;
  endISO: string;
  withMeet: boolean;
  colorId?: string;
}): Promise<GcalEvent> {
  const body: Record<string, unknown> = {
    summary: opts.summary,
    description: opts.description,
    location: opts.location,
    start: { dateTime: opts.startISO, timeZone: TZ },
    end: { dateTime: opts.endISO, timeZone: TZ },
    colorId: opts.colorId,
  };
  if (opts.withMeet) {
    body.conferenceData = {
      createRequest: {
        requestId: crypto.randomUUID(),
        conferenceSolutionKey: { type: "hangoutsMeet" },
      },
    };
  }
  const params = new URLSearchParams({ sendUpdates: "none" });
  if (opts.withMeet) params.set("conferenceDataVersion", "1");
  const res = await calFetch(`/calendars/primary/events?${params.toString()}`, {
    method: "POST",
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`createEvent failed (${res.status}): ${await res.text()}`);
  return res.json();
}

export async function patchEvent(
  eventId: string,
  patch: Record<string, unknown>,
  opts?: { sendUpdates?: "none" | "all" }
): Promise<GcalEvent> {
  const params = new URLSearchParams({ sendUpdates: opts?.sendUpdates ?? "none" });
  const res = await calFetch(
    `/calendars/primary/events/${encodeURIComponent(eventId)}?${params.toString()}`,
    { method: "PATCH", body: JSON.stringify(patch) }
  );
  if (!res.ok) throw new Error(`patchEvent failed (${res.status}): ${await res.text()}`);
  return res.json();
}

export async function deleteEvent(eventId: string): Promise<void> {
  const res = await calFetch(
    `/calendars/primary/events/${encodeURIComponent(eventId)}?sendUpdates=none`,
    { method: "DELETE" }
  );
  if (!res.ok && res.status !== 410) {
    throw new Error(`deleteEvent failed (${res.status}): ${await res.text()}`);
  }
}

/** RSVP to an invitation on the owner's behalf (accepted / declined). */
export async function respondToInvite(
  eventId: string,
  response: "accepted" | "declined"
): Promise<GcalEvent> {
  const ev = await getEvent(eventId);
  const attendees = (ev.attendees ?? []).map((a) =>
    a.self ? { ...a, responseStatus: response } : a
  );
  return patchEvent(eventId, { attendees });
}

// ── Helpers ────────────────────────────────────────────────────────────

const LINK_RE =
  /https?:\/\/(?:[\w.-]*\.)?(?:meet\.google\.com|zoom\.us|teams\.microsoft\.com|teams\.live\.com|webex\.com|whereby\.com)\/[^\s<>"')\]]+/i;

/**
 * Best-effort meeting link: Meet link Lisa created, conference entry point,
 * or a video-call URL found in the location/description (invitations from others).
 */
export function extractMeetingLink(ev: GcalEvent): string | null {
  if (ev.hangoutLink) return ev.hangoutLink;
  const entry = ev.conferenceData?.entryPoints?.find(
    (p) => p.entryPointType === "video" && p.uri
  );
  if (entry?.uri) return entry.uri;
  for (const field of [ev.location, ev.description]) {
    const m = field?.match(LINK_RE);
    if (m) return m[0];
  }
  return null;
}

/** "PETiS Animal Hospital 45/5 Rat Phatthana Rd., ..." → "PETiS Animal Hospital 45/5 Rat Phatthana Rd." is
 * still too long — keep only the venue name (text before the first comma), capped for chat display. */
export function shortLocation(location: string): string {
  const name = location.split(",")[0].trim();
  return name.length > 45 ? `${name.slice(0, 42)}…` : name;
}

export function isAllDay(ev: GcalEvent): boolean {
  return Boolean(ev.start?.date && !ev.start?.dateTime);
}

/** Compact representation for the agent / notifications. */
export function simplifyEvent(ev: GcalEvent) {
  return {
    id: ev.id,
    title: ev.summary ?? "(no title)",
    start: ev.start?.dateTime ?? ev.start?.date ?? null,
    end: ev.end?.dateTime ?? ev.end?.date ?? null,
    all_day: isAllDay(ev),
    location: ev.location ?? null,
    meeting_link: extractMeetingLink(ev),
    attendees: (ev.attendees ?? []).map((a) => ({
      name: a.displayName ?? null,
      email: a.email,
      response: a.responseStatus ?? null,
    })),
  };
}

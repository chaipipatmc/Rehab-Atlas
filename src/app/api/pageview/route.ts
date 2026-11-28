import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import { SUPABASE_TIMEOUT_MS } from "@/lib/supabase/timeout";
import { BASE_URL } from "@/lib/site";
import {
  isBotUserAgent,
  parseTrackedEvent,
  resolveEntryReferrer,
} from "@/lib/pageview";

// Fire-and-forget tracking: rate-limit RPC + one insert, each bounded to 4s.
// Never let a stuck backend hold this for the 300s platform default.
export const maxDuration = 10;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function siteHosts(request: Request): string[] {
  const hosts = [new URL(BASE_URL).hostname];
  const host = request.headers.get("host");
  if (host) hosts.push(host.split(":")[0]);
  return hosts;
}

/**
 * Body: { path, session_id?, referrer? }            → one page view
 *       { path, event: "cta_assessment_click" | ... } → one funnel event
 *
 * Events are aggregate counters (event, path, country) — no session id,
 * user agent or anything typed by the visitor is stored with them.
 */
export async function POST(request: Request) {
  const ok = NextResponse.json({ ok: true });

  try {
    const ua = request.headers.get("user-agent") || "";
    if (isBotUserAgent(ua)) return ok;

    const ip = getClientIp(request);
    const rl = await rateLimit(`pv:${ip}`, { limit: 30, windowSeconds: 60 });
    if (!rl.success) return ok;

    const body = (await request.json()) as {
      path?: unknown;
      session_id?: unknown;
      referrer?: unknown;
      event?: unknown;
    };
    const { path } = body;
    if (!path || typeof path !== "string") return ok;

    const country = request.headers.get("x-vercel-ip-country") || null;
    const admin = createAdminClient({ timeoutMs: SUPABASE_TIMEOUT_MS.tracking });

    if (body.event !== undefined) {
      const event = parseTrackedEvent(body.event);
      if (!event) return ok;
      await admin.from("site_events").insert({
        event,
        path: path.slice(0, 500),
        country,
      });
      return ok;
    }

    const sessionId =
      typeof body.session_id === "string" && UUID_RE.test(body.session_id)
        ? body.session_id
        : null;

    // Entry referrer captured client-side once per session; "" = direct.
    // Deliberately no fallback to the Referer header (always our own page).
    const referrer = resolveEntryReferrer(body.referrer, siteHosts(request));

    await admin.from("page_views").insert({
      path: path.slice(0, 500),
      referrer,
      user_agent: ua.slice(0, 500),
      country,
      session_id: sessionId,
    });

    return ok;
  } catch {
    return ok;
  }
}

import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { rateLimit, getClientIp } from "@/lib/rate-limit";

const BOT_REGEX = /bot|crawl|spider|slurp|facebookexternalhit|Mediapartners|Bingbot|Googlebot|YandexBot|Baiduspider|DuckDuckBot|Twitterbot|Applebot|SemrushBot|AhrefsBot/i;

export async function POST(request: Request) {
  const ok = NextResponse.json({ ok: true });

  try {
    const ua = request.headers.get("user-agent") || "";
    if (BOT_REGEX.test(ua)) return ok;

    const ip = getClientIp(request);
    const rl = await rateLimit(`pv:${ip}`, { limit: 30, windowSeconds: 60 });
    if (!rl.success) return ok;

    const body = await request.json();
    const { path, session_id, referrer: clientReferrer } = body as {
      path?: unknown;
      session_id?: unknown;
      referrer?: unknown;
    };
    if (!path || typeof path !== "string") return ok;

    const country = request.headers.get("x-vercel-ip-country") || null;

    // Validate session_id is a UUID; otherwise drop it
    const sessionId =
      typeof session_id === "string" &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(session_id)
        ? session_id
        : null;

    // Prefer the client-supplied entry referrer (captured once per session
    // before SPA navigation overwrites it). Fall back to the HTTP header.
    const referrer =
      (typeof clientReferrer === "string" && clientReferrer.length > 0
        ? clientReferrer
        : request.headers.get("referer")) || null;

    const admin = createAdminClient();
    await admin.from("page_views").insert({
      path: path.slice(0, 500),
      referrer: referrer?.slice(0, 500) || null,
      user_agent: ua.slice(0, 500),
      country,
      session_id: sessionId,
    });

    return ok;
  } catch {
    return ok;
  }
}

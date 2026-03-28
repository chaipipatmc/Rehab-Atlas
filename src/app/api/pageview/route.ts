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
    const rl = rateLimit(`pv:${ip}`, { limit: 30, windowSeconds: 60 });
    if (!rl.success) return ok;

    const { path } = await request.json();
    if (!path || typeof path !== "string") return ok;

    const country = request.headers.get("x-vercel-ip-country") || null;

    const admin = createAdminClient();
    await admin.from("page_views").insert({
      path: path.slice(0, 500),
      referrer: request.headers.get("referer")?.slice(0, 500) || null,
      user_agent: ua.slice(0, 500),
      country,
    });

    return ok;
  } catch {
    return ok;
  }
}

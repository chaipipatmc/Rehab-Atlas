import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { trackEventSchema } from "@/lib/validators";
import { rateLimit, getClientIp } from "@/lib/rate-limit";

// Known bot patterns
const BOT_REGEX = /bot|crawl|spider|slurp|facebookexternalhit|Mediapartners|Bingbot|Googlebot|YandexBot|Baiduspider|DuckDuckBot|Twitterbot|Applebot|SemrushBot|AhrefsBot/i;

export async function POST(request: Request) {
  // Always return 200 to avoid leaking info
  const ok = NextResponse.json({ ok: true });

  try {
    // Bot detection — silently skip
    const ua = request.headers.get("user-agent") || "";
    if (BOT_REGEX.test(ua)) return ok;

    // Rate limit: 60 events per minute per IP
    const ip = getClientIp(request);
    const rl = rateLimit(`track:${ip}`, { limit: 60, windowSeconds: 60 });
    if (!rl.success) return ok;

    // Parse and validate
    const body = await request.json();
    const parsed = trackEventSchema.safeParse(body);
    if (!parsed.success) return ok;

    const { center_id, event } = parsed.data;

    // Increment via RPC (atomic upsert, no race conditions)
    const supabase = createAdminClient();
    await supabase.rpc("increment_center_stat", {
      p_center_id: center_id,
      p_stat: event,
    });

    return ok;
  } catch {
    return ok;
  }
}

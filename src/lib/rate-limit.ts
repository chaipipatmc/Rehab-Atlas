/**
 * Rate limiter for public API routes.
 *
 * Primary store: Supabase `rate_limits` table via the atomic `rate_limit_hit`
 * RPC (migration 028) — shared across all serverless instances, so limits
 * hold on Vercel where each invocation may hit a different lambda.
 *
 * Fallback: the old in-memory Map, used only when Supabase isn't configured
 * or the RPC call fails (e.g. migration not applied yet). Fail-open by
 * design — a broken limiter should never take down lead submission.
 */

import { createAdminClient } from "@/lib/supabase/admin";

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const memoryStore = new Map<string, RateLimitEntry>();

interface RateLimitOptions {
  /** Max requests per window */
  limit: number;
  /** Window duration in seconds */
  windowSeconds: number;
}

interface RateLimitResult {
  success: boolean;
  remaining: number;
  resetAt: number;
}

function memoryRateLimit(key: string, options: RateLimitOptions): RateLimitResult {
  const now = Date.now();
  const windowMs = options.windowSeconds * 1000;

  // Opportunistic cleanup — setInterval is unreliable in serverless
  if (memoryStore.size > 1000) {
    for (const [k, entry] of memoryStore) {
      if (entry.resetAt < now) memoryStore.delete(k);
    }
  }

  const entry = memoryStore.get(key);
  if (!entry || entry.resetAt < now) {
    const resetAt = now + windowMs;
    memoryStore.set(key, { count: 1, resetAt });
    return { success: true, remaining: options.limit - 1, resetAt };
  }

  if (entry.count >= options.limit) {
    return { success: false, remaining: 0, resetAt: entry.resetAt };
  }

  entry.count++;
  return {
    success: true,
    remaining: options.limit - entry.count,
    resetAt: entry.resetAt,
  };
}

export async function rateLimit(
  key: string,
  options: RateLimitOptions
): Promise<RateLimitResult> {
  if (
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.SUPABASE_SERVICE_ROLE_KEY
  ) {
    try {
      const admin = createAdminClient();
      const { data, error } = await admin.rpc("rate_limit_hit", {
        p_key: key,
        p_limit: options.limit,
        p_window_seconds: options.windowSeconds,
      });
      if (!error && data && typeof data === "object") {
        const result = data as { allowed: boolean; remaining: number; reset_at: number };
        return {
          success: result.allowed,
          remaining: result.remaining,
          resetAt: result.reset_at,
        };
      }
    } catch {
      // fall through to in-memory
    }
  }
  return memoryRateLimit(key, options);
}

/**
 * Extract client IP from request headers.
 * Works with Vercel (x-forwarded-for) and direct connections.
 */
export function getClientIp(request: Request): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}

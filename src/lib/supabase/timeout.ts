/**
 * Upper bounds for every Supabase HTTP call (PostgREST, Auth, Storage).
 *
 * Why: supabase-js uses the platform fetch with no deadline. When the
 * Supabase API stops answering (seen in production 2026-11-25..27: a daily
 * multi-hour window where no request from Vercel got a response), every
 * render/route waited until the Vercel function limit (300s / 60s) and the
 * logs filled with "Task timed out". A bounded fetch turns that hang into a
 * fast error: ISR pages keep serving the last good copy, API routes answer,
 * and we stop paying for 300s of idle compute per request.
 *
 * Values are per HTTP request, well above normal latency (p99 < 1s for the
 * queries these clients run) so they only trip when the backend is stuck.
 */
export const SUPABASE_TIMEOUT_MS = {
  /** Public ISR pages (cookieless client). */
  public: 8_000,
  /** Cookie-bound client for request-scoped pages/routes and middleware. */
  request: 10_000,
  /** Service-role client default (agents, admin APIs, crons). */
  admin: 25_000,
  /** Fire-and-forget tracking endpoints (e.g. /api/pageview). */
  tracking: 4_000,
} as const;

/**
 * `next build` prerenders hundreds of pages with ~30 workers at once, which
 * makes the small Supabase instance answer slowly (a build failed on the 8s
 * page deadline, 2026-11-28). Runtime deadlines protect live requests; at
 * build time a slow answer is fine, so use a generous floor instead.
 */
export const BUILD_TIMEOUT_FLOOR_MS = 90_000;

export function effectiveTimeoutMs(
  timeoutMs: number,
  phase: string | undefined = process.env.NEXT_PHASE
): number {
  return phase === "phase-production-build"
    ? Math.max(timeoutMs, BUILD_TIMEOUT_FLOOR_MS)
    : timeoutMs;
}

/**
 * Wrap fetch so each request aborts after `timeoutMs`, while still honouring
 * any AbortSignal the caller (supabase-js) already passed.
 */
export function fetchWithTimeout(
  timeoutMs: number,
  baseFetch: typeof fetch = fetch
): typeof fetch {
  return (input, init) => {
    const timeoutSignal = AbortSignal.timeout(effectiveTimeoutMs(timeoutMs));
    const signal = init?.signal
      ? AbortSignal.any([init.signal, timeoutSignal])
      : timeoutSignal;
    return baseFetch(input, { ...init, signal });
  };
}

/** Thrown when Supabase could not be reached (timeout / network failure). */
export class SupabaseUnavailableError extends Error {
  constructor(context: string, cause?: string) {
    super(`Supabase unavailable (${context})${cause ? `: ${cause}` : ""}`);
    this.name = "SupabaseUnavailableError";
  }
}

/**
 * Short, non-sensitive reason from a PostgREST transport error, e.g.
 * "AbortError/TimeoutError" vs "TypeError: fetch failed" — enough to tell a
 * deadline from a connection failure in the logs. Never includes URLs/keys.
 */
export function transportReason(error: unknown): string | undefined {
  if (!error || typeof error !== "object") return undefined;
  const message = (error as { message?: unknown }).message;
  if (typeof message !== "string") return undefined;
  return message.replace(/https?:\/\/\S+/g, "<url>").slice(0, 120);
}

/**
 * PostgREST reports transport failures (abort, DNS, connection reset) as
 * `status: 0` instead of throwing. On ISR pages we must throw in that case:
 * a thrown render keeps the previously cached page, whereas rendering with
 * empty data would cache an empty page (or a 404) for the whole revalidate
 * window.
 */
export function throwIfUnavailable(
  result: { status?: number; error?: unknown } | null | undefined,
  context: string
): void {
  if (result && result.status === 0) {
    throw new SupabaseUnavailableError(context, transportReason(result.error));
  }
}

import { createClient } from "@supabase/supabase-js";
import { SUPABASE_TIMEOUT_MS, fetchWithTimeout } from "./timeout";

// Service role client - bypasses RLS
// ONLY use server-side for admin operations (lead insertion, data import)
//
// Every HTTP call is bounded (default 25s) so a stuck Supabase API cannot pin
// a function until the Vercel limit. Latency-sensitive callers (tracking,
// page renders) pass a shorter `timeoutMs`.
export function createAdminClient(options: { timeoutMs?: number } = {}) {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
      global: {
        fetch: fetchWithTimeout(options.timeoutMs ?? SUPABASE_TIMEOUT_MS.admin),
      },
    }
  );
}

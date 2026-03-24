import { createClient } from "@supabase/supabase-js";

// Service role client - bypasses RLS
// ONLY use server-side for admin operations (lead insertion, data import)
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}

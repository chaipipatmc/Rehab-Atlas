import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { requireEnv } from "./env";

let cached: SupabaseClient | null = null;

/** Service-role client — Lisa's tables are service-role only (RLS enabled, no policies). */
export function db(): SupabaseClient {
  if (!cached) {
    cached = createClient(requireEnv("SUPABASE_URL"), requireEnv("SUPABASE_SERVICE_ROLE_KEY"), {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return cached;
}

export async function getSetting(key: string): Promise<string | null> {
  const { data } = await db().from("lisa_settings").select("value").eq("key", key).maybeSingle();
  return data?.value ?? null;
}

export async function setSetting(key: string, value: string): Promise<void> {
  const { error } = await db()
    .from("lisa_settings")
    .upsert({ key, value, updated_at: new Date().toISOString() });
  if (error) throw new Error(`setSetting(${key}) failed: ${error.message}`);
}

/**
 * Environment variables used by Lisa.
 *
 * Required in production (Vercel project settings):
 * - LINE_CHANNEL_SECRET        LINE Messaging API channel secret (webhook signature)
 * - LINE_CHANNEL_ACCESS_TOKEN  Long-lived channel access token (push/reply)
 * - LINE_OWNER_USER_ID         Your LINE user ID — the only user Lisa talks to
 * - GOOGLE_CLIENT_ID           Google OAuth client (Web application)
 * - GOOGLE_CLIENT_SECRET
 * - LISA_BASE_URL              e.g. https://lisa-xxxx.vercel.app (for OAuth redirect)
 * - ANTHROPIC_API_KEY          Claude API key
 * - SUPABASE_URL               Supabase project URL
 * - SUPABASE_SERVICE_ROLE_KEY  Service role key (lisa_* tables)
 * - CRON_SECRET                Protects cron routes + OAuth bootstrap route
 *
 * Optional:
 * - LISA_CLAUDE_MODEL          default "claude-sonnet-5"
 */
export function env(name: string): string {
  return process.env[name] ?? "";
}

export function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required env var: ${name}`);
  return v;
}

export const CLAUDE_MODEL = process.env.LISA_CLAUDE_MODEL || "claude-sonnet-5";

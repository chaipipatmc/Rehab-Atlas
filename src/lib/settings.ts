import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Platform settings stored in `site_settings` under `platform_*` keys and
 * edited at /admin/settings. Helpers fail soft — missing table/keys fall back
 * to env vars / defaults so email delivery never breaks on a settings issue.
 */

export async function getPlatformSetting(key: string): Promise<string | null> {
  try {
    const admin = createAdminClient();
    const { data } = await admin
      .from("site_settings")
      .select("value")
      .eq("key", key)
      .maybeSingle();
    return data?.value != null ? String(data.value) : null;
  } catch {
    return null;
  }
}

/** Admin notification recipient — settings override env fallback. */
export async function getAdminEmail(): Promise<string> {
  return (
    (await getPlatformSetting("platform_admin_email")) ||
    process.env.ADMIN_EMAIL ||
    "chaipipat.mc@gmail.com"
  );
}

export type NotificationKind = "new_lead" | "partner_request" | "edit_request";

/** Notification toggles from /admin/settings — default ON when unset. */
export async function isNotificationEnabled(kind: NotificationKind): Promise<boolean> {
  const value = await getPlatformSetting(`platform_notification_${kind}`);
  return value === null ? true : value === "true";
}

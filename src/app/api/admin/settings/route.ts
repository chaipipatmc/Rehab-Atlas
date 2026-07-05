import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { validateOrigin } from "@/lib/csrf";

/**
 * Platform settings persisted in `site_settings` under `platform_*` keys.
 * Backs /admin/settings — previously that page's Save button did nothing.
 */

const ALLOWED_KEYS = [
  "platform_site_name",
  "platform_admin_email",
  "platform_notification_new_lead",
  "platform_notification_partner_request",
  "platform_notification_edit_request",
  "platform_whatsapp_number",
  "platform_default_currency",
  "platform_require_email_verification",
] as const;

async function verifyAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  return profile?.role === "admin" ? user : null;
}

export async function GET() {
  const user = await verifyAdmin();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("site_settings")
    .select("key, value")
    .like("key", "platform_%");

  if (error) {
    return NextResponse.json({ error: "Failed to load settings" }, { status: 500 });
  }

  const settings: Record<string, string> = {};
  for (const row of data || []) {
    settings[row.key as string] = String(row.value ?? "");
  }
  return NextResponse.json({ settings });
}

export async function PUT(request: Request) {
  const csrfError = validateOrigin(request);
  if (csrfError) return csrfError;

  const user = await verifyAdmin();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = (await request.json()) as { settings?: Record<string, unknown> };
    const incoming = body.settings || {};

    const rows = ALLOWED_KEYS.filter((key) => key in incoming).map((key) => ({
      key,
      value: String(incoming[key] ?? ""),
    }));

    if (rows.length === 0) {
      return NextResponse.json({ error: "No valid settings provided" }, { status: 400 });
    }

    const admin = createAdminClient();
    const { error } = await admin
      .from("site_settings")
      .upsert(rows, { onConflict: "key" });

    if (error) {
      console.error("Settings save failed:", error);
      return NextResponse.json({ error: "Failed to save settings" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}

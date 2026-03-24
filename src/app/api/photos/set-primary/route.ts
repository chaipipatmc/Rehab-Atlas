import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { validateOrigin } from "@/lib/csrf";

export async function POST(req: Request) {
  const csrfError = validateOrigin(req);
  if (csrfError) return csrfError;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { photoId, centerId } = await req.json();
  const admin = createAdminClient();

  // Verify ownership: admin can do anything; partners must own the center
  const { data: profile } = await supabase
    .from("profiles")
    .select("role, center_id")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") {
    const { data: photo } = await admin
      .from("center_photos")
      .select("center_id")
      .eq("id", photoId)
      .single();
    if (!photo || photo.center_id !== profile?.center_id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  // Reset all photos for this center
  await admin.from("center_photos").update({ is_primary: false }).eq("center_id", centerId);
  // Set the selected one as primary
  await admin.from("center_photos").update({ is_primary: true }).eq("id", photoId);

  return NextResponse.json({ success: true });
}

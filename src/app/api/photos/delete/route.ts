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

  const { photoId } = await req.json();
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

  // Fetch the photo URL before deleting so we can remove the storage object too
  const { data: photoRecord } = await admin
    .from("center_photos")
    .select("url")
    .eq("id", photoId)
    .single();

  await admin.from("center_photos").delete().eq("id", photoId);

  // Delete the actual file from Supabase Storage
  if (photoRecord?.url) {
    try {
      // Extract the storage path from the public URL.
      // URL format: .../storage/v1/object/public/center-photos/<path>
      const url = new URL(photoRecord.url);
      const segments = url.pathname.split("/center-photos/");
      if (segments.length > 1 && segments[1]) {
        await admin.storage.from("center-photos").remove([segments[1]]);
      }
    } catch {
      // Storage deletion failure is non-fatal — the DB record is already gone
    }
  }

  return NextResponse.json({ success: true });
}

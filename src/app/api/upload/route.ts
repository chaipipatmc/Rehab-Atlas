import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { randomUUID } from "crypto";
import { validateOrigin } from "@/lib/csrf";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const ALLOWED_EXTENSIONS = ["jpg", "jpeg", "png", "webp", "gif"];
const MAX_SIZE = 10 * 1024 * 1024; // 10MB
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(req: Request) {
  // CSRF check
  const csrfError = validateOrigin(req);
  if (csrfError) return csrfError;

  // Auth check with regular client
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, center_id")
    .eq("id", user.id)
    .single();

  if (!profile || (profile.role !== "admin" && profile.role !== "partner")) {
    return NextResponse.json({ error: "Not allowed" }, { status: 403 });
  }

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const centerId = formData.get("center_id") as string | null;
  const isStaffPhoto = formData.get("staff_photo") === "true";

  if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });

  // Validate center_id is a valid UUID when provided
  if (centerId && !UUID_REGEX.test(centerId)) {
    return NextResponse.json({ error: "Invalid center ID" }, { status: 400 });
  }

  // Validate file type
  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json(
      { error: `Invalid file type. Allowed: ${ALLOWED_TYPES.join(", ")}` },
      { status: 400 }
    );
  }

  // Validate file extension
  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    return NextResponse.json(
      { error: "Invalid file extension" },
      { status: 400 }
    );
  }

  // Validate file size
  if (file.size > MAX_SIZE) {
    return NextResponse.json(
      { error: "File too large. Maximum size is 10MB." },
      { status: 400 }
    );
  }

  // Partners can only upload to their own center
  if (profile.role === "partner" && centerId !== profile.center_id) {
    return NextResponse.json({ error: "Not your center" }, { status: 403 });
  }

  const folder = isStaffPhoto ? "staff" : "centers";
  const fileName = `${folder}/${centerId || "general"}/${randomUUID()}.${ext}`;

  const arrayBuffer = await file.arrayBuffer();
  const buffer = new Uint8Array(arrayBuffer);

  // Use admin client for storage upload (bypasses RLS)
  const admin = createAdminClient();

  const { error } = await admin.storage
    .from("center-photos")
    .upload(fileName, buffer, {
      contentType: file.type,
      upsert: false,
    });

  if (error) {
    console.error("Storage upload failed:", error);
    return NextResponse.json({ error: "Failed to upload file" }, { status: 500 });
  }

  const { data: urlData } = admin.storage
    .from("center-photos")
    .getPublicUrl(fileName);

  const url = urlData.publicUrl;

  // If not a staff photo, insert into center_photos table
  if (!isStaffPhoto && centerId) {
    // Check how many photos exist already
    const { count } = await admin
      .from("center_photos")
      .select("*", { count: "exact", head: true })
      .eq("center_id", centerId);

    const { data: photoRecord, error: insertErr } = await admin
      .from("center_photos")
      .insert({
        center_id: centerId,
        url,
        alt_text: file.name.replace(/\.[^.]+$/, ""),
        is_primary: (count || 0) === 0,
        sort_order: (count || 0),
      })
      .select()
      .single();

    if (insertErr) {
      console.error("Photo record insert failed:", insertErr);
      return NextResponse.json({ error: "Failed to save photo record" }, { status: 500 });
    }

    return NextResponse.json({ url, photo: photoRecord });
  }

  return NextResponse.json({ url });
}

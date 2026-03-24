import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { validateOrigin } from "@/lib/csrf";

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

// POST: Create a new center
export async function POST(request: Request) {
  const csrfError = validateOrigin(request);
  if (csrfError) return csrfError;

  const user = await verifyAdmin();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { center, photos } = await request.json();

    if (!center?.name || !center?.country) {
      return NextResponse.json({ error: "Name and country are required" }, { status: 400 });
    }

    const admin = createAdminClient();

    // Clean empty strings to null
    const cleanCenter = Object.fromEntries(
      Object.entries(center).map(([k, v]) => [k, v === "" ? null : v])
    );

    const { data, error } = await admin
      .from("centers")
      .insert(cleanCenter)
      .select("id")
      .single();

    if (error) {
      console.error("Center create failed:", error);
      return NextResponse.json({ error: "Failed to create center" }, { status: 500 });
    }

    // Insert photos if any
    if (photos && photos.length > 0) {
      const photoRows = photos.map((p: { url: string; alt_text?: string }, i: number) => ({
        center_id: data.id,
        url: p.url,
        alt_text: p.alt_text || null,
        sort_order: i,
        is_primary: i === 0,
      }));
      await admin.from("center_photos").insert(photoRows);
    }

    return NextResponse.json({ id: data.id });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// PUT: Update an existing center
export async function PUT(request: Request) {
  const csrfError = validateOrigin(request);
  if (csrfError) return csrfError;

  const user = await verifyAdmin();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { id, center, photos } = await request.json();

    if (!id) {
      return NextResponse.json({ error: "Center ID required" }, { status: 400 });
    }

    const admin = createAdminClient();

    // Clean empty strings to null
    const cleanCenter = Object.fromEntries(
      Object.entries(center).map(([k, v]) => [k, v === "" ? null : v])
    );
    // Remove fields that shouldn't be updated directly
    delete cleanCenter.id;
    delete cleanCenter.created_at;

    const { error } = await admin
      .from("centers")
      .update(cleanCenter)
      .eq("id", id);

    if (error) {
      console.error("Center update failed:", error);
      return NextResponse.json({ error: "Failed to update center" }, { status: 500 });
    }

    // Sync photos: delete existing, re-insert
    if (photos !== undefined) {
      await admin.from("center_photos").delete().eq("center_id", id);
      if (photos.length > 0) {
        const photoRows = photos.map((p: { url: string; alt_text?: string }, i: number) => ({
          center_id: id,
          url: p.url,
          alt_text: p.alt_text || null,
          sort_order: i,
          is_primary: i === 0,
        }));
        await admin.from("center_photos").insert(photoRows);
      }
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

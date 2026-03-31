import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { validateOrigin } from "@/lib/csrf";

export async function POST(request: Request) {
  const originError = validateOrigin(request);
  if (originError) return originError;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { center_id } = await request.json();
  if (!center_id) {
    return NextResponse.json(
      { error: "center_id required" },
      { status: 400 }
    );
  }

  // Verify the user has access to this center
  const { data: profile } = await supabase
    .from("profiles")
    .select("role, center_id, managed_center_ids")
    .eq("id", user.id)
    .single();

  if (!profile) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  const managedIds = (profile.managed_center_ids as string[]) || [];
  const hasAccess =
    profile.role === "admin" ||
    profile.center_id === center_id ||
    managedIds.includes(center_id);

  if (!hasAccess) {
    return NextResponse.json(
      { error: "No access to this center" },
      { status: 403 }
    );
  }

  // Update the active center_id
  const admin = createAdminClient();
  const { error } = await admin
    .from("profiles")
    .update({ center_id: center_id })
    .eq("id", user.id);

  if (error) {
    return NextResponse.json(
      { error: "Failed to switch center" },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true, center_id });
}

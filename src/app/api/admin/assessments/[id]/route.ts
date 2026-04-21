import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { validateOrigin } from "@/lib/csrf";

async function verifyAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  return profile?.role === "admin" ? user : null;
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const csrfError = validateOrigin(request);
  if (csrfError) return csrfError;

  const user = await verifyAdmin();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { id } = await params;
    const admin = createAdminClient();

    // Unlink any lead that references this assessment, then delete it.
    // We preserve the lead itself — only the assessment record is removed.
    await admin
      .from("leads")
      .update({ assessment_id: null })
      .eq("assessment_id", id);

    const { error } = await admin.from("assessments").delete().eq("id", id);

    if (error) {
      console.error("Assessment delete failed:", error);
      return NextResponse.json(
        { error: "Failed to delete assessment" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("Assessment delete error:", e);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

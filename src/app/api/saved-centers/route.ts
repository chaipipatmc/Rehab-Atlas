import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("saved_centers")
    .select("center_id")
    .eq("user_id", user.id);

  if (error) {
    console.error("Failed to fetch saved centers:", error);
    return NextResponse.json(
      { error: "Failed to fetch saved centers." },
      { status: 500 }
    );
  }

  return NextResponse.json({
    center_ids: (data || []).map((row: { center_id: string }) => row.center_id),
  });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { center_id } = body;

    if (!center_id || typeof center_id !== "string") {
      return NextResponse.json(
        { error: "center_id is required." },
        { status: 400 }
      );
    }

    // Check if already saved
    const { data: existing } = await supabase
      .from("saved_centers")
      .select("id")
      .eq("user_id", user.id)
      .eq("center_id", center_id)
      .single();

    if (existing) {
      // Unsave
      const { error: deleteError } = await supabase
        .from("saved_centers")
        .delete()
        .eq("id", existing.id);

      if (deleteError) {
        console.error("Failed to unsave center:", deleteError);
        return NextResponse.json(
          { error: "Failed to unsave center." },
          { status: 500 }
        );
      }

      return NextResponse.json({ saved: false });
    } else {
      // Save
      const { error: insertError } = await supabase
        .from("saved_centers")
        .insert({ user_id: user.id, center_id });

      if (insertError) {
        console.error("Failed to save center:", insertError);
        return NextResponse.json(
          { error: "Failed to save center." },
          { status: 500 }
        );
      }

      return NextResponse.json({ saved: true });
    }
  } catch {
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 }
    );
  }
}

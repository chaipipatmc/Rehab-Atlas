import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const supabaseAuth = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll: () => cookieStore.getAll() } }
    );
    const { data: { user } } = await supabaseAuth.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const supabase = createAdminClient();

    // Get user's center_id
    const { data: profile } = await supabase
      .from("profiles")
      .select("role, center_id, full_name")
      .eq("id", user.id)
      .single();

    if (!profile?.center_id) {
      return NextResponse.json({ articles: [], center_id: null, center_name: "", author_name: "" });
    }

    // Get center name
    const { data: center } = await supabase
      .from("centers")
      .select("name")
      .eq("id", profile.center_id)
      .single();

    // Get all articles for this center (including drafts)
    const { data: articles } = await supabase
      .from("pages")
      .select("id, title, slug, content, status, meta_description, created_at, published_at")
      .eq("author_center_id", profile.center_id)
      .eq("author_type", "partner")
      .order("created_at", { ascending: false });

    return NextResponse.json({
      articles: articles || [],
      center_id: profile.center_id,
      center_name: center?.name || "",
      author_name: profile.full_name || user.email || "",
    });
  } catch {
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

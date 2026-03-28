import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { sendBlogSubmissionNotification } from "@/lib/email/send";
import { validateOrigin } from "@/lib/csrf";

export async function POST(request: Request) {
  const originError = validateOrigin(request);
  if (originError) return originError;

  try {
    const body = await request.json();
    const { title, slug, content, meta_description, center_id, center_name, author_name, is_draft } = body;

    if (!title || !content || !center_id) {
      return NextResponse.json({ error: "Title, content, and center are required" }, { status: 400 });
    }

    // Verify the user is a partner
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

    // Use admin client to insert (bypasses RLS)
    const supabase = createAdminClient();

    // Verify user is partner for this center
    const { data: profile } = await supabase
      .from("profiles")
      .select("role, center_id")
      .eq("id", user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }
    // Admins can submit on behalf of any center; partners must own the center
    if (profile.role === "admin") {
      // allowed
    } else if (profile.role === "partner" && profile.center_id === center_id) {
      // allowed
    } else {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }

    // Insert as draft (pending admin review)
    const { error } = await supabase.from("pages").insert({
      title,
      slug: slug || title.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 100),
      content,
      page_type: "blog",
      status: "draft", // Always draft — admin must publish
      meta_title: title,
      meta_description: meta_description || null,
      author_type: "partner",
      author_name: author_name || null,
      author_center_id: center_id,
      submitted_by: user.id,
      created_by: user.id,
    });

    if (error) {
      console.error("Partner blog insert error:", error);
      return NextResponse.json({ error: "Failed to save article" }, { status: 500 });
    }

    // Send notification email only when submitting for review (not saving draft)
    if (!is_draft) {
      await sendBlogSubmissionNotification({
        authorName: author_name || user.email || "Partner",
        centerName: center_name || "Unknown Center",
        articleTitle: title,
      });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

export async function PATCH(request: Request) {
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

    const body = await request.json();
    const { id, title, slug, content, meta_description, status } = body;

    if (!id) {
      return NextResponse.json({ error: "Article ID required" }, { status: 400 });
    }

    const supabase = createAdminClient();

    // Get user's center_id
    const { data: profile } = await supabase
      .from("profiles")
      .select("role, center_id")
      .eq("id", user.id)
      .single();

    if (!profile?.center_id && profile?.role !== "admin") {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }

    // Verify article belongs to partner's center
    const { data: article } = await supabase
      .from("pages")
      .select("id, author_center_id, status")
      .eq("id", id)
      .single();

    if (!article) {
      return NextResponse.json({ error: "Article not found" }, { status: 404 });
    }

    // Partners can only edit their own center's articles
    if (profile.role !== "admin" && article.author_center_id !== profile.center_id) {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }

    // Build update payload
    const updates: Record<string, unknown> = {};
    if (title !== undefined) updates.title = title;
    if (slug !== undefined) updates.slug = slug;
    if (content !== undefined) updates.content = content;
    if (meta_description !== undefined) updates.meta_description = meta_description;

    // Partners can only set status to "draft" (unpublish) — never publish directly
    if (status !== undefined) {
      if (profile.role === "admin") {
        updates.status = status;
      } else {
        // Partners: can unpublish (published → draft), but can't publish
        updates.status = "draft";
      }
    }

    const { error } = await supabase
      .from("pages")
      .update(updates)
      .eq("id", id);

    if (error) {
      return NextResponse.json({ error: "Failed to update" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
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

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "Article ID required" }, { status: 400 });
    }

    const supabase = createAdminClient();

    // Verify ownership
    const { data: profile } = await supabase
      .from("profiles")
      .select("role, center_id")
      .eq("id", user.id)
      .single();

    const { data: article } = await supabase
      .from("pages")
      .select("id, author_center_id, status")
      .eq("id", id)
      .single();

    if (!article) {
      return NextResponse.json({ error: "Article not found" }, { status: 404 });
    }

    if (profile?.role !== "admin" && article.author_center_id !== profile?.center_id) {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }

    // Can only delete drafts
    if (article.status === "published" && profile?.role !== "admin") {
      return NextResponse.json({ error: "Cannot delete published articles. Unpublish first." }, { status: 400 });
    }

    const { error } = await supabase.from("pages").delete().eq("id", id);
    if (error) {
      return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

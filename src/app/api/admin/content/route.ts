import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { validateOrigin } from "@/lib/csrf";
import { verifyAdmin } from "@/lib/auth/verify-admin";

// POST: Create a new page/blog
export async function POST(request: Request) {
  const csrfError = validateOrigin(request);
  if (csrfError) return csrfError;

  const user = await verifyAdmin();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await request.json();

    if (!body.title) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }

    const admin = createAdminClient();

    const { data, error } = await admin
      .from("pages")
      .insert({
        title: body.title,
        slug: body.slug,
        content: body.content || "",
        page_type: body.page_type || "blog",
        status: body.status || "draft",
        meta_title: body.meta_title || body.title,
        meta_description: body.meta_description || "",
        published_at: body.published_at || null,
        author_type: "rehabatlas",
        created_by: user.id,
        ...(body.tags?.length ? { tags: body.tags } : {}),
      })
      .select("id")
      .single();

    if (error) {
      console.error("Content create failed:", error);
      return NextResponse.json({ error: "Failed to create content" }, { status: 500 });
    }

    return NextResponse.json({ id: data.id });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

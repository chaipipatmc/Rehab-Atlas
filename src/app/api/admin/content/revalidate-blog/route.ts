/**
 * Admin endpoint to flush ISR cache for blog routes. Needed after content
 * edits, dedup-merges (unpublished slugs need to start serving 301 instead
 * of their stale rendered HTML), or any other state changes that aren't
 * picked up automatically by the per-route `revalidate` window.
 *
 * POST /api/admin/content/revalidate-blog
 * Body (optional): { slugs?: string[] }
 *   - With slugs: revalidates each /blog/<slug> path individually.
 *   - Without slugs: revalidates /blog/[slug] layout + /blog list page,
 *     effectively flushing the entire blog section.
 */

import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  // Two ways to authenticate:
  // 1. Logged-in admin user (used from /admin/content button)
  // 2. CRON_SECRET in Authorization header (used by maintenance scripts /
  //    one-off flush requests after bulk DB edits like dedup cleanup)
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");
  const isCron = cronSecret && authHeader === `Bearer ${cronSecret}`;

  if (!isCron) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();
    if (profile?.role !== "admin") {
      return NextResponse.json({ error: "Admin only" }, { status: 403 });
    }
  }

  let body: { slugs?: string[] } = {};
  try {
    body = (await request.json()) as { slugs?: string[] };
  } catch {
    // empty body is fine — treat as full-flush
  }

  const slugs = Array.isArray(body.slugs) ? body.slugs.filter((s) => typeof s === "string") : [];

  if (slugs.length > 0) {
    for (const slug of slugs) {
      revalidatePath(`/blog/${slug}`);
    }
    revalidatePath("/blog");
    return NextResponse.json({ revalidated: slugs.length + 1, slugs });
  }

  // Full flush of /blog and the dynamic /blog/[slug] segment
  revalidatePath("/blog");
  revalidatePath("/blog/[slug]", "page");
  return NextResponse.json({ revalidated: "full", target: "/blog + /blog/[slug]" });
}

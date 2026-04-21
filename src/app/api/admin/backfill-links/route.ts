import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { autoLinkArticle } from "@/lib/agents/auto-linker";

/**
 * One-time backfill: inject internal links into existing blog articles.
 * POST /api/admin/backfill-links              — applies updates
 * POST /api/admin/backfill-links?dryRun=1     — returns preview only
 *
 * Idempotent: auto-linker skips existing links, so rerunning won't double-wrap.
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const dryRun = url.searchParams.get("dryRun") === "1";

  const admin = createAdminClient();
  const { data: articles } = await admin
    .from("pages")
    .select("id, slug, title, content")
    .eq("page_type", "blog");

  if (!articles?.length) {
    return NextResponse.json({ total: 0, updated: 0, dryRun });
  }

  let updated = 0;
  const report: Array<{
    id: string;
    slug: string;
    title: string;
    linksAdded: number;
    links: Array<{ type: string; href: string; anchor: string }>;
  }> = [];

  for (const article of articles) {
    const id = article.id as string;
    const slug = article.slug as string;
    const title = article.title as string;
    const content = (article.content as string) || "";
    if (!content.trim()) continue;

    const { content: linked, linksAdded } = await autoLinkArticle(content, {
      currentHref: `/blog/${slug}`,
    });

    if (linksAdded.length === 0 || linked === content) continue;

    report.push({ id, slug, title, linksAdded: linksAdded.length, links: linksAdded });

    if (!dryRun) {
      const { error } = await admin
        .from("pages")
        .update({ content: linked })
        .eq("id", id);
      if (!error) updated++;
    }
  }

  return NextResponse.json({
    total: articles.length,
    updated: dryRun ? 0 : updated,
    wouldUpdate: report.length,
    dryRun,
    report,
  });
}

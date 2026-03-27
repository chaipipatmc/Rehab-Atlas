/**
 * Content Scheduler Agent
 * Publishes 1 approved article per day at optimal SEO timing.
 *
 * Content pool: all pages with status='approved' (set by admin after review).
 * Includes both AI-generated editorial articles and partner-submitted blogs.
 *
 * Publishing strategy:
 * - 1 article per day, 7 days a week
 * - Publishes at 6 AM EST / 11 AM UTC / 6 PM Bangkok (peak US morning traffic)
 * - Picks articles based on: topic diversity, age in pool (FIFO with category rotation)
 * - Skips if no approved articles in pool
 */

import { createAdminClient } from "@/lib/supabase/admin";
import { logAgentAction } from "@/lib/agents/base";
import { isAgentEnabled } from "@/lib/agents/config";
import { sendAgentEmail } from "@/lib/agents/notify";

// Topic categories for rotation — avoid publishing similar topics back-to-back
const CATEGORY_KEYWORDS: Record<string, string[]> = {
  addiction: ["addiction", "substance", "alcohol", "drug", "opioid", "cocaine", "meth", "nicotine", "gambling"],
  treatment: ["treatment", "rehab", "inpatient", "outpatient", "detox", "therapy", "program", "medication"],
  mental_health: ["mental health", "depression", "anxiety", "ptsd", "dual diagnosis", "bipolar", "trauma", "stress"],
  recovery: ["recovery", "relapse", "sober", "sobriety", "aftercare", "support", "milestone"],
  guides: ["how to", "guide", "choose", "cost", "expect", "questions", "pack", "insurance"],
  destinations: ["thailand", "bali", "india", "canada", "australia", "abroad", "international"],
  family: ["family", "loved one", "intervention", "codepend", "children", "parent", "relationship"],
};

function categorizeArticle(title: string): string {
  const lower = title.toLowerCase();
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (keywords.some((kw) => lower.includes(kw))) return category;
  }
  return "general";
}

/**
 * Main function: publish 1 approved article from the pool.
 */
export async function publishFromPool(): Promise<boolean> {
  const enabled = await isAgentEnabled("content_scheduler");
  if (!enabled) return false;

  const admin = createAdminClient();

  // Get all approved articles waiting to be published
  const { data: pool } = await admin
    .from("pages")
    .select("id, title, slug, author_type, created_at")
    .eq("status", "approved")
    .eq("page_type", "blog")
    .order("created_at", { ascending: true });

  if (!pool || pool.length === 0) {
    console.log("Content Scheduler: no approved articles in pool");
    return false;
  }

  console.log(`Content Scheduler: ${pool.length} articles in pool`);

  // Check what was published recently to avoid same-category back-to-back
  const { data: recent } = await admin
    .from("pages")
    .select("title")
    .eq("status", "published")
    .eq("page_type", "blog")
    .order("published_at", { ascending: false })
    .limit(3);

  const recentCategories = (recent || []).map((p) => categorizeArticle(p.title as string));

  // Pick the best article: prefer different category from recent, then FIFO
  let picked = pool[0]; // Default: oldest in pool
  for (const article of pool) {
    const category = categorizeArticle(article.title as string);
    if (!recentCategories.includes(category)) {
      picked = article;
      break;
    }
  }

  // Publish it
  const now = new Date().toISOString();
  const { error } = await admin
    .from("pages")
    .update({
      status: "published",
      published_at: now,
    })
    .eq("id", picked.id);

  if (error) {
    console.error("Content Scheduler: publish failed:", error.message);
    return false;
  }

  const category = categorizeArticle(picked.title as string);
  const authorLabel = picked.author_type === "partner" ? "Partner article" : "Editorial";

  await logAgentAction({
    agent_type: "content_scheduler",
    action: "article_published",
    details: {
      page_id: picked.id,
      title: picked.title,
      slug: picked.slug,
      category,
      author_type: picked.author_type,
      pool_remaining: pool.length - 1,
    },
  });

  // Notify admin
  await sendAgentEmail({
    subject: `Published: "${picked.title}"`,
    agentLabel: "Content Scheduler",
    bodyHtml: `
      <h2>Article Published</h2>
      <table>
        <tr><td><strong>Title:</strong></td><td>${picked.title}</td></tr>
        <tr><td><strong>Type:</strong></td><td>${authorLabel}</td></tr>
        <tr><td><strong>Category:</strong></td><td>${category}</td></tr>
        <tr><td><strong>Pool remaining:</strong></td><td>${pool.length - 1} articles</td></tr>
      </table>
      <p style="margin-top:16px"><a href="${process.env.NEXT_PUBLIC_APP_URL || "https://rehab-atlas.com"}/blog/${picked.slug}" style="color:#45636b">View article →</a></p>
    `,
    actions: [],
  });

  console.log(`Content Scheduler: published "${picked.title}" (${category}, ${authorLabel}). Pool: ${pool.length - 1} remaining`);
  return true;
}

/**
 * Get pool statistics for the admin dashboard.
 */
export async function getPoolStats(): Promise<{
  totalInPool: number;
  byCategory: Record<string, number>;
  byAuthorType: Record<string, number>;
  oldestInPool: string | null;
  estimatedDaysOfContent: number;
}> {
  const admin = createAdminClient();

  const { data: pool } = await admin
    .from("pages")
    .select("title, author_type, created_at")
    .eq("status", "approved")
    .eq("page_type", "blog")
    .order("created_at", { ascending: true });

  const articles = pool || [];
  const byCategory: Record<string, number> = {};
  const byAuthorType: Record<string, number> = {};

  for (const a of articles) {
    const cat = categorizeArticle(a.title as string);
    byCategory[cat] = (byCategory[cat] || 0) + 1;
    const atype = (a.author_type as string) || "rehabatlas";
    byAuthorType[atype] = (byAuthorType[atype] || 0) + 1;
  }

  return {
    totalInPool: articles.length,
    byCategory,
    byAuthorType,
    oldestInPool: articles.length > 0 ? (articles[0].created_at as string) : null,
    estimatedDaysOfContent: articles.length, // 1 per day
  };
}

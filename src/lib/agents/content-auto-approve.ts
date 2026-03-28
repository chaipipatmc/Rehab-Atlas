/**
 * Content Auto-Approve Agent
 * Automatically approves draft articles that pass basic quality checks.
 * When enabled, drafts from the Content Creator go straight to the publishing pool.
 * When disabled, you review and approve manually at /admin/content.
 *
 * Quality checks:
 * - Word count >= 800
 * - Has featured image
 * - Has meta_title and meta_description
 * - Has at least 4 tags
 * - Title is reasonable length
 * - Content has proper heading structure (at least 2 H2s)
 */

import { createAdminClient } from "@/lib/supabase/admin";
import { logAgentAction } from "@/lib/agents/base";
import { isAgentEnabled } from "@/lib/agents/config";

interface QualityResult {
  passed: boolean;
  reasons: string[];
  wordCount: number;
}

function checkQuality(page: Record<string, unknown>): QualityResult {
  const reasons: string[] = [];
  const content = (page.content as string) || "";
  const title = (page.title as string) || "";
  const metaTitle = (page.meta_title as string) || "";
  const metaDesc = (page.meta_description as string) || "";
  const tags = (page.tags as string[]) || [];

  const wordCount = content.split(/\s+/).filter(Boolean).length;

  // Word count check
  if (wordCount < 800) reasons.push(`Too short: ${wordCount} words (min 800)`);

  // Featured image check
  if (!content.includes("![featured]")) reasons.push("No featured image");

  // Meta fields check
  if (!metaTitle || metaTitle.length < 10) reasons.push("Missing or too short meta_title");
  if (!metaDesc || metaDesc.length < 30) reasons.push("Missing or too short meta_description");

  // Tags check
  if (tags.length < 4) reasons.push(`Only ${tags.length} tags (min 4)`);

  // Title check
  if (title.length < 15) reasons.push("Title too short");
  if (title.length > 120) reasons.push("Title too long");

  // Heading structure check
  const h2Count = (content.match(/^## /gm) || []).length;
  if (h2Count < 2) reasons.push(`Only ${h2Count} H2 headings (min 2)`);

  return {
    passed: reasons.length === 0,
    reasons,
    wordCount,
  };
}

/**
 * Auto-approve all draft articles from Content Creator that pass quality checks.
 */
export async function autoApproveContent(): Promise<{ approved: number; skipped: number }> {
  const enabled = await isAgentEnabled("content_auto_approve");
  if (!enabled) return { approved: 0, skipped: 0 };

  const admin = createAdminClient();

  // Get all draft blog articles by RehabAtlas Editorial (not partner submissions)
  const { data: drafts } = await admin
    .from("pages")
    .select("*")
    .eq("page_type", "blog")
    .eq("status", "draft")
    .eq("author_type", "rehabatlas")
    .order("created_at", { ascending: true });

  if (!drafts?.length) return { approved: 0, skipped: 0 };

  let approved = 0;
  let skipped = 0;

  for (const draft of drafts) {
    const quality = checkQuality(draft as Record<string, unknown>);

    if (quality.passed) {
      // Auto-approve — move to publishing pool
      await admin
        .from("pages")
        .update({ status: "approved" })
        .eq("id", draft.id);

      approved++;

      await logAgentAction({
        agent_type: "content_auto_approve",
        action: "article_auto_approved",
        details: {
          page_id: draft.id,
          title: draft.title,
          word_count: quality.wordCount,
        },
      });
    } else {
      skipped++;

      await logAgentAction({
        agent_type: "content_auto_approve",
        action: "article_skipped",
        details: {
          page_id: draft.id,
          title: draft.title,
          reasons: quality.reasons,
        },
      });
    }
  }

  if (approved > 0) {
    console.log(`Content Auto-Approve: approved ${approved}, skipped ${skipped}`);
  }

  return { approved, skipped };
}

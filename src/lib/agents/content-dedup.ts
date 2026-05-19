/**
 * Content Dedup
 *
 * Two-tier duplicate detection for blog content:
 *
 *   Stage 1 — pg_trgm trigram similarity on title (cheap, every check)
 *   Stage 2 — Claude semantic judge (only when trigram suggests overlap)
 *
 * The three thresholds below split candidates into bands:
 *   trigram >= TRIGRAM_HARD_DUPLICATE  → definite duplicate, skip Claude
 *   trigram >= TRIGRAM_AMBIGUOUS       → ask Claude to judge
 *   trigram <  TRIGRAM_AMBIGUOUS       → clearly unique, skip Claude
 *
 * Used by content-planner (trigram-only — too expensive to invoke Claude per
 * topic at calendar-generation time), content-creator (full check before
 * saving draft, with auto-rewrite retry loop), and content-auto-approve
 * (final gate before promoting draft → approved).
 */

import { createAdminClient } from "@/lib/supabase/admin";
import { logClaudeUsage } from "@/lib/api-usage";

// Balanced thresholds — chosen so that the actual prior near-dup we found
// in the catalog (similarity 0.93) is flagged hard, while merely related
// articles (0.20-0.30 range) pass through.
export const TRIGRAM_HARD_DUPLICATE = 0.6;
export const TRIGRAM_AMBIGUOUS = 0.35;

export interface DedupCandidate {
  id: string;
  slug: string;
  title: string;
  meta_description: string | null;
  published_at: string | null;
  trigram_similarity: number;
}

export interface DedupResult {
  isDuplicate: boolean;
  closestMatch: DedupCandidate | null;
  reasoning: string;
  judgedByClaude: boolean;
  candidates: DedupCandidate[];
}

export interface DedupInput {
  title: string;
  meta_description?: string | null;
  /** Article body or, for cheap checks, just the first paragraph. */
  content?: string | null;
  /** Page id to exclude from candidates (so a draft doesn't match itself). */
  excludePageId?: string | null;
}

/**
 * Stage 1: pg_trgm. Returns top-N most similar published titles with scores.
 */
export async function findSimilarPublishedTitles(
  title: string,
  excludePageId?: string | null,
  limit = 5,
): Promise<DedupCandidate[]> {
  const admin = createAdminClient();
  const { data, error } = await admin.rpc("find_similar_published_titles", {
    query_title: title,
    max_results: limit,
    exclude_id: excludePageId ?? null,
  });
  if (error) {
    console.error("[dedup] RPC find_similar_published_titles failed:", error.message);
    return [];
  }
  return (data ?? []) as DedupCandidate[];
}

/**
 * Trigram-only check. Used by the planner where we only have a topic string
 * and don't want to pay Claude per candidate topic.
 */
export async function checkDuplicateByTitle(
  title: string,
  excludePageId?: string | null,
): Promise<DedupResult> {
  const candidates = await findSimilarPublishedTitles(title, excludePageId);
  const closest = candidates[0] ?? null;
  const topScore = closest?.trigram_similarity ?? 0;

  if (topScore >= TRIGRAM_HARD_DUPLICATE) {
    return {
      isDuplicate: true,
      closestMatch: closest,
      reasoning: `Title is ${(topScore * 100).toFixed(0)}% trigram-similar to "${closest!.title}"`,
      judgedByClaude: false,
      candidates,
    };
  }

  return {
    isDuplicate: false,
    closestMatch: closest,
    reasoning: topScore >= TRIGRAM_AMBIGUOUS
      ? `Top trigram match ${(topScore * 100).toFixed(0)}% — not high enough for hard dup (planner skips Claude judge)`
      : `No close trigram matches (top ${(topScore * 100).toFixed(0)}%)`,
    judgedByClaude: false,
    candidates,
  };
}

/**
 * Full check (Stage 1 + Stage 2). When trigram lands in the ambiguous band,
 * we send the new article's title + meta + first paragraph alongside the top
 * candidates to Claude, who returns a semantic verdict.
 */
export async function checkDuplicate(input: DedupInput): Promise<DedupResult> {
  const candidates = await findSimilarPublishedTitles(input.title, input.excludePageId);
  const closest = candidates[0] ?? null;
  const topScore = closest?.trigram_similarity ?? 0;

  // Definite duplicate — title is almost identical to an existing one. Skip Claude.
  if (topScore >= TRIGRAM_HARD_DUPLICATE) {
    return {
      isDuplicate: true,
      closestMatch: closest,
      reasoning: `Trigram similarity ${(topScore * 100).toFixed(0)}% with "${closest!.title}" — flagged without semantic check (above hard-dup threshold)`,
      judgedByClaude: false,
      candidates,
    };
  }

  // Clearly unique — no candidate is close enough to bother asking Claude.
  if (topScore < TRIGRAM_AMBIGUOUS) {
    return {
      isDuplicate: false,
      closestMatch: closest,
      reasoning: `Top trigram match only ${(topScore * 100).toFixed(0)}% — no semantic check needed`,
      judgedByClaude: false,
      candidates,
    };
  }

  // Ambiguous band — let Claude judge.
  if (!process.env.ANTHROPIC_API_KEY) {
    // Without Claude we can't tell — default to "not duplicate" but record the
    // ambiguity so admin sees it.
    return {
      isDuplicate: false,
      closestMatch: closest,
      reasoning: `Top trigram ${(topScore * 100).toFixed(0)}% (ambiguous); ANTHROPIC_API_KEY not set so semantic check was skipped`,
      judgedByClaude: false,
      candidates,
    };
  }

  return await judgeWithClaude(input, candidates);
}

async function judgeWithClaude(
  input: DedupInput,
  candidates: DedupCandidate[],
): Promise<DedupResult> {
  const Anthropic = (await import("@anthropic-ai/sdk")).default;
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

  // Take only the first paragraph of the new article — enough to capture
  // the angle, cheap on tokens.
  const firstParagraph = (input.content ?? "")
    .replace(/!\[[^\]]*\]\([^)]+\)/g, "") // strip images
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .find((p) => p && !p.startsWith("#") && !p.startsWith("![")) ?? "";

  const candidatesBlock = candidates
    .slice(0, 5)
    .map(
      (c, i) =>
        `${i + 1}. slug="${c.slug}" (trigram=${c.trigram_similarity.toFixed(2)})\n` +
        `   Title: ${c.title}\n` +
        `   Meta: ${c.meta_description ?? "(none)"}`,
    )
    .join("\n");

  const userPrompt = `New draft article:
Title: ${input.title}
Meta description: ${input.meta_description ?? "(none)"}
Opening paragraph: ${firstParagraph.slice(0, 800) || "(empty)"}

Existing published articles that share trigram overlap with the new title:
${candidatesBlock}

Question: Does the new draft duplicate or substantially overlap the angle of any existing article above?

A duplicate covers the same topic from the same angle — even if the words differ. Different angles on the same broad topic (e.g., "Alcohol Detox: Medical Process" vs "Alcohol Detox: A Family's Guide to Supporting a Loved One") are NOT duplicates.

Return strict JSON only, no markdown, no prose:
{
  "is_duplicate": boolean,
  "closest_match_slug": "slug-of-most-similar-existing OR null",
  "reasoning": "one sentence explaining the verdict"
}`;

  try {
    const response = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 300,
      system:
        "You are an editorial duplicate-content judge for a rehab marketplace. You compare a draft article against existing published articles and return a strict JSON verdict on whether the draft substantially duplicates an existing one. You are decisive — borderline cases lean toward 'not duplicate' unless the angle clearly overlaps.",
      messages: [{ role: "user", content: userPrompt }],
    });

    await logClaudeUsage(
      response,
      "content_dedup",
      "duplicate_judge",
      "claude-haiku-4-5-20251001",
      { title: input.title, candidate_count: candidates.length },
    );

    const text = response.content[0].type === "text" ? response.content[0].text : "";
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) {
      return {
        isDuplicate: false,
        closestMatch: candidates[0] ?? null,
        reasoning: `Claude returned non-JSON response — defaulting to not-duplicate`,
        judgedByClaude: true,
        candidates,
      };
    }

    const verdict = JSON.parse(match[0]) as {
      is_duplicate: boolean;
      closest_match_slug: string | null;
      reasoning: string;
    };

    const closestMatch =
      candidates.find((c) => c.slug === verdict.closest_match_slug) ??
      candidates[0] ??
      null;

    return {
      isDuplicate: Boolean(verdict.is_duplicate),
      closestMatch,
      reasoning: verdict.reasoning || "(no reasoning provided)",
      judgedByClaude: true,
      candidates,
    };
  } catch (err) {
    console.error("[dedup] Claude judge failed:", err);
    return {
      isDuplicate: false,
      closestMatch: candidates[0] ?? null,
      reasoning: `Claude judge errored (${String(err).slice(0, 100)}) — defaulting to not-duplicate`,
      judgedByClaude: false,
      candidates,
    };
  }
}

/**
 * Persist a dedup verdict onto a page row. Called by content-creator after
 * the draft is saved (or by content-auto-approve when re-checking before
 * publishing).
 */
export async function persistDedupVerdict(
  pageId: string,
  result: DedupResult,
  retryCount: number,
): Promise<void> {
  const admin = createAdminClient();
  await admin
    .from("pages")
    .update({
      dedup_status: result.isDuplicate ? "flagged" : "clear",
      dedup_closest_slug: result.closestMatch?.slug ?? null,
      dedup_reasoning: result.reasoning,
      dedup_retry_count: retryCount,
      dedup_checked_at: new Date().toISOString(),
    })
    .eq("id", pageId);
}

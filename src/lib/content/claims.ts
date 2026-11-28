/**
 * Claim checks for Rehab-Atlas editorial content and site copy.
 *
 * Rehab-Atlas articles are not reviewed by licensed clinicians, so neither
 * site copy nor articles may claim clinical review (content audit
 * 2026-11-28). Statistics must cite an external source.
 *
 * Used by content-auto-approve (failing drafts stay in the human queue) and
 * by tests/clinical-claims.test.ts (keeps these phrases out of src/).
 * Centers' own staff ("Clinical Team" section of a center profile) is a
 * different thing and is not matched by these patterns.
 */

export const CLINICAL_CLAIM_PATTERNS: readonly RegExp[] = [
  /\breviewed by (?:a |our |licensed |qualified |board[- ]certified )*(?:clinicians?|clinical|doctors?|physicians?|medical|psychiatrists?)\b/i,
  /\bmedically reviewed\b/i,
  /\bclinically reviewed\b/i,
  /\bclinical review team\b/i,
  /\blicensed clinical reviewers?\b/i,
  /\bour clinical team\b/i,
];

export function findClinicalClaims(text: string): string[] {
  const hits: string[] = [];
  for (const re of CLINICAL_CLAIM_PATTERNS) {
    const m = text.match(re);
    if (m) hits.push(m[0]);
  }
  return hits;
}

const PLACEHOLDER_DOMAIN = /\b(?:https?:\/\/)?(?:www\.)?example\.(?:com|org|net)\b/i;
const PERCENT = /\d+(?:\.\d+)?\s?%/;
// Markdown link (not an image) to an absolute http(s) URL.
const EXTERNAL_LINK = /(?<!!)\[[^\]]+\]\((https?:\/\/[^)\s]+)\)/g;

function hasExternalSource(paragraph: string, ownHosts: readonly string[]): boolean {
  for (const m of paragraph.matchAll(EXTERNAL_LINK)) {
    try {
      const host = new URL(m[1]).hostname.replace(/^www\./, "").toLowerCase();
      if (PLACEHOLDER_DOMAIN.test(host)) continue;
      if (ownHosts.some((h) => host === h || host.endsWith(`.${h}`))) continue;
      return true;
    } catch {
      // ignore malformed URL
    }
  }
  return false;
}

/**
 * Reasons an article must not be auto-approved on sourcing/claim grounds.
 * Empty array = no issue found.
 */
export function contentClaimIssues(
  content: string,
  ownHosts: readonly string[] = ["rehab-atlas.com"]
): string[] {
  const reasons: string[] = [];

  const claims = findClinicalClaims(content);
  if (claims.length > 0) {
    reasons.push(`Claims clinical review ("${claims[0]}") — not allowed`);
  }

  if (PLACEHOLDER_DOMAIN.test(content)) {
    reasons.push("Contains an example.com placeholder link/source");
  }

  // Image markdown is neither a figure nor a source.
  const paragraphs = content
    .split(/\n\s*\n/)
    .map((p) => p.replace(/!\[[^\]]*\]\([^)]*\)/g, ""));
  const unsourced = paragraphs.filter(
    (p) => PERCENT.test(p) && !hasExternalSource(p, ownHosts)
  ).length;
  if (unsourced > 0) {
    reasons.push(
      `${unsourced} paragraph(s) with a % figure but no external source link in the same paragraph`
    );
  }

  return reasons;
}

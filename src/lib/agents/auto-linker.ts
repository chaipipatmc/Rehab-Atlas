/**
 * Auto-Linker
 *
 * Post-processes article markdown to insert internal links to:
 *   - /rehab/[condition] — topic/condition hub pages
 *   - /rehab-in/[country] — country landing pages
 *
 * Strengthens SEO via topic clusters + country hubs without diluting with
 * over-linking. Only links the first occurrence of each target, caps total
 * links, and skips existing links, images, headings, and code blocks.
 */

import { createAdminClient } from "@/lib/supabase/admin";
import { countryToSlug } from "@/lib/utils";

export interface LinkInserted {
  type: "country" | "condition";
  href: string;
  anchor: string;
}

interface LinkTarget {
  type: "country" | "condition";
  href: string;
  patterns: RegExp[];
}

// Condition targets mirror the slugs defined in src/app/rehab/[condition]/page.tsx.
// Patterns cover the phrasing most likely to appear in rehab/mental-health writing.
const CONDITION_TARGETS: LinkTarget[] = [
  {
    type: "condition",
    href: "/rehab/alcohol-addiction",
    patterns: [
      /\balcohol addiction\b/i,
      /\balcohol use disorder\b/i,
      /\balcohol dependency\b/i,
      /\balcoholism\b/i,
    ],
  },
  {
    type: "condition",
    href: "/rehab/drug-addiction",
    patterns: [
      /\bdrug addiction\b/i,
      /\bdrug dependency\b/i,
      /\bsubstance use disorder\b/i,
    ],
  },
  {
    type: "condition",
    href: "/rehab/opioid-addiction",
    patterns: [
      /\bopioid addiction\b/i,
      /\bopioid crisis\b/i,
      /\bopioid use disorder\b/i,
      /\bheroin addiction\b/i,
    ],
  },
  {
    type: "condition",
    href: "/rehab/dual-diagnosis",
    patterns: [
      /\bdual diagnosis\b/i,
      /\bco-occurring disorders?\b/i,
      /\bco-occurring conditions?\b/i,
    ],
  },
  {
    type: "condition",
    href: "/rehab/mental-health",
    patterns: [
      /\bmental health treatment\b/i,
      /\bmental health conditions?\b/i,
      /\bmental health disorders?\b/i,
    ],
  },
  {
    type: "condition",
    href: "/rehab/gambling-addiction",
    patterns: [
      /\bgambling addiction\b/i,
      /\bproblem gambling\b/i,
      /\bcompulsive gambling\b/i,
    ],
  },
  {
    type: "condition",
    href: "/rehab/prescription-drug-abuse",
    patterns: [
      /\bprescription drug (?:abuse|addiction|dependency)\b/i,
      /\bpainkiller addiction\b/i,
    ],
  },
  {
    type: "condition",
    href: "/rehab/eating-disorders",
    patterns: [
      /\beating disorders?\b/i,
      /\banorexia nervosa\b/i,
      /\bbulimia nervosa\b/i,
    ],
  },
  {
    type: "condition",
    href: "/rehab/trauma-ptsd",
    patterns: [
      /\bPTSD\b/,
      /\bpost-traumatic stress (?:disorder)?\b/i,
      /\btrauma therapy\b/i,
    ],
  },
  {
    type: "condition",
    href: "/rehab/behavioral-addiction",
    patterns: [
      /\bbehavioral addictions?\b/i,
      /\bprocess addictions?\b/i,
    ],
  },
];

// Maximum internal links to insert per article. Prevents link spam.
const MAX_LINKS_PER_ARTICLE = 6;

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Pull published country names from the centers table and turn them into
 * link targets pointing at /rehab-in/[slug].
 */
async function getCountryTargets(): Promise<LinkTarget[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("centers")
    .select("country")
    .eq("status", "published")
    .not("country", "is", null);

  const countries = new Set<string>();
  for (const row of data ?? []) {
    const c = (row as { country?: unknown }).country;
    if (typeof c === "string" && c.trim()) countries.add(c.trim());
  }

  return Array.from(countries).map((name) => ({
    type: "country" as const,
    href: `/rehab-in/${countryToSlug(name)}`,
    patterns: [new RegExp(`\\b${escapeRegex(name)}\\b`, "i")],
  }));
}

/**
 * Find char ranges inside markdown where we must NOT insert links:
 * existing links, images, code fences, inline code, headings.
 */
function getSkipRanges(text: string): Array<[number, number]> {
  const ranges: Array<[number, number]> = [];
  const add = (re: RegExp) => {
    let m: RegExpExecArray | null;
    const g = new RegExp(re.source, re.flags.includes("g") ? re.flags : re.flags + "g");
    while ((m = g.exec(text)) !== null) {
      ranges.push([m.index, m.index + m[0].length]);
      if (m[0].length === 0) g.lastIndex++;
    }
  };
  add(/!?\[[^\]]*\]\([^)]*\)/g); // markdown links + images
  add(/```[\s\S]*?```/g); // fenced code blocks
  add(/`[^`\n]+`/g); // inline code
  add(/^#{1,6}\s.*$/gm); // ATX headings
  return ranges;
}

function replaceFirstOutsideSkipRanges(
  text: string,
  pattern: RegExp,
  skipRanges: Array<[number, number]>,
  replacement: (match: string) => string,
): { text: string; replaced: boolean; matched?: string } {
  const flags = pattern.flags.includes("g") ? pattern.flags : pattern.flags + "g";
  const re = new RegExp(pattern.source, flags);
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const start = m.index;
    const end = start + m[0].length;
    const inSkip = skipRanges.some(([a, b]) => start < b && end > a);
    if (!inSkip) {
      const newText = text.slice(0, start) + replacement(m[0]) + text.slice(end);
      return { text: newText, replaced: true, matched: m[0] };
    }
    if (m[0].length === 0) re.lastIndex++;
  }
  return { text, replaced: false };
}

/**
 * Insert internal links to condition + country landing pages into article
 * markdown. Only the first occurrence of each target is linked, and links
 * are capped at MAX_LINKS_PER_ARTICLE.
 *
 * Pass the article's own href in opts.currentHref to avoid self-linking.
 */
export async function autoLinkArticle(
  content: string,
  opts: { currentHref?: string } = {},
): Promise<{ content: string; linksAdded: LinkInserted[] }> {
  const countryTargets = await getCountryTargets();
  const targets = [...CONDITION_TARGETS, ...countryTargets].filter(
    (t) => t.href !== opts.currentHref,
  );

  let working = content;
  const linksAdded: LinkInserted[] = [];

  for (const target of targets) {
    if (linksAdded.length >= MAX_LINKS_PER_ARTICLE) break;

    // Recompute skip ranges after every successful insertion so the newly
    // inserted link is treated as off-limits for subsequent targets.
    const skipRanges = getSkipRanges(working);

    for (const pattern of target.patterns) {
      const outcome = replaceFirstOutsideSkipRanges(
        working,
        pattern,
        skipRanges,
        (match) => `[${match}](${target.href})`,
      );
      if (outcome.replaced) {
        working = outcome.text;
        linksAdded.push({
          type: target.type,
          href: target.href,
          anchor: outcome.matched ?? "",
        });
        break;
      }
    }
  }

  return { content: working, linksAdded };
}

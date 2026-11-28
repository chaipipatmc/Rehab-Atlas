import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";
import { contentClaimIssues, findClinicalClaims } from "@/lib/content/claims";
import { isSitemapExcluded } from "@/lib/seo/sitemap-exclusions";

const SRC = join(__dirname, "..", "src");
// The pattern list itself is the only allowed place for these phrases.
const ALLOW = new Set(["lib/content/claims.ts"]);

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) return walk(p);
    return /\.(tsx?|mjs|js)$/.test(name) ? [p] : [];
  });
}

describe("no clinical-review claims in site code/copy", () => {
  it("src/ does not claim review by clinicians or a clinical team", () => {
    const offenders: string[] = [];
    for (const file of walk(SRC)) {
      const rel = relative(SRC, file);
      if (ALLOW.has(rel)) continue;
      const hits = findClinicalClaims(readFileSync(file, "utf8"));
      if (hits.length) offenders.push(`${rel}: ${hits.join(", ")}`);
    }
    // Fix the copy (e.g. "Rehab-Atlas team", "editorial team"). Rehab-Atlas
    // has no clinical reviewers; a center's own "Clinical Team" (staff) is fine.
    expect(offenders).toEqual([]);
  });

  it("does not flag a center's own staff section", () => {
    expect(findClinicalClaims("Clinical Team")).toEqual([]);
    expect(findClinicalClaims("Professional clinical teams with international experience")).toEqual([]);
  });
});

describe("contentClaimIssues (auto-approve gate)", () => {
  it("passes a % figure with an external source in the same paragraph", () => {
    const md = "About 10% of adults are affected ([NIDA](https://nida.nih.gov/research)).";
    expect(contentClaimIssues(md)).toEqual([]);
  });

  it("flags % figures without an external source", () => {
    const md = "Completion rates reach 85% here.\n\nNo numbers here.";
    expect(contentClaimIssues(md).join(" ")).toMatch(/1 paragraph/);
  });

  it("does not accept an image or our own site as the source", () => {
    const md = "![chart](https://images.unsplash.com/x.jpg) 40% better [see](https://rehab-atlas.com/blog/x)";
    expect(contentClaimIssues(md).join(" ")).toMatch(/% figure/);
  });

  it("flags example.com sources", () => {
    const md = "Research shows a 20% drop ([study](https://example.com/study)).";
    const reasons = contentClaimIssues(md).join(" ");
    expect(reasons).toMatch(/example\.com/);
    expect(reasons).toMatch(/% figure/);
  });

  it("flags claims of clinical review", () => {
    expect(contentClaimIssues("This article was medically reviewed.").join(" ")).toMatch(/clinical review/);
    expect(contentClaimIssues("Reviewed by licensed clinicians.").join(" ")).toMatch(/clinical review/);
  });
});

describe("sitemap exclusions", () => {
  it("drops audited soft-404 URLs only", () => {
    expect(isSitemapExcluded("https://rehab-atlas.com/rehab-in/canada/edmonton")).toBe(true);
    expect(isSitemapExcluded("https://rehab-atlas.com/rehab-in/canada")).toBe(false);
    expect(isSitemapExcluded("https://rehab-atlas.com/rehab-in/thailand/chiang-mai/alcohol-addiction")).toBe(false);
  });
});

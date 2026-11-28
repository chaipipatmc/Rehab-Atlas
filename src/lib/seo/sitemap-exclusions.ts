/**
 * Paths that must not appear in sitemap.xml even though the generator would
 * emit them. Source: content audit 2026-11-28 (soft 404s — the page answers
 * 200 + noindex "Not Found" — found by opening every sitemap URL).
 *
 * Deliberately an explicit list: the audit items that involve Chiang Mai /
 * The Hills are a board decision and are NOT listed here.
 * The underlying mismatch between the sitemap's city logic and the page's
 * resolveLocation() is still to be fixed separately.
 */
export const SITEMAP_EXCLUDED_PATHS: ReadonlySet<string> = new Set([
  "/rehab-in/belgium/antwerp",
  "/rehab-in/canada/edmonton",
  "/rehab-in/mexico/tepoztlan",
  "/rehab-in/united-arab-emirates/dubai",
  "/rehab-in/bali/uluwatu/dual-diagnosis",
  "/rehab-in/india/mumbai/mental-health",
  "/rehab-in/thailand/khao-yai/trauma-ptsd",
  "/rehab-in/united-kingdom/delamere/drug-addiction",
]);

export function isSitemapExcluded(url: string): boolean {
  try {
    return SITEMAP_EXCLUDED_PATHS.has(new URL(url).pathname.replace(/\/$/, ""));
  } catch {
    return false;
  }
}

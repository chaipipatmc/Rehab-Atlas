/**
 * Canonical site origin for absolute URLs (canonicals, OG, JSON-LD, sitemap).
 * Single source of truth — do not hardcode rehab-atlas.com / vercel.app
 * fallbacks in individual pages.
 */
export const BASE_URL = (
  process.env.NEXT_PUBLIC_APP_URL || "https://rehab-atlas.com"
).trim().replace(/\/$/, "");

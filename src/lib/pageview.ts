/**
 * Pure helpers for /api/pageview (kept separate so they are unit-tested).
 *
 * Aggregate counts only: no names, emails, IPs or free text are stored.
 */

/**
 * Basic bot/automation filter on the user agent. Not a security control —
 * it just keeps crawlers, uptime checks and scripted clients out of the
 * visit counts. An empty UA is treated as a bot (real browsers always send one).
 */
const BOT_UA =
  /bot\b|bot\/|crawl|spider|slurp|scrap|headless|phantomjs|puppeteer|playwright|selenium|lighthouse|pagespeed|chrome-lighthouse|ptst|gtmetrix|pingdom|uptime|statuscake|monitor|facebookexternalhit|meta-externalagent|mediapartners|adsbot|googleother|google-inspectiontool|bingpreview|yandex|baiduspider|duckduckbot|applebot|semrush|ahrefs|mj12|dotbot|petalbot|bytespider|amazonbot|gptbot|chatgpt-user|oai-searchbot|claudebot|claude-web|anthropic-ai|perplexitybot|ccbot|cohere-ai|diffbot|curl\/|wget\/|python-requests|python-urllib|aiohttp|httpx|go-http-client|node-fetch|axios\/|undici|okhttp|java\/|libwww|httpclient|postmanruntime|insomnia/i;

export function isBotUserAgent(ua: string | null | undefined): boolean {
  const value = (ua ?? "").trim();
  if (!value) return true;
  return BOT_UA.test(value);
}

/**
 * Hosts that count as "our own site". A referrer from any of these is
 * internal navigation, never an acquisition source.
 */
export function isOwnHost(host: string, siteHosts: readonly string[]): boolean {
  const h = host.toLowerCase().replace(/^www\./, "");
  return siteHosts.some((s) => s.toLowerCase().replace(/^www\./, "") === h);
}

/**
 * Resolve the entry referrer for a page view.
 *
 * The client sends the referrer captured on the first page of the session
 * ("" when the visitor arrived directly). We must NOT fall back to the HTTP
 * Referer header: for this same-origin POST it is always our own page, which
 * turned every direct visit into an "internal" one. Returns null for direct
 * traffic and for self-referrals.
 */
export function resolveEntryReferrer(
  clientReferrer: unknown,
  siteHosts: readonly string[]
): string | null {
  if (typeof clientReferrer !== "string") return null;
  const value = clientReferrer.trim();
  if (!value) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    if (isOwnHost(url.hostname, siteHosts)) return null;
  } catch {
    return null;
  }
  return value.slice(0, 500);
}

/** Funnel events accepted by /api/pageview (counts only). */
export const TRACKED_EVENTS = [
  "cta_assessment_click",
  "assessment_step1_start",
] as const;
export type TrackedEvent = (typeof TRACKED_EVENTS)[number];

export function parseTrackedEvent(value: unknown): TrackedEvent | null {
  return typeof value === "string" &&
    (TRACKED_EVENTS as readonly string[]).includes(value)
    ? (value as TrackedEvent)
    : null;
}

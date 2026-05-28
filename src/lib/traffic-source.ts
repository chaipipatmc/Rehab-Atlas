// Traffic attribution captured on the first page hit and stashed in
// sessionStorage so the assessment payload can attribute conversions back to
// the channel that brought the visitor in. Lives client-side only.

export type AssessmentSource = {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
  referrer?: string;
  landing_path?: string;
  channel?:
    | "direct"
    | "organic_search"
    | "ai_referral"
    | "internal_blog"
    | "external_referral"
    | "paid"
    | "social"
    | "email"
    | "other";
};

const KEY = "ra_assessment_source";

// Domains we treat as AI referrers. ChatGPT, Claude, Perplexity, Gemini,
// Copilot, You.com all increasingly send traffic to citation sources.
const AI_DOMAINS = [
  "chat.openai.com",
  "chatgpt.com",
  "claude.ai",
  "perplexity.ai",
  "www.perplexity.ai",
  "gemini.google.com",
  "bard.google.com",
  "copilot.microsoft.com",
  "you.com",
  "phind.com",
];

const SEARCH_DOMAINS = [
  "google.",
  "bing.com",
  "duckduckgo.com",
  "yahoo.com",
  "yandex.",
  "baidu.com",
  "ecosia.org",
  "brave.com",
];

const SOCIAL_DOMAINS = [
  "facebook.com",
  "instagram.com",
  "twitter.com",
  "x.com",
  "t.co",
  "linkedin.com",
  "lnkd.in",
  "reddit.com",
  "youtube.com",
  "tiktok.com",
  "pinterest.com",
];

function classifyChannel(
  utm_medium: string | undefined,
  referrer: string,
): AssessmentSource["channel"] {
  if (utm_medium) {
    if (/cpc|ppc|paid|ads?$/i.test(utm_medium)) return "paid";
    if (/social/i.test(utm_medium)) return "social";
    if (/email|newsletter/i.test(utm_medium)) return "email";
    if (/article_cta|blog/i.test(utm_medium)) return "internal_blog";
  }
  if (!referrer) return "direct";
  let host = "";
  try {
    host = new URL(referrer).hostname.toLowerCase();
  } catch {
    return "other";
  }
  if (AI_DOMAINS.some((d) => host === d || host.endsWith(`.${d}`))) return "ai_referral";
  if (SEARCH_DOMAINS.some((d) => host.includes(d))) return "organic_search";
  if (SOCIAL_DOMAINS.some((d) => host === d || host.endsWith(`.${d}`))) return "social";
  // Same-origin referrer means the visitor hopped over from another page on
  // our own site — that's not a true acquisition source.
  if (typeof window !== "undefined" && host === window.location.hostname) {
    return "internal_blog";
  }
  return "external_referral";
}

/**
 * Capture and persist traffic source for the current session. Idempotent:
 * the first capture wins (so a user who lands on /blog/foo and later opens
 * /assessment still gets attributed to the original referrer, not the
 * internal hop). Safe to call from anywhere — no-ops server-side.
 */
export function captureTrafficSource(): AssessmentSource | null {
  if (typeof window === "undefined") return null;

  // First capture wins — don't overwrite if we already have one this session.
  const existing = sessionStorage.getItem(KEY);
  if (existing) {
    try {
      return JSON.parse(existing) as AssessmentSource;
    } catch {
      // Corrupted, fall through and recapture
    }
  }

  const params = new URLSearchParams(window.location.search);
  const utm_source = params.get("utm_source") || undefined;
  const utm_medium = params.get("utm_medium") || undefined;
  const utm_campaign = params.get("utm_campaign") || undefined;
  const utm_content = params.get("utm_content") || undefined;
  const utm_term = params.get("utm_term") || undefined;
  const referrer = document.referrer || "";
  const landing_path = window.location.pathname + window.location.search;
  const channel = classifyChannel(utm_medium, referrer);

  const captured: AssessmentSource = {
    ...(utm_source ? { utm_source } : {}),
    ...(utm_medium ? { utm_medium } : {}),
    ...(utm_campaign ? { utm_campaign } : {}),
    ...(utm_content ? { utm_content } : {}),
    ...(utm_term ? { utm_term } : {}),
    ...(referrer ? { referrer: referrer.slice(0, 500) } : {}),
    landing_path: landing_path.slice(0, 500),
    channel,
  };

  try {
    sessionStorage.setItem(KEY, JSON.stringify(captured));
  } catch {
    // Quota or private-mode error — capture still works for the current page
  }
  return captured;
}

export function readTrafficSource(): AssessmentSource | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as AssessmentSource) : null;
  } catch {
    return null;
  }
}

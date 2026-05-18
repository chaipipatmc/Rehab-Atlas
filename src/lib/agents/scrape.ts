/**
 * Shared website-scraping primitives used by the outreach Research agent and
 * the Data Verifier agent. Plain fetch + regex — no cheerio/puppeteer.
 */

const USER_AGENT = "Mozilla/5.0 (compatible; Rehab-Atlas-Bot/1.0)";
const FETCH_TIMEOUT_MS = 8000;

export interface FetchedPage {
  /** Cleaned visible text (script/style/nav/footer stripped, tags removed) */
  text: string;
  /** Raw HTML, used by `extractLinks` / `extractImageUrls` */
  html: string;
}

/**
 * Fetch a page with sane defaults (timeout, user-agent, follow redirects).
 * On any failure returns empty strings — callers should always handle that.
 */
export async function fetchPage(url: string): Promise<FetchedPage> {
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      headers: { "User-Agent": USER_AGENT },
      redirect: "follow",
    });
    if (!res.ok) return { text: "", html: "" };
    const html = await res.text();
    const text = html
      .replace(/<script[\s\S]*?<\/script>/gi, "")
      .replace(/<style[\s\S]*?<\/style>/gi, "")
      .replace(/<nav[\s\S]*?<\/nav>/gi, "")
      .replace(/<footer[\s\S]*?<\/footer>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    return { text, html };
  } catch {
    return { text: "", html: "" };
  }
}

/** Extract all hrefs from raw HTML. Drops external links to other hostnames. */
export function extractLinks(html: string, base: string): string[] {
  const linkRegex = /href=["']([^"']+)["']/gi;
  const links = new Set<string>();
  let baseHost = "";
  try {
    baseHost = new URL(base).hostname;
  } catch {
    return [];
  }
  let match;
  while ((match = linkRegex.exec(html)) !== null) {
    const href = match[1];
    if (href.startsWith("http") && !href.toLowerCase().includes(baseHost.toLowerCase())) continue;
    links.add(href);
  }
  return Array.from(links);
}

/**
 * Extract all <img src> URLs from HTML, normalized to absolute URLs against
 * the page's base. Drops obvious tracking pixels (data: URIs).
 * Used by the Data Verifier to check whether a stored center photo also
 * appears on the center's official website.
 */
export function extractImageUrls(html: string, base: string): string[] {
  const urls = new Set<string>();

  // Standard <img src=...>
  const imgRegex = /<img\b[^>]*\bsrc=["']([^"']+)["']/gi;
  let match;
  while ((match = imgRegex.exec(html)) !== null) {
    const src = match[1];
    if (!src || src.startsWith("data:")) continue;
    const abs = absolutize(src, base);
    if (abs) urls.add(abs);
  }

  // srcset (responsive images) — split by comma, take first URL of each candidate
  const srcsetRegex = /\bsrcset=["']([^"']+)["']/gi;
  while ((match = srcsetRegex.exec(html)) !== null) {
    const candidates = match[1].split(",");
    for (const c of candidates) {
      const url = c.trim().split(/\s+/)[0];
      if (!url || url.startsWith("data:")) continue;
      const abs = absolutize(url, base);
      if (abs) urls.add(abs);
    }
  }

  // Open Graph / Twitter card images
  const metaRegex = /<meta\b[^>]*\b(?:property|name)=["'](?:og:image|twitter:image)["'][^>]*\bcontent=["']([^"']+)["']/gi;
  while ((match = metaRegex.exec(html)) !== null) {
    const abs = absolutize(match[1], base);
    if (abs) urls.add(abs);
  }

  return Array.from(urls);
}

function absolutize(src: string, base: string): string | null {
  try {
    return new URL(src, base).toString();
  } catch {
    return null;
  }
}

/** Default subpage patterns to discover from a center homepage. */
export const DEFAULT_SUBPAGE_PATTERNS: RegExp[] = [
  /about/i, /team/i, /staff/i, /our-team/i, /therapists/i, /clinicians/i,
  /programs?/i, /treatment/i, /services/i, /therapies/i,
  /contact/i, /admissions/i, /get-help/i,
  /approach/i, /method/i, /philosophy/i,
  /facility/i, /campus/i, /gallery/i,
  /specialties/i, /conditions/i,
  /faq/i, /pricing/i, /insurance/i,
];

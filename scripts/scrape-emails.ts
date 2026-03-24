/**
 * Scrape email addresses from each center's website
 * Run: npx tsx scripts/scrape-emails.ts
 */

import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://jfpxyaajmarlfhcngszh.supabase.co",
  process.env.SUPABASE_SERVICE_ROLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpmcHh5YWFqbWFybGZoY25nc3poIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3Mzg5NDkyNCwiZXhwIjoyMDg5NDcwOTI0fQ.v0b7BQ8gv5SCmU23UHrEIg4-kJ8cicmKEoi7yirQgqI"
);

// Email regex pattern
const EMAIL_REGEX = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g;

// Exclude common false-positive emails
const EXCLUDE_PATTERNS = [
  /@example\.com$/,
  /@sentry\./,
  /@wixpress\./,
  /@.*\.png$/,
  /@.*\.jpg$/,
  /\.webp$/,
  /@2x\./,
  /@media/,
  /webpack/,
  /sourcemap/,
  /@import/,
  /@charset/,
  /@keyframes/,
  /@font-face/,
  /noreply@/,
  /no-reply@/,
  /donotreply@/,
  /test@/,
  /admin@wordpress/,
  /@gravatar/,
];

function isValidEmail(email: string): boolean {
  if (email.length > 60) return false;
  if (EXCLUDE_PATTERNS.some((p) => p.test(email))) return false;
  // Must have a reasonable TLD
  const parts = email.split(".");
  const tld = parts[parts.length - 1].toLowerCase();
  if (tld.length > 6) return false;
  return true;
}

function extractEmails(html: string): string[] {
  // Find mailto: links first (highest confidence)
  const mailtoRegex = /mailto:([a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,})/gi;
  const mailtoEmails: string[] = [];
  let match;
  while ((match = mailtoRegex.exec(html)) !== null) {
    const email = match[1].toLowerCase().split("?")[0]; // Remove ?subject= etc
    if (isValidEmail(email)) mailtoEmails.push(email);
  }

  // Also find emails in visible text
  const textEmails: string[] = [];
  const allMatches = html.match(EMAIL_REGEX) || [];
  for (const email of allMatches) {
    const clean = email.toLowerCase();
    if (isValidEmail(clean) && !mailtoEmails.includes(clean)) {
      textEmails.push(clean);
    }
  }

  // Dedupe, prefer mailto emails
  const all = [...new Set([...mailtoEmails, ...textEmails])];
  return all;
}

function pickBestEmail(emails: string[], domain: string): string | null {
  if (emails.length === 0) return null;

  // Extract the center's domain for matching
  const centerDomain = domain.replace(/^www\./, "").toLowerCase();

  // Priority 1: email matching the center's own domain
  const ownDomain = emails.find((e) => e.endsWith("@" + centerDomain));
  if (ownDomain) return ownDomain;

  // Priority 2: common contact patterns
  const contactPatterns = ["info@", "contact@", "admissions@", "intake@", "help@", "hello@", "inquiry@"];
  for (const pattern of contactPatterns) {
    const found = emails.find((e) => e.startsWith(pattern));
    if (found) return found;
  }

  // Priority 3: first email that looks like a business email (not gmail/yahoo)
  const businessEmail = emails.find(
    (e) => !e.includes("gmail.com") && !e.includes("yahoo.com") && !e.includes("hotmail.com") && !e.includes("outlook.com")
  );
  if (businessEmail) return businessEmail;

  // Fallback: first email
  return emails[0];
}

async function fetchPage(url: string): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml",
      },
      redirect: "follow",
    });
    clearTimeout(timeout);
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

async function scrapeCenter(center: { id: string; name: string; website_url: string }): Promise<string | null> {
  const baseUrl = center.website_url.replace(/\/$/, "");
  let domain = "";
  try {
    domain = new URL(baseUrl).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }

  const allEmails: string[] = [];

  // Fetch homepage
  console.log(`  Fetching homepage: ${baseUrl}`);
  const homepage = await fetchPage(baseUrl);
  if (homepage) {
    allEmails.push(...extractEmails(homepage));
  }

  // Fetch common contact pages
  const contactPaths = ["/contact", "/contact-us", "/about", "/about-us", "/get-help"];
  for (const path of contactPaths) {
    const url = baseUrl + path;
    console.log(`  Trying: ${url}`);
    const page = await fetchPage(url);
    if (page) {
      allEmails.push(...extractEmails(page));
    }
    // Small delay to be respectful
    await new Promise((r) => setTimeout(r, 500));
  }

  const unique = [...new Set(allEmails)];
  const best = pickBestEmail(unique, domain);

  if (best) {
    console.log(`  ✓ Found: ${best} (from ${unique.length} candidates)`);
  } else {
    console.log(`  ✗ No email found`);
  }

  return best;
}

async function main() {
  console.log("=== Rehab-Atlas Email Scraper ===\n");

  // Fetch all centers missing emails
  const { data: centers } = await supabase
    .from("centers")
    .select("id, name, website_url, email")
    .or("email.is.null,email.eq.")
    .order("name");

  if (!centers || centers.length === 0) {
    console.log("All centers already have emails!");
    return;
  }

  console.log(`Found ${centers.length} centers missing emails\n`);

  let found = 0;
  let notFound = 0;
  const results: { name: string; email: string | null; website: string }[] = [];

  for (const center of centers) {
    if (!center.website_url) {
      console.log(`[${centers.indexOf(center) + 1}/${centers.length}] ${center.name} — no website, skipping`);
      notFound++;
      results.push({ name: center.name, email: null, website: "none" });
      continue;
    }

    console.log(`[${centers.indexOf(center) + 1}/${centers.length}] ${center.name}`);
    const email = await scrapeCenter(center);

    if (email) {
      // Update database
      const { error } = await supabase
        .from("centers")
        .update({ email, inquiry_email: email })
        .eq("id", center.id);

      if (error) {
        console.log(`  ⚠ DB update failed: ${error.message}`);
      } else {
        console.log(`  ✓ Updated in database`);
        found++;
      }
    } else {
      notFound++;
    }

    results.push({ name: center.name, email, website: center.website_url });

    // Delay between centers
    await new Promise((r) => setTimeout(r, 1000));
    console.log("");
  }

  console.log("\n=== RESULTS ===");
  console.log(`Found emails: ${found}/${centers.length}`);
  console.log(`Not found: ${notFound}/${centers.length}`);
  console.log("\nCenters still missing emails:");
  results.filter((r) => !r.email).forEach((r) => console.log(`  - ${r.name} (${r.website})`));
}

main().catch(console.error);

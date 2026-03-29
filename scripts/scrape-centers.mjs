import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const CENTERS = [
  { name: "The Hills Rehab Chiang Mai", url: "https://www.thehillsrehabchiangmai.com/" },
  { name: "Holina Healing Centre", url: "https://holinahealing.com/" },
  { name: "Addiction Rehab Toronto", url: "https://addictionrehabtoronto.ca/" },
  { name: "Bali Beginnings", url: "https://rehabbali.com/" },
  { name: "Delamere Health", url: "https://delamere.com/" },
];

const UA = "Mozilla/5.0 (compatible; Rehab-Atlas-Bot/1.0)";

function stripHtml(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<nav[\s\S]*?<\/nav>/gi, "")
    .replace(/<footer[\s\S]*?<\/footer>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

async function fetchPageRaw(url) {
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(10000),
      headers: { "User-Agent": UA },
      redirect: "follow",
    });
    if (!res.ok) return "";
    return await res.text();
  } catch {
    return "";
  }
}

function extractLinks(html, baseHost) {
  const re = /href=["']([^"']+)["']/gi;
  const links = new Set();
  let m;
  while ((m = re.exec(html)) !== null) {
    const href = m[1];
    if (href.startsWith("http") && !href.includes(baseHost)) continue;
    if (href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) continue;
    links.add(href);
  }
  return Array.from(links);
}

function extractImages(html) {
  const re = /(?:src|data-src|data-lazy-src)=["'](https?:\/\/[^"']+\.(?:jpg|jpeg|png|webp)[^"']*)["']/gi;
  const images = new Set();
  let m;
  while ((m = re.exec(html)) !== null) {
    const url = m[1];
    if (url.includes("icon") || url.includes("logo") || url.includes("favicon") || url.includes("pixel") || url.length > 500) continue;
    // Only keep reasonably sized images (skip tiny ones by checking URL patterns)
    if (url.includes("1x1") || url.includes("spacer") || url.includes("blank")) continue;
    images.add(url);
  }
  return Array.from(images);
}

async function scrapeCenter(center) {
  const baseUrl = center.url.replace(/\/$/, "");
  const host = new URL(baseUrl).hostname;

  // 1. Fetch homepage
  const homeHtml = await fetchPageRaw(baseUrl);
  const homeText = stripHtml(homeHtml).slice(0, 3000);

  // 2. Find subpage links — separate facility/gallery pages from content pages
  const allLinks = extractLinks(homeHtml, host);
  const contentPatterns = [/about/i, /team/i, /staff/i, /program/i, /treatment/i, /service/i, /contact/i, /admission/i, /approach/i, /therap/i, /special/i, /faq/i, /pric/i, /our-/i, /what-we/i, /how-we/i];
  const facilityPatterns = [/gallery/i, /photo/i, /facilit/i, /accommodation/i, /campus/i, /virtual-tour/i, /tour/i, /rooms/i, /amenities/i];
  // Skip blog/article links for photos
  const blogPatterns = [/blog/i, /article/i, /news/i, /post/i, /story/i, /stories/i];

  const subpages = [];
  const facilityPages = [];
  for (const link of allLinks) {
    const full = link.startsWith("/") ? `${baseUrl}${link}` : link;
    if (!full.startsWith("http")) continue;
    if (blogPatterns.some((p) => p.test(link))) continue; // Skip blog pages
    if (facilityPatterns.some((p) => p.test(link)) && !facilityPages.includes(full)) {
      facilityPages.push(full);
    } else if (contentPatterns.some((p) => p.test(link)) && !subpages.includes(full) && subpages.length < 6) {
      subpages.push(full);
    }
  }

  // 3. Scrape subpages (content for profile data)
  const sections = [`[HOMEPAGE]\n${homeText}`];
  const allHtml = [homeHtml];

  for (const url of [...facilityPages.slice(0, 3), ...subpages]) {
    const html = await fetchPageRaw(url);
    if (html) {
      allHtml.push(html);
      const text = stripHtml(html).slice(0, 2000);
      const pageName = url.replace(baseUrl, "").replace(/^\//, "") || "page";
      sections.push(`[${pageName.toUpperCase()}]\n${text}`);
    }
  }

  // 4. Extract images — prioritize facility/gallery pages, skip blog images
  const facilityImages = [];
  const otherImages = [];

  // First: images from facility/gallery pages (highest quality facility photos)
  for (const url of facilityPages.slice(0, 3)) {
    const html = await fetchPageRaw(url);
    if (html) facilityImages.push(...extractImages(html));
  }

  // Then: images from homepage (often has hero/facility shots)
  otherImages.push(...extractImages(homeHtml));

  // Deduplicate, facility images first
  const seenUrls = new Set();
  const prioritizedImages = [];
  for (const img of [...facilityImages, ...otherImages]) {
    if (!seenUrls.has(img)) {
      seenUrls.add(img);
      prioritizedImages.push(img);
    }
  }
  const uniqueImages = prioritizedImages;

  return {
    content: sections.join("\n\n").slice(0, 12000),
    images: uniqueImages,
    subpagesScraped: subpages.length,
  };
}

async function processCenter(center) {
  console.log(`\n=== Scraping: ${center.name} ===`);
  const scraped = await scrapeCenter(center);
  console.log(`Content: ${scraped.content.length} chars | Images: ${scraped.images.length} | Subpages: ${scraped.subpagesScraped}`);

  // Claude: extract profile
  const resp = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 2000,
    system: "You are a data extraction specialist. Extract structured rehab center profile data from scraped website content. Be specific and factual. Return valid JSON only.",
    messages: [
      {
        role: "user",
        content: `Extract a complete profile for ${center.name} from this scraped website content:

${scraped.content}

Return a JSON object:
{
  "description": "3-4 paragraph description (200-300 words, professional, factual)",
  "short_description": "1-2 sentence summary (under 160 chars)",
  "city": "city name",
  "state_province": "state or province",
  "address": "full address if found",
  "phone": "phone number if found",
  "treatment_focus": ["alcohol_addiction", "drug_addiction", "mental_health", etc],
  "conditions": ["depression", "anxiety", "PTSD", "bipolar", etc],
  "substance_use": ["alcohol", "opioids", "cocaine", "methamphetamine", etc],
  "services": ["individual_therapy", "group_therapy", "family_therapy", "detox", etc],
  "treatment_methods": ["CBT", "DBT", "EMDR", "12_step", "mindfulness", "art_therapy", etc],
  "setting_type": "residential or outpatient or both",
  "program_length": "e.g. 28-90 days",
  "languages": ["English", etc],
  "pricing_text": "pricing info if found",
  "has_detox": true/false,
  "accreditation": "accreditation bodies if mentioned",
  "clinical_director": "name if found",
  "medical_director": "name if found"
}

Only include factual information from the website. Use null for fields not found.`,
      },
    ],
  });

  const text = resp.content[0].type === "text" ? resp.content[0].text : "";
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) {
    console.error("No JSON for", center.name);
    return;
  }
  const profile = JSON.parse(match[0]);

  // Find center in DB
  const { data: existing } = await s.from("centers").select("id").eq("name", center.name).single();
  if (!existing) {
    console.error("Center not found:", center.name);
    return;
  }

  // Update profile
  const updateData = {};
  const fields = [
    "description", "short_description", "city", "state_province", "address", "phone",
    "treatment_focus", "conditions", "substance_use", "services", "treatment_methods",
    "setting_type", "program_length", "languages", "pricing_text", "has_detox",
    "accreditation", "clinical_director", "medical_director",
  ];
  for (const f of fields) {
    if (profile[f] !== null && profile[f] !== undefined) {
      updateData[f] = profile[f];
    }
  }
  updateData.is_unclaimed = true;
  updateData.status = "draft";

  const { error } = await s.from("centers").update(updateData).eq("id", existing.id);
  if (error) {
    console.error("Update failed:", error.message);
    return;
  }

  console.log("Profile updated:", center.name);
  console.log("  City:", profile.city);
  console.log("  Treatment:", (profile.treatment_focus || []).join(", "));
  console.log("  Methods:", (profile.treatment_methods || []).join(", "));
  console.log("  Setting:", profile.setting_type);

  // Photos — filter for quality
  const goodPhotos = scraped.images.filter((img) => {
    const lower = img.toLowerCase();
    return !lower.includes("logo") && !lower.includes("icon") && !lower.includes("favicon") && !lower.includes("avatar") && !lower.includes("badge") && !lower.includes("seal");
  });

  console.log("  Photos found:", goodPhotos.length);

  // If not enough from website, search Unsplash
  let finalPhotos = goodPhotos.slice(0, 10);

  if (finalPhotos.length < 8) {
    console.log("  Not enough photos, adding from Unsplash...");
    const query = encodeURIComponent(`${center.name} rehab center`);
    try {
      const unsplashRes = await fetch(
        `https://api.unsplash.com/search/photos?query=rehabilitation+center+${profile.setting_type || "residential"}&per_page=${10 - finalPhotos.length}`,
        { headers: { Authorization: `Client-ID ${process.env.UNSPLASH_ACCESS_KEY}` } }
      );
      if (unsplashRes.ok) {
        const data = await unsplashRes.json();
        const unsplashPhotos = (data.results || []).map((r) => r.urls.regular);
        finalPhotos = [...finalPhotos, ...unsplashPhotos].slice(0, 10);
      }
    } catch (e) {
      console.log("  Unsplash failed:", e.message);
    }
  }

  // Insert photos
  if (finalPhotos.length > 0) {
    await s.from("center_photos").delete().eq("center_id", existing.id);
    for (let i = 0; i < finalPhotos.length; i++) {
      await s.from("center_photos").insert({
        center_id: existing.id,
        url: finalPhotos[i],
        caption: i === 0 ? `${center.name}` : `${center.name} - Photo ${i + 1}`,
        is_primary: i === 0,
        sort_order: i,
      });
    }
    console.log("  Photos saved:", finalPhotos.length);
  }
}

// Run all
(async () => {
  for (const center of CENTERS) {
    await processCenter(center);
  }
  console.log("\n=== All 5 centers scraped and updated! ===");
})();

import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const UA = "Mozilla/5.0 (compatible; Rehab-Atlas-Bot/1.0)";

async function fetchRaw(url) {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(10000), headers: { "User-Agent": UA }, redirect: "follow" });
    return res.ok ? await res.text() : "";
  } catch { return ""; }
}

function strip(html) {
  return html.replace(/<script[\s\S]*?<\/script>/gi, "").replace(/<style[\s\S]*?<\/style>/gi, "").replace(/<nav[\s\S]*?<\/nav>/gi, "").replace(/<footer[\s\S]*?<\/footer>/gi, "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function extractImages(html) {
  const re = /(?:src|data-src|data-lazy-src)=["'](https?:\/\/[^"']+\.(?:jpg|jpeg|png|webp)[^"']*)["']/gi;
  const imgs = new Set();
  let m;
  while ((m = re.exec(html)) !== null) {
    const u = m[1];
    if (u.includes("icon") || u.includes("logo") || u.includes("favicon") || u.includes("avatar") || u.includes("badge") || u.includes("1x1") || u.includes("pixel") || u.includes("blank") || u.includes("blog") || u.includes("article") || u.includes("author") || u.includes("thumbnail") || u.length > 500) continue;
    imgs.add(u);
  }
  return Array.from(imgs);
}

async function processCenter(centerId, centerName, websiteUrl) {
  const baseUrl = websiteUrl.replace(/\/$/, "");
  const host = new URL(baseUrl).hostname;

  // Fetch homepage
  const homeHtml = await fetchRaw(baseUrl);
  if (!homeHtml) { console.log("  Could not fetch website"); return false; }
  const homeText = strip(homeHtml).slice(0, 3000);

  // Find subpage links
  const linkRe = /href=["']([^"']+)["']/gi;
  let m;
  const contentPages = [], facilityPages = [];
  const blogPat = [/blog/i, /article/i, /news/i, /post/i];
  const facilityPat = [/gallery/i, /photo/i, /facilit/i, /accommodation/i, /campus/i, /tour/i, /rooms/i];
  const contentPat = [/about/i, /team/i, /staff/i, /program/i, /treatment/i, /service/i, /contact/i, /admission/i, /approach/i, /therap/i];

  while ((m = linkRe.exec(homeHtml)) !== null) {
    const href = m[1];
    if (blogPat.some(p => p.test(href))) continue;
    const full = href.startsWith("/") ? `${baseUrl}${href}` : href;
    if (!full.startsWith("http") || !full.includes(host)) continue;
    if (facilityPat.some(p => p.test(href)) && facilityPages.length < 3) facilityPages.push(full);
    else if (contentPat.some(p => p.test(href)) && contentPages.length < 4) contentPages.push(full);
  }

  // Scrape content pages for profile data
  const sections = [`[HOMEPAGE]\n${homeText}`];
  for (const url of [...facilityPages, ...contentPages].slice(0, 5)) {
    const html = await fetchRaw(url);
    if (html) {
      const text = strip(html).slice(0, 2000);
      const pageName = url.replace(baseUrl, "").replace(/^\//, "") || "page";
      sections.push(`[${pageName.toUpperCase()}]\n${text}`);
    }
  }
  const content = sections.join("\n\n").slice(0, 12000);

  // Claude: extract profile
  try {
    const resp = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2000,
      system: "Extract rehab center profile data. Return valid JSON only. All array fields must be arrays. accreditation must be an array of strings.",
      messages: [{ role: "user", content: `Extract profile for ${centerName}:\n\n${content}\n\nJSON: description (string 200-300 words), short_description (string max 160 chars), city (string), state_province (string), address (string), phone (string), treatment_focus (string array), conditions (string array), substance_use (string array), services (string array), treatment_methods (string array), setting_type (string), program_length (string), languages (string array), pricing_text (string), has_detox (boolean), accreditation (string array), clinical_director (string), medical_director (string). Use null for not found. Arrays must be [].` }],
    });

    const text = resp.content[0].type === "text" ? resp.content[0].text : "";
    const jm = text.match(/\{[\s\S]*\}/);
    if (!jm) { console.log("  No JSON from Claude"); return false; }
    const p = JSON.parse(jm[0]);

    // Ensure arrays
    const arrayFields = ["treatment_focus", "conditions", "substance_use", "services", "treatment_methods", "languages", "accreditation"];
    for (const f of arrayFields) { if (!Array.isArray(p[f])) p[f] = []; }

    const updateData = {};
    const fields = ["description", "short_description", "city", "state_province", "address", "phone", "treatment_focus", "conditions", "substance_use", "services", "treatment_methods", "setting_type", "program_length", "languages", "pricing_text", "has_detox", "accreditation", "clinical_director", "medical_director"];
    for (const f of fields) { if (p[f] !== null && p[f] !== undefined) updateData[f] = p[f]; }
    updateData.is_unclaimed = true;
    updateData.status = "draft";

    const { error } = await s.from("centers").update(updateData).eq("id", centerId);
    if (error) { console.log("  DB error:", error.message); return false; }

    console.log("  Profile: " + (p.city || "?") + " | " + (p.treatment_methods || []).slice(0, 3).join(", "));
  } catch (err) {
    console.log("  Claude error:", err.message?.slice(0, 80));
    return false;
  }

  // Photos: facility pages first, then homepage
  const facilityImgs = [];
  for (const url of facilityPages) {
    const html = await fetchRaw(url);
    if (html) facilityImgs.push(...extractImages(html));
  }
  const homeImgs = extractImages(homeHtml);
  const seen = new Set();
  const allImgs = [];
  for (const img of [...facilityImgs, ...homeImgs]) {
    if (!seen.has(img)) { seen.add(img); allImgs.push(img); }
  }

  let photos = allImgs.slice(0, 10);
  // Unsplash fallback
  if (photos.length < 8 && process.env.UNSPLASH_ACCESS_KEY) {
    try {
      const res = await fetch(`https://api.unsplash.com/search/photos?query=rehabilitation+center+facility&per_page=${10 - photos.length}`, {
        headers: { Authorization: `Client-ID ${process.env.UNSPLASH_ACCESS_KEY}` }
      });
      if (res.ok) {
        const data = await res.json();
        photos = [...photos, ...(data.results || []).map(r => r.urls.regular)].slice(0, 10);
      }
    } catch {}
  }

  // Save photos
  await s.from("center_photos").delete().eq("center_id", centerId);
  let saved = 0;
  for (let i = 0; i < photos.length; i++) {
    const { error } = await s.from("center_photos").insert({
      center_id: centerId,
      url: photos[i],
      alt_text: i === 0 ? centerName : `${centerName} - Photo ${i + 1}`,
      is_primary: i === 0,
      sort_order: i,
    });
    if (!error) saved++;
  }

  console.log("  Photos: " + saved + " saved");
  return true;
}

// Main
(async () => {
  const { data: centers } = await s.from("centers")
    .select("id, name, website_url, country")
    .not("website_url", "is", null)
    .or("is_unclaimed.is.null,is_unclaimed.eq.false")
    .order("country")
    .limit(30);

  console.log(`Scraping ${centers.length} centers...\n`);
  let ok = 0, fail = 0;

  for (let i = 0; i < centers.length; i++) {
    const c = centers[i];
    console.log(`[${i + 1}/${centers.length}] ${c.name} (${c.country})`);
    const success = await processCenter(c.id, c.name, c.website_url);
    if (success) ok++; else fail++;
  }

  console.log(`\nDone! Success: ${ok}, Failed: ${fail}`);
})();

import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

async function searchUnsplash(query, count = 1) {
  if (!process.env.UNSPLASH_ACCESS_KEY) return [];
  try {
    const res = await fetch(
      `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&orientation=landscape&per_page=${count * 2}`,
      { headers: { Authorization: `Client-ID ${process.env.UNSPLASH_ACCESS_KEY}` } }
    );
    if (!res.ok) return [];
    const data = await res.json();
    return (data.results || []).slice(0, count).map((r) => r.urls.regular);
  } catch { return []; }
}

async function searchPexels(query, count = 1) {
  if (!process.env.PEXELS_API_KEY) return [];
  try {
    const res = await fetch(
      `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&orientation=landscape&per_page=${count * 2}`,
      { headers: { Authorization: process.env.PEXELS_API_KEY } }
    );
    if (!res.ok) return [];
    const data = await res.json();
    return (data.photos || []).slice(0, count).map((p) => p.src.large);
  } catch { return []; }
}

async function findImage(query) {
  let imgs = await searchUnsplash(query, 1);
  if (imgs.length === 0) imgs = await searchPexels(query, 1);
  return imgs[0] || null;
}

(async () => {
  const { data: articles } = await s.from("pages")
    .select("id, title, content, status")
    .eq("page_type", "blog")
    .in("status", ["draft", "approved"])
    .order("created_at", { ascending: false });

  console.log(`Re-imaging ${articles?.length} articles...\n`);
  const usedUrls = new Set();

  for (const article of articles || []) {
    console.log(`\n=== ${article.title} ===`);

    // Ask Claude for 5 specific image queries for this article
    const resp = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 500,
      messages: [{
        role: "user",
        content: `Given this article title: "${article.title}"

Generate exactly 5 specific image search queries that would find photos directly relevant to each section of this article. The images should visually represent the content.

Rules:
- Be specific to THIS topic (not generic "wellness" or "nature")
- First query should work as a featured/hero image
- Each query should find a DIFFERENT type of image
- Use descriptive photography terms (e.g. "person in therapy session" not just "therapy")

Return a JSON array of 5 strings. Example:
["therapy session with counselor and patient in modern office", "brain scan showing neural pathways", "support group sitting in circle discussion", "person writing in journal at desk morning light", "family embracing during recovery milestone"]`
      }],
    });

    const text = resp.content[0].type === "text" ? resp.content[0].text : "";
    const match = text.match(/\[[\s\S]*?\]/);
    if (!match) { console.log("  No queries from Claude"); continue; }

    let queries;
    try { queries = JSON.parse(match[0]); } catch { console.log("  Parse error"); continue; }

    // Find images for each query
    const newImages = [];
    for (const q of queries) {
      const img = await findImage(q);
      if (img && !usedUrls.has(img)) {
        newImages.push(img);
        usedUrls.add(img);
        console.log(`  ✓ "${q.slice(0, 50)}..." -> found`);
      } else {
        console.log(`  ✗ "${q.slice(0, 50)}..." -> not found, trying alt...`);
        // Try simpler version
        const simpler = q.split(" ").slice(0, 3).join(" ");
        const alt = await findImage(simpler);
        if (alt && !usedUrls.has(alt)) {
          newImages.push(alt);
          usedUrls.add(alt);
          console.log(`    ✓ fallback found`);
        }
      }
    }

    if (newImages.length < 3) {
      console.log(`  Only ${newImages.length} images found, skipping update`);
      continue;
    }

    // Replace images in content
    let content = article.content;

    // Replace featured image
    content = content.replace(/!\[featured\]\([^)]+\)/, `![featured](${newImages[0]})`);

    // Replace inline images (all markdown images that aren't featured)
    let inlineIdx = 1;
    content = content.replace(/!\[\]\([^)]+\)/g, () => {
      if (inlineIdx < newImages.length) {
        return `![](${newImages[inlineIdx++]})`;
      }
      return `![](${newImages[newImages.length - 1]})`; // reuse last if not enough
    });

    // Update in DB
    const { error } = await s.from("pages").update({ content }).eq("id", article.id);
    console.log(`  Updated: ${error ? "FAILED - " + error.message : newImages.length + " images replaced"}`);
  }

  console.log("\n=== Done! ===");
})();

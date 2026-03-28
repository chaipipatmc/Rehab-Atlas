/**
 * One-time script to fill the content pool with 5 days of articles.
 * Bypasses the weekend check. Run: node --env-file=.env.local scripts/fill-pool.mjs
 */
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@supabase/supabase-js";

const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const ARTICLES_PER_DAY = 3;
const BUFFER_DAYS = 5;

function slugify(title) {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80);
}

const CATEGORY_TAG_MAP = {
  "addiction-types": ["Addiction", "Substance Use"],
  "treatment-types": ["Treatment", "Rehabilitation"],
  "mental-health": ["Mental Health", "Wellness"],
  "recovery-guides": ["Recovery", "Sobriety"],
  "practical-guides": ["Guides", "Resources"],
  "international-treatment": ["International", "Medical Tourism"],
  "family-support": ["Family Support", "Relationships"],
};

const IMAGE_QUERIES = {
  "addiction-types": "recovery wellness nature calm",
  "treatment-types": "therapy wellness healing peaceful",
  "mental-health": "mental health mindfulness peaceful",
  "recovery-guides": "sunrise new beginning hope nature",
  "practical-guides": "planning notebook organized calm",
  "international-treatment": "travel wellness tropical healing",
  "family-support": "family support together caring",
};

async function getUsedImageIds() {
  const { data } = await s.from("pages").select("content").eq("page_type", "blog").not("content", "is", null);
  const used = new Set();
  for (const a of data || []) {
    for (const m of a.content.matchAll(/!\[[^\]]*\]\(([^)]+)\)/g)) {
      const idMatch = m[1].match(/images\.unsplash\.com\/photo-([^?/]+)/);
      used.add(idMatch ? idMatch[1] : m[1]);
    }
  }
  return used;
}

async function searchImages(query, count, used) {
  const results = [];
  const accessKey = process.env.UNSPLASH_ACCESS_KEY?.trim();
  if (accessKey) {
    for (let page = 1; page <= 4 && results.length < count; page++) {
      try {
        const r = await fetch(`https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&orientation=landscape&per_page=15&page=${page}`, { headers: { Authorization: `Client-ID ${accessKey}` } });
        if (!r.ok) break;
        const d = await r.json();
        for (const p of d.results || []) {
          if (results.length >= count) break;
          const url = p.urls?.regular || p.urls?.small;
          if (!url) continue;
          const idMatch = url.match(/images\.unsplash\.com\/photo-([^?/]+)/);
          const pid = idMatch ? idMatch[1] : url;
          if (used.has(pid)) continue;
          results.push(url); used.add(pid);
        }
      } catch { break; }
    }
  }
  if (results.length < count && process.env.PEXELS_API_KEY) {
    try {
      const r = await fetch(`https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&orientation=landscape&per_page=15`, { headers: { Authorization: process.env.PEXELS_API_KEY.trim() } });
      if (r.ok) {
        const d = await r.json();
        for (const p of d.photos || []) {
          if (results.length >= count) break;
          const url = p.src?.large2x || p.src?.large;
          if (!url) continue;
          const pid = `pexels-${p.id}`;
          if (used.has(pid)) continue;
          results.push(url); used.add(pid);
        }
      }
    } catch {}
  }
  return results;
}

// --- Main ---
const { count: drafts } = await s.from("pages").select("id", { count: "exact" }).eq("page_type", "blog").eq("status", "draft");
const { count: approved } = await s.from("pages").select("id", { count: "exact" }).eq("page_type", "blog").eq("status", "approved");
const totalPool = (drafts || 0) + (approved || 0);
const daysOfContent = Math.floor(totalPool / ARTICLES_PER_DAY);
const daysToDraft = Math.max(1, BUFFER_DAYS - daysOfContent + 1);

console.log(`Pool: ${totalPool} articles (~${daysOfContent} days). Drafting ${daysToDraft} days...`);

const today = new Date().toISOString().split("T")[0];
const future = new Date(); future.setDate(future.getDate() + daysToDraft + 10);
const { data: topics } = await s.from("content_calendar")
  .select("id, topic, category, brief, keywords, planned_date")
  .gte("planned_date", today).eq("status", "approved")
  .order("planned_date").order("created_at");

const byDate = new Map();
(topics || []).forEach(t => {
  if (!byDate.has(t.planned_date)) byDate.set(t.planned_date, []);
  byDate.get(t.planned_date).push(t);
});

const usedImages = await getUsedImageIds();
let written = 0, daysProcessed = 0;

for (const [date, dayTopics] of byDate) {
  if (daysProcessed >= daysToDraft) break;
  console.log(`\n--- ${date} (${dayTopics.length} topics) ---`);

  for (const topic of dayTopics) {
    process.stdout.write(`  Writing "${topic.topic}"...`);
    try {
      const resp = await anthropic.messages.create({
        model: "claude-sonnet-4-20250514", max_tokens: 4000,
        system: `You are a senior health journalist writing for Rehab-Atlas. Write 1500-2000 words in markdown. Use H2/H3 headings. Open with a statistic or research finding — NEVER with a fictional scenario. Third-person professional voice. No AI phrases. Include 5 FAQs at the end. Insert {{IMAGE_1}} to {{IMAGE_4}} between sections. Return JSON: {"title","content","meta_title"(max 65 chars),"meta_description"(max 155 chars),"slug"}`,
        messages: [{ role: "user", content: `Write about: "${topic.topic}"\nCategory: ${topic.category}${topic.brief ? `\nBrief: ${topic.brief}` : ""}${topic.keywords?.length ? `\nKeywords: ${topic.keywords.join(", ")}` : ""}` }],
      });

      const text = resp.content[0].type === "text" ? resp.content[0].text : "";
      const match = text.match(/\{[\s\S]*\}/);
      if (!match) { console.log(" SKIP (no JSON)"); continue; }
      const article = JSON.parse(match[0]);

      const imgQuery = IMAGE_QUERIES[topic.category] || "wellness recovery nature";
      const images = await searchImages(imgQuery, 5, usedImages);
      let content = article.content || "";
      for (let i = 0; i < 4; i++) {
        const ph = `{{IMAGE_${i + 1}}}`;
        content = content.includes(ph) && images[i + 1] ? content.replace(ph, `\n![](${images[i + 1]})\n`) : content.replace(ph, "");
      }
      if (images[0]) content = `![featured](${images[0]})\n\n${content}`;

      const slug = slugify(article.slug || article.title || topic.topic);
      const { data: slugCheck } = await s.from("pages").select("id").eq("slug", slug).single();
      const finalSlug = slugCheck ? `${slug}-${Date.now().toString(36)}` : slug;
      const tags = CATEGORY_TAG_MAP[topic.category] || [topic.category.replace(/-/g, " ")];

      const { data: page, error } = await s.from("pages").insert({
        title: article.title || topic.topic, slug: finalSlug, content,
        page_type: "blog", status: "draft",
        author_type: "rehabatlas", author_name: "Rehab-Atlas Editorial",
        meta_title: (article.meta_title || topic.topic).slice(0, 70),
        meta_description: (article.meta_description || "").slice(0, 160),
        tags,
      }).select("id").single();

      if (error) { console.log(` ERROR: ${error.message}`); continue; }

      await s.from("content_calendar").update({ status: "written", page_id: page.id }).eq("id", topic.id);

      // Log usage
      await s.from("api_usage").insert({
        service: "anthropic", agent_type: "content_creator", operation: "article_generation",
        model: "claude-sonnet-4-20250514",
        input_tokens: resp.usage.input_tokens, output_tokens: resp.usage.output_tokens,
        total_tokens: resp.usage.input_tokens + resp.usage.output_tokens,
        cost_usd: (resp.usage.input_tokens / 1000000) * 3 + (resp.usage.output_tokens / 1000000) * 15,
        metadata: { topic: topic.topic, category: topic.category },
      });

      written++;
      console.log(` OK`);
    } catch (err) {
      console.log(` FAILED: ${err.message?.slice(0, 60)}`);
    }
  }
  daysProcessed++;
}

console.log(`\n=== Done: wrote ${written} articles across ${daysProcessed} days ===`);

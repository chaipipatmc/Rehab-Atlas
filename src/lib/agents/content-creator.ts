/**
 * Content Creator Agent
 * Auto-researches rehab/addiction topics, writes SEO articles,
 * finds Unsplash images, and saves as drafts for admin approval.
 *
 * Runs daily via cron. Produces 1 article per run (3-5 per week on weekdays).
 */

import { createAdminClient } from "@/lib/supabase/admin";
import { createAgentTask, logAgentAction } from "@/lib/agents/base";
import { isAgentEnabled } from "@/lib/agents/config";
import { logClaudeUsage } from "@/lib/api-usage";

// --- Topic Categories ---

const TOPIC_CATEGORIES = [
  {
    category: "addiction-types",
    topics: [
      "Understanding Alcohol Addiction: Signs, Stages, and Recovery Options",
      "Drug Addiction Explained: From Recreational Use to Dependency",
      "Prescription Drug Addiction: The Hidden Epidemic",
      "Gambling Addiction: Recognizing the Signs and Finding Help",
      "Social Media and Technology Addiction: A Growing Concern",
      "Opioid Crisis: Understanding the Epidemic and Treatment Options",
      "Cocaine Addiction: Effects, Withdrawal, and Recovery",
      "Methamphetamine Addiction: What Families Need to Know",
      "Marijuana Dependency: When Casual Use Becomes a Problem",
      "Nicotine Addiction: Why Quitting Is So Hard and How to Succeed",
    ],
  },
  {
    category: "treatment-types",
    topics: [
      "Inpatient vs. Outpatient Rehab: Which Is Right for You?",
      "What to Expect During Detox: A Complete Guide",
      "Luxury Rehab Programs: Are They Worth the Investment?",
      "Holistic Addiction Treatment: Mind, Body, and Spirit Recovery",
      "Cognitive Behavioral Therapy in Addiction Treatment",
      "12-Step Programs: How They Work and Who They Help",
      "Medication-Assisted Treatment: Benefits and Considerations",
      "Intensive Outpatient Programs: Flexibility Without Compromise",
      "Adventure and Wilderness Therapy for Addiction Recovery",
      "Art and Music Therapy in Rehabilitation: Creative Paths to Recovery",
    ],
  },
  {
    category: "mental-health",
    topics: [
      "Understanding Dual Diagnosis: When Mental Health Meets Addiction",
      "Anxiety and Addiction: Breaking the Cycle",
      "Depression and Substance Abuse: A Dangerous Combination",
      "PTSD and Addiction: Understanding the Connection",
      "Eating Disorders and Substance Abuse: The Hidden Link",
      "Bipolar Disorder and Addiction: Treatment Challenges",
      "How Trauma Drives Addiction: Understanding ACEs",
      "Managing Stress Without Substances: Healthy Coping Strategies",
      "The Relationship Between Insomnia and Addiction",
      "Social Isolation and Addiction: How Loneliness Fuels Dependency",
    ],
  },
  {
    category: "recovery-guides",
    topics: [
      "The First 30 Days of Recovery: What to Expect",
      "Relapse Prevention: Strategies That Actually Work",
      "Building a Support Network in Recovery",
      "Sober Living: Transitioning from Rehab to Independent Life",
      "Exercise and Recovery: How Physical Activity Aids Healing",
      "Nutrition in Recovery: Rebuilding Your Body After Addiction",
      "Mindfulness and Meditation for Addiction Recovery",
      "Career Rebuilding After Rehab: A Practical Guide",
      "How to Maintain Relationships During Recovery",
      "Financial Recovery After Addiction: Getting Back on Track",
    ],
  },
  {
    category: "practical-guides",
    topics: [
      "How to Choose the Right Rehab Center: A Step-by-Step Guide",
      "How Much Does Rehab Cost? A Global Price Comparison",
      "Insurance and Rehab: What's Covered and What's Not",
      "What to Pack for Rehab: The Essential Checklist",
      "How Long Should You Stay in Rehab? Finding the Right Duration",
      "Questions to Ask Before Choosing a Treatment Center",
      "How to Stage an Intervention: A Compassionate Approach",
      "Understanding Aftercare: Why Post-Rehab Support Matters",
      "Online vs. In-Person Therapy for Addiction: Pros and Cons",
      "When Is the Right Time to Seek Professional Help?",
    ],
  },
  {
    category: "international-treatment",
    topics: [
      "Rehab Abroad: Why More People Are Choosing International Treatment",
      "Thailand as a Rehab Destination: What You Need to Know",
      "Bali Rehabilitation Centers: Healing in Paradise",
      "Rehab in India: Affordable Treatment Without Compromise",
      "Why Canada Is Becoming a Top Choice for Addiction Treatment",
      "Rehab in Australia: Programs, Costs, and What to Expect",
      "South Africa's Growing Reputation for Quality Rehabilitation",
      "European Rehab Centers: Privacy and Excellence",
      "Medical Tourism for Addiction Treatment: Benefits and Risks",
      "Cultural Considerations When Choosing an International Rehab",
    ],
  },
  {
    category: "family-support",
    topics: [
      "Supporting a Loved One Through Addiction: A Family Guide",
      "Codependency and Addiction: Recognizing Unhealthy Patterns",
      "How Addiction Affects Children: Protecting Young Minds",
      "Family Therapy in Addiction Recovery: Why It Matters",
      "Setting Boundaries with an Addicted Loved One",
      "Self-Care for Families of People with Addiction",
      "When a Parent Is Addicted: Resources for Adult Children",
      "How to Talk to Your Teenager About Drugs and Alcohol",
      "The Role of Al-Anon and Family Support Groups",
      "Rebuilding Trust After Addiction: A Guide for Families",
    ],
  },
];

function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

/**
 * Get all image URLs already used in existing blog articles.
 */
async function getUsedImageUrls(): Promise<Set<string>> {
  const admin = createAdminClient();
  const { data: articles } = await admin
    .from("pages")
    .select("content")
    .eq("page_type", "blog")
    .not("content", "is", null);

  const used = new Set<string>();
  for (const article of articles || []) {
    const content = article.content as string;
    // Match all markdown image URLs: ![...](url)
    const matches = content.matchAll(/!\[[^\]]*\]\(([^)]+)\)/g);
    for (const m of matches) {
      // Extract the base Unsplash photo ID to catch width/quality variants
      const url = m[1];
      const idMatch = url.match(/images\.unsplash\.com\/photo-([^?/]+)/);
      if (idMatch) {
        used.add(idMatch[1]); // Store just the photo ID
      } else {
        used.add(url);
      }
    }
  }
  return used;
}

/**
 * Search for images from Unsplash (primary) + Pexels (fallback).
 * Excludes already-used images. Returns up to `count` unique URLs.
 */
async function searchImages(query: string, count: number = 5, usedImages?: Set<string>): Promise<string[]> {
  const used = usedImages || await getUsedImageUrls();
  let results: string[] = [];

  // 1. Try Unsplash first
  results = await searchUnsplash(query, count, used);

  // 2. If not enough, try Pexels as fallback
  if (results.length < count) {
    const pexelsResults = await searchPexels(query, count - results.length, used);
    results.push(...pexelsResults);
  }

  // 3. If still not enough, try alternate search terms
  if (results.length < count) {
    const altQueries = ["wellness recovery peaceful", "therapy healing calm", "nature meditation serene"];
    for (const altQ of altQueries) {
      if (results.length >= count) break;
      const alt = await searchUnsplash(altQ, count - results.length, used);
      results.push(...alt);
      if (results.length < count) {
        const altPexels = await searchPexels(altQ, count - results.length, used);
        results.push(...altPexels);
      }
    }
  }

  return results;
}

/**
 * Search Unsplash for images.
 */
async function searchUnsplash(query: string, count: number, used: Set<string>): Promise<string[]> {
  const accessKey = process.env.UNSPLASH_ACCESS_KEY?.trim();
  if (!accessKey) return [];

  const results: string[] = [];

  for (let page = 1; page <= 4 && results.length < count; page++) {
    try {
      const response = await fetch(
        `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&orientation=landscape&per_page=15&page=${page}`,
        { headers: { Authorization: `Client-ID ${accessKey}` } }
      );

      if (!response.ok) break;

      const data = await response.json();
      const photos = data.results || [];
      if (photos.length === 0) break;

      for (const p of photos) {
        if (results.length >= count) break;
        const urls = (p as Record<string, unknown>).urls as Record<string, string> | undefined;
        const url = urls?.regular || urls?.small;
        if (!url) continue;

        const idMatch = url.match(/images\.unsplash\.com\/photo-([^?/]+)/);
        const photoId = idMatch ? idMatch[1] : url;
        if (used.has(photoId)) continue;

        results.push(url);
        used.add(photoId);
      }
    } catch {
      break;
    }
  }

  return results;
}

/**
 * Search Pexels for images (free fallback).
 * Requires PEXELS_API_KEY env var. Free: 200 requests/hour.
 */
async function searchPexels(query: string, count: number, used: Set<string>): Promise<string[]> {
  const apiKey = process.env.PEXELS_API_KEY?.trim();
  if (!apiKey) return [];

  const results: string[] = [];

  try {
    const response = await fetch(
      `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&orientation=landscape&per_page=${Math.min(count * 3, 30)}`,
      { headers: { Authorization: apiKey } }
    );

    if (!response.ok) return [];

    const data = await response.json();
    const photos = data.photos || [];

    for (const p of photos) {
      if (results.length >= count) break;
      const src = (p as Record<string, unknown>).src as Record<string, string> | undefined;
      const url = src?.large2x || src?.large || src?.medium;
      if (!url) continue;

      // Extract Pexels photo ID for dedup
      const idMatch = url.match(/pexels\.com\/photo\/(\d+)/);
      const photoId = idMatch ? `pexels-${idMatch[1]}` : url;
      if (used.has(photoId)) continue;

      results.push(url);
      used.add(photoId);
    }
  } catch {
    // Pexels not available
  }

  return results;
}

/**
 * Pick a topic that hasn't been written about recently.
 */
async function pickTopic(): Promise<{ category: string; topic: string; imageQuery: string } | null> {
  const admin = createAdminClient();

  // Get existing article titles to avoid duplicates
  const { data: existing } = await admin
    .from("pages")
    .select("title")
    .eq("page_type", "blog")
    .eq("author_type", "rehabatlas");

  const existingTitles = new Set(
    (existing || []).map((p) => (p.title as string).toLowerCase())
  );

  // Flatten all topics and filter out existing
  const allTopics: Array<{ category: string; topic: string }> = [];
  for (const cat of TOPIC_CATEGORIES) {
    for (const topic of cat.topics) {
      if (!existingTitles.has(topic.toLowerCase())) {
        allTopics.push({ category: cat.category, topic });
      }
    }
  }

  if (allTopics.length === 0) return null;

  // Pick a random topic (could be smarter with category rotation)
  const pick = allTopics[Math.floor(Math.random() * allTopics.length)];

  // Generate a search query for Unsplash based on topic
  const imageQueries: Record<string, string> = {
    "addiction-types": "recovery wellness nature calm",
    "treatment-types": "therapy wellness healing peaceful",
    "mental-health": "mental health mindfulness peaceful",
    "recovery-guides": "sunrise new beginning hope nature",
    "practical-guides": "planning notebook organized calm",
    "international-treatment": "travel wellness tropical healing",
    "family-support": "family support together caring",
  };

  return {
    ...pick,
    imageQuery: imageQueries[pick.category] || "wellness recovery nature",
  };
}

/**
 * Generate article content using Claude AI.
 */
async function generateArticle(topic: string, category: string, brief?: string, keywords?: string[]): Promise<{
  title: string;
  content: string;
  meta_title: string;
  meta_description: string;
  slug: string;
} | null> {
  if (!process.env.ANTHROPIC_API_KEY) return null;

  try {
    const Anthropic = (await import("@anthropic-ai/sdk")).default;
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4000,
      system: `You are a senior health journalist and clinical editor writing for Rehab-Atlas, a global platform connecting people with rehabilitation centers. You have 15+ years of experience covering addiction, mental health, and recovery.

VOICE & TONE — THIS IS CRITICAL:
- Write like a seasoned journalist, NOT like an AI. Your writing must feel like it was crafted by a real person with genuine expertise.
- Open with a compelling hook — a surprising statistic, an expert quote, or a thought-provoking question. NEVER start with a fictional character scenario (no "Sarah stared at her phone", no "John walked into the clinic"). NEVER start with a generic definition.
- Use varied sentence structure. Mix short punchy sentences with longer flowing ones. Avoid repetitive patterns.
- Write in third-person professional voice. Do NOT use first-person ("I", "my experience", "In my years"). Write like a medical journal article made accessible, not like a personal blog.
- Use specific data and research instead of fictional anecdotes. Reference real studies, real statistics, real treatment approaches.
- Avoid AI-giveaway phrases: "In today's world", "It's important to note", "This comprehensive guide", "Let's dive in", "In this article we will explore", "It's worth noting", "journey", "landscape", "navigate", "crucial", "empower", "game-changer", "holistic approach"
- NEVER use fictional character names or scenarios to open an article
- Write with quiet confidence. Don't over-explain or hedge everything.
- Vary paragraph lengths — some can be just one sentence for impact
- Include real-world context: mention specific research studies by name, reference actual treatment approaches used at real facilities

STRUCTURE:
- Write 1500-2000 words in markdown format
- Use H2 (##) for main sections and H3 (###) for subsections
- Be empathetic and non-judgmental — readers may be in crisis
- NEVER give specific medical advice — always recommend consulting professionals
- Include statistics with sources (WHO, NIDA, SAMHSA, Lancet, JAMA)
- Link naturally to [our assessment tool](/assessment) and [center directory](/centers) where relevant
- End with a "Frequently Asked Questions" section with 5 FAQs using ### for each question
- Include a brief, genuine conclusion — not a generic "you're not alone" ending

IMAGE PLACEHOLDERS:
- Insert exactly 3-4 image placeholders between sections using this format: {{IMAGE_1}}, {{IMAGE_2}}, {{IMAGE_3}}, {{IMAGE_4}}
- Place them BETWEEN sections (after an H2 heading's content, before the next H2)
- Do NOT put them at the very beginning or end — spread them evenly through the article
- Each placeholder should be on its own line

SEO RULES:
- Use the main keyword in the first paragraph
- Include related long-tail keywords naturally throughout
- Keep most paragraphs short (2-4 sentences) but vary the rhythm
- Use bullet points and numbered lists sparingly — not every section needs a list

Return a JSON object with:
{
  "title": "the article title",
  "content": "full markdown article body (do NOT include the title as H1)",
  "meta_title": "SEO title tag, max 65 characters",
  "meta_description": "SEO meta description, max 155 characters, include CTA",
  "slug": "url-friendly-slug"
}`,
      messages: [
        {
          role: "user",
          content: `Write a comprehensive article about: "${topic}"\n\nCategory: ${category}${brief ? `\n\nBrief: ${brief}` : ""}${keywords?.length ? `\n\nTarget keywords: ${keywords.join(", ")}` : ""}\n\nWrite the article now.`,
        },
      ],
    });

    // Log usage
    await logClaudeUsage(response, "content_creator", "article_generation", "claude-sonnet-4-20250514", { topic, category });

    const text = response.content[0].type === "text" ? response.content[0].text : "";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;

    const parsed = JSON.parse(jsonMatch[0]);
    return {
      title: parsed.title || topic,
      content: parsed.content || "",
      meta_title: (parsed.meta_title || topic).slice(0, 70),
      meta_description: (parsed.meta_description || "").slice(0, 160),
      slug: slugify(parsed.slug || parsed.title || topic),
    };
  } catch (err) {
    console.error("Article generation failed:", err);
    return null;
  }
}

// How many days of content buffer to maintain in the pool (drafts)
const BUFFER_DAYS = 5;
// How many articles per day (matching the content calendar plan)
const ARTICLES_PER_DAY = 3;

/**
 * Main function: write articles from the content calendar.
 *
 * Buffer strategy:
 * - Check how many days of drafts are in the pool
 * - If < BUFFER_DAYS, draft multiple days to fill the buffer
 * - If >= BUFFER_DAYS, draft only the next day's content
 * - This ensures there are always ~5 days of content ready for approval
 */
export async function createArticleDraft(): Promise<boolean> {
  const enabled = await isAgentEnabled("content_creator");
  if (!enabled) return false;

  // Skip weekends
  const day = new Date().getDay();
  if (day === 0 || day === 6) {
    console.log("Content Creator: skipping weekend");
    return false;
  }

  const admin = createAdminClient();

  // Count drafts in pool (not yet approved or published)
  const { count: draftsInPool } = await admin
    .from("pages")
    .select("id", { count: "exact", head: true })
    .eq("page_type", "blog")
    .eq("status", "draft");

  // Count approved in pool (approved but not published)
  const { count: approvedInPool } = await admin
    .from("pages")
    .select("id", { count: "exact", head: true })
    .eq("page_type", "blog")
    .eq("status", "approved");

  const totalInPool = (draftsInPool || 0) + (approvedInPool || 0);
  const daysOfContent = Math.floor(totalInPool / ARTICLES_PER_DAY);

  console.log(`Content Creator: pool has ${totalInPool} articles (~${daysOfContent} days). Buffer target: ${BUFFER_DAYS} days.`);

  // Determine how many days to draft
  // Always draft at least 1 day (2-3 articles from calendar).
  // If buffer is low, draft multiple days to fill it up.
  let daysToDraft: number;
  if (daysOfContent >= BUFFER_DAYS) {
    // Buffer is full — draft 1 day to maintain it
    daysToDraft = 1;
  } else {
    // Buffer is low — draft enough to fill it + 1 extra day
    daysToDraft = BUFFER_DAYS - daysOfContent + 1;
    console.log(`Content Creator: buffer low (${daysOfContent} days), drafting ${daysToDraft} days to catch up`);
  }

  // Load all used images once — shared across all articles in this run
  const usedImages = await getUsedImageUrls();
  let articlesWritten = 0;

  // Find the next dates to draft content for
  // Look at the calendar for the next N weekdays that haven't been written yet
  try {
    const { getTopicsForRange } = await import("./content-planner");

    // Find upcoming dates with approved calendar topics not yet written
    const today = new Date();
    const futureDate = new Date(today);
    futureDate.setDate(futureDate.getDate() + daysToDraft + 7); // look ahead enough
    const startStr = today.toISOString().split("T")[0];
    const endStr = futureDate.toISOString().split("T")[0];

    const allTopics = await getTopicsForRange(startStr, endStr);

    if (allTopics.length > 0) {
      // Group by date
      const byDate = new Map<string, typeof allTopics>();
      allTopics.forEach((t) => {
        if (!byDate.has(t.planned_date)) byDate.set(t.planned_date, []);
        byDate.get(t.planned_date)!.push(t);
      });

      // Draft up to daysToDraft worth of dates
      let daysProcessed = 0;
      for (const [date, topics] of byDate) {
        if (daysProcessed >= daysToDraft) break;

        console.log(`Content Creator: drafting ${topics.length} articles for ${date}`);
        for (const topic of topics) {
          const success = await writeOneArticle(
            topic.topic,
            topic.category,
            topic.brief,
            topic.keywords,
            topic.id,
            usedImages
          );
          if (success) articlesWritten++;
        }
        daysProcessed++;
      }
    } else {
      // No calendar topics — fall back to topic pool for 1 day
      console.log("Content Creator: no calendar topics, using topic pool");
      for (let i = 0; i < ARTICLES_PER_DAY; i++) {
        const topicInfo = await pickTopic();
        if (!topicInfo) break;
        const success = await writeOneArticle(topicInfo.topic, topicInfo.category, undefined, undefined, undefined, usedImages);
        if (success) articlesWritten++;
      }
    }
  } catch {
    // Content planner not available, use fallback
    console.log("Content Creator: planner unavailable, using topic pool");
    for (let i = 0; i < ARTICLES_PER_DAY; i++) {
      const topicInfo = await pickTopic();
      if (!topicInfo) break;
      const success = await writeOneArticle(topicInfo.topic, topicInfo.category, undefined, undefined, undefined, usedImages);
      if (success) articlesWritten++;
    }
  }

  console.log(`Content Creator: wrote ${articlesWritten} articles`);
  return articlesWritten > 0;
}

/**
 * Write a single article and save as draft.
 */
async function writeOneArticle(
  topic: string,
  category: string,
  brief?: string,
  keywords?: string[],
  calendarId?: string,
  usedImages?: Set<string>,
): Promise<boolean> {
  console.log(`Content Creator: writing "${topic}" (${category})`);

  // Generate article with Claude
  const article = await generateArticle(topic, category, brief, keywords);
  if (!article || !article.content) {
    console.error("Content Creator: article generation failed");
    return false;
  }

  // Determine image search query based on category
  const imageQueries: Record<string, string> = {
    "addiction-types": "recovery wellness nature calm",
    "treatment-types": "therapy wellness healing peaceful",
    "mental-health": "mental health mindfulness peaceful",
    "recovery-guides": "sunrise new beginning hope nature",
    "practical-guides": "planning notebook organized calm",
    "international-treatment": "travel wellness tropical healing",
    "family-support": "family support together caring",
  };
  const imageQuery = imageQueries[category] || "wellness recovery nature";

  // Search for images (1 featured + up to 4 inline), excluding already-used ones
  const images = await searchImages(imageQuery, 5, usedImages);
  const featuredImage = images[0] || null;
  const inlineImages = images.slice(1);

  // Build content with featured image and inline images
  let fullContent = article.content;

  // Replace image placeholders with real Unsplash images
  for (let i = 0; i < 4; i++) {
    const placeholder = `{{IMAGE_${i + 1}}}`;
    if (fullContent.includes(placeholder) && inlineImages[i]) {
      fullContent = fullContent.replace(placeholder, `\n![](${inlineImages[i]})\n`);
    } else {
      // Remove unused placeholders
      fullContent = fullContent.replace(placeholder, "");
    }
  }

  // Prepend featured image
  if (featuredImage) {
    fullContent = `![featured](${featuredImage})\n\n${fullContent}`;
  }

  // Ensure unique slug
  const admin = createAdminClient();
  const { data: slugCheck } = await admin
    .from("pages")
    .select("id")
    .eq("slug", article.slug)
    .single();

  const finalSlug = slugCheck
    ? `${article.slug}-${Date.now().toString(36)}`
    : article.slug;

  // Map category to user-friendly tags
  const CATEGORY_TAG_MAP: Record<string, string[]> = {
    "addiction-types": ["Addiction", "Substance Use"],
    "treatment-types": ["Treatment", "Rehabilitation"],
    "mental-health": ["Mental Health", "Wellness"],
    "recovery-guides": ["Recovery", "Sobriety"],
    "practical-guides": ["Guides", "Resources"],
    "international-treatment": ["International", "Medical Tourism"],
    "family-support": ["Family Support", "Relationships"],
  };
  const tags = CATEGORY_TAG_MAP[category] || [category.replace(/-/g, " ")];

  // Save as draft
  const { data: page, error } = await admin
    .from("pages")
    .insert({
      title: article.title,
      slug: finalSlug,
      content: fullContent,
      page_type: "blog",
      status: "draft",
      author_type: "rehabatlas",
      author_name: "Rehab-Atlas Editorial",
      meta_title: article.meta_title,
      meta_description: article.meta_description,
      tags,
    })
    .select("id")
    .single();

  if (error || !page) {
    console.error("Content Creator: failed to save draft:", error?.message);
    return false;
  }

  // Calculate word count
  const wordCount = article.content.split(/\s+/).length;

  // Create agent task for admin approval
  await createAgentTask({
    agent_type: "content_creator",
    entity_type: "page",
    entity_id: page.id as string,
    checklist: {
      title: article.title,
      slug: finalSlug,
      category,
      word_count: wordCount,
      has_featured_image: !!featuredImage,
      image_url: featuredImage,
      inline_images: inlineImages.length,
      meta_title: article.meta_title,
      meta_description: article.meta_description,
    },
    ai_summary: `New article drafted: "${article.title}" (${wordCount} words, ${category})`,
    ai_recommendation: "approve",
    confidence: 0.85,
  });

  await logAgentAction({
    agent_type: "content_creator",
    action: "article_drafted",
    details: {
      page_id: page.id,
      title: article.title,
      slug: finalSlug,
      category,
      word_count: wordCount,
      has_image: !!featuredImage,
      total_images: images.length,
    },
  });

  // Mark calendar entry as written if it came from the planner
  if (calendarId) {
    try {
      const { markCalendarWritten } = await import("./content-planner");
      await markCalendarWritten(calendarId, page.id as string);
    } catch {
      // Planner module not available
    }
  }

  console.log(`Content Creator: drafted "${article.title}" (${wordCount} words)`);
  return true;
}

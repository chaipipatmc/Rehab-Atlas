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
import { autoLinkArticle } from "@/lib/agents/auto-linker";
import {
  checkDuplicate,
  persistDedupVerdict,
  type DedupResult,
  type DedupCandidate,
} from "@/lib/agents/content-dedup";

// How many times we'll ask Claude to rewrite an article that came back as a
// duplicate before we give up and save the last attempt as a flagged draft
// for admin review.
const DEDUP_MAX_REWRITES = 2;

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
  // Family-first additions — written explicitly for the family member doing the research
  // (per Hills-style insight: ~70% of rehab inquiries come from family, not patients themselves)
  {
    category: "family-recognition",
    topics: [
      "How to Tell If Your Adult Child Is Using Meth",
      "Signs Your Spouse Has a Drinking Problem (Not Just Heavy Drinking)",
      "Is My Parent an Alcoholic? Honest Questions to Ask Yourself",
      "Catching Prescription Drug Abuse in a Family Member",
      "When 'Functional Addiction' Stops Being Functional: What Families Notice First",
      "Hidden Signs of Cocaine Use in a Partner or Roommate",
      "Recognizing Ketamine or Party Drug Use in Your Teenager",
      "Is Your Loved One Using Kratom? What Families Should Know",
      "Spotting an Eating Disorder in Your Daughter or Sister",
      "When Anxiety Becomes Self-Medication: Signs a Family Member Is Hiding It",
    ],
  },
  {
    category: "family-decision",
    topics: [
      "How to Choose a Rehab for Your Loved One: A Family's Step-by-Step Guide",
      "Convincing Your Adult Child to Enter Rehab Without Forcing Them",
      "Should You Send Your Loved One to Rehab Abroad? A Family Cost-Benefit Guide",
      "Inpatient vs. Outpatient for a Loved One Who Won't Leave Town",
      "How to Pay for a Family Member's Rehab Without Going Bankrupt",
      "What to Look for When Touring a Rehab Center (Or Asking Questions Remotely)",
      "Should You Tell Extended Family Your Loved One Is in Rehab?",
      "Choosing Between Local Rehab and Sending Your Loved One Far Away",
      "Red Flags When Vetting a Rehab Center for a Family Member",
      "How to Handle a Loved One Who Refuses Rehab",
    ],
  },
  {
    category: "family-during-after",
    topics: [
      "What to Expect While Your Loved One Is in Rehab: A Family Timeline",
      "How to Support Recovery Without Becoming the Sober Police",
      "Welcoming Your Loved One Home from Rehab: The First Two Weeks",
      "When Your Spouse Comes Home from Rehab: Repairing the Marriage",
      "How to Spot Relapse Warning Signs in a Family Member",
      "What to Do the First Time Your Loved One Relapses",
      "Talking to Children About a Parent's Addiction and Recovery",
      "Holidays After Rehab: How Families Can Make Them Easier",
      "When a Sibling's Addiction Affects the Whole Family",
      "Grieving the Loved One You Thought You Had — and Accepting Who They Are Now",
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

// ---- Pillar architecture (per CONTENT_STRATEGY.md §2-3) ---------------------
// The 10 /rehab/[condition] pages are our pillar pages. Every blog spoke maps
// to exactly one pillar and MUST link back to it. inferPillar() returns the
// best match for a given topic title, falling back to dual-diagnosis (the
// broadest medically meaningful pillar) when nothing else fits.

const PILLAR_DEFS: { slug: string; title: string; keywords: string[] }[] = [
  // Order matters — first match wins. Put more specific pillars before broader ones
  // (opioid before drug-addiction, eating-disorders before mental-health, etc.).
  { slug: "opioid-addiction", title: "Opioid Addiction Treatment", keywords: ["opioid", "opioids", "heroin", "fentanyl", "oxycodone", "buprenorphine", "methadone", "naltrexone", "mat ", "medication-assisted"] },
  { slug: "prescription-drug-abuse", title: "Prescription Drug Abuse Treatment", keywords: ["prescription", "benzo", "benzodiazepine", "xanax", "valium", "klonopin", "painkiller", "adderall", "stimulant abuse"] },
  { slug: "alcohol-addiction", title: "Alcohol Addiction Treatment", keywords: ["alcohol", "drinking", "aud ", "alcoholic", "alcoholism", "wine", "beer ", "binge drinking"] },
  { slug: "trauma-ptsd", title: "Trauma & PTSD Treatment", keywords: ["trauma", "ptsd", "post-traumatic", "emdr", "aces", "abuse survivor", "complex trauma", "veteran"] },
  { slug: "eating-disorders", title: "Eating Disorder Treatment", keywords: ["eating disorder", "anorexia", "bulimia", "binge eating", "body image", "purging"] },
  { slug: "gambling-addiction", title: "Gambling Addiction Treatment", keywords: ["gambling", "betting", "casino"] },
  { slug: "behavioral-addiction", title: "Behavioral Addiction Treatment", keywords: ["behavioral addiction", "process addiction", "internet addiction", "gaming", "porn", "sex addiction", "shopping addiction", "social media", "technology addiction"] },
  { slug: "dual-diagnosis", title: "Dual Diagnosis Treatment", keywords: ["dual diagnosis", "co-occurring", "co occurring", "comorbid"] },
  { slug: "mental-health", title: "Mental Health Treatment", keywords: ["mental health", "depression", "anxiety", "bipolar", "ocd", "psychiatric", "schizophrenia", "personality disorder"] },
  { slug: "drug-addiction", title: "Drug Addiction Treatment", keywords: ["drug", "cocaine", "methamphetamine", "meth", "ice", "shabu", "ketamine", "mdma", "ecstasy", "cannabis", "marijuana", "kratom"] },
];

/**
 * Infer the target pillar page for a topic/category combination.
 * Returns the matching pillar (slug + title). Falls back to dual-diagnosis
 * (broadest medical scope) when nothing matches.
 *
 * See CONTENT_STRATEGY.md §3 for the policy.
 */
export function inferPillar(topic: string, category?: string): { slug: string; title: string } {
  const haystack = `${topic} ${category || ""}`.toLowerCase();
  for (const p of PILLAR_DEFS) {
    if (p.keywords.some((kw) => haystack.includes(kw))) {
      return { slug: p.slug, title: p.title };
    }
  }
  return { slug: "dual-diagnosis", title: "Dual Diagnosis Treatment" };
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
    "family-recognition": "concerned parent thoughtful worried family",
    "family-decision": "family conversation home decision discussion",
    "family-during-after": "family reunion welcome home embrace",
  };

  return {
    ...pick,
    imageQuery: imageQueries[pick.category] || "wellness recovery nature",
  };
}

/**
 * Generate article content using Claude AI.
 */
/**
 * Build the "don't overlap with these existing articles" context that gets
 * appended to the user prompt when re-generating after a duplicate flag.
 */
function buildAvoidContext(
  candidates: DedupCandidate[],
  closest: DedupCandidate | null,
): string {
  const topThree = candidates.slice(0, 3);
  if (topThree.length === 0) return "";
  const lines = topThree.map(
    (c) =>
      `- "${c.title}"${c.meta_description ? ` — ${c.meta_description}` : ""}`,
  );
  const closestNote = closest
    ? `Your previous draft was flagged as a near-duplicate of "${closest.title}". `
    : "";
  return `IMPORTANT — AVOID DUPLICATING EXISTING CONTENT:
${closestNote}Rehab-Atlas already publishes these articles on adjacent topics:
${lines.join("\n")}

Cover the topic from a clearly DIFFERENT angle than the articles above. Pick a fresh hook, a different audience perspective, or a sub-aspect that those articles do not address in depth. Do not paraphrase; do not write the same article with different words.`;
}

async function generateArticle(
  topic: string,
  category: string,
  pillar: { slug: string; title: string },
  brief?: string,
  keywords?: string[],
  /**
   * Optional context appended to the user message when we're regenerating
   * after a duplicate flag. Tells Claude which existing articles to avoid
   * overlapping with and pushes for a different angle.
   */
  avoidContext?: string,
): Promise<{
  title: string;
  content: string;
  meta_title: string;
  meta_description: string;
  image_queries: string[];
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

PRIMARY AUDIENCE — READ THIS FIRST:
- Roughly 70% of readers are family members searching for help on behalf of a loved one — not patients themselves. Adult children worried about a parent. Spouses watching a marriage erode. Parents whose adult child has relapsed.
- Default to writing for the family member. Use "your loved one", "your son", "your daughter", "your spouse", "your parent" naturally. Address the reader as the person doing the research — not the person who needs treatment.
- When a topic could plausibly be written for either the patient or the family, choose the family lens by default. (e.g., "Signs of Meth Addiction" → "How to Tell If Your Adult Child Has a Meth Problem".)
- Patient-direct articles are still valid for recovery topics ("First 30 Days of Recovery", "Returning to Work After Rehab") — but even there, acknowledge family stakes (boundaries, relapse signals, how to communicate).
- Never moralize at the family. They are exhausted, scared, and often blamed by people who don't understand addiction. Treat them as the capable adults they are.

VOICE & TONE — THIS IS CRITICAL:
- Write like a seasoned journalist, NOT like an AI. Your writing must feel like it was crafted by a real person with genuine expertise.
- Open with a compelling hook — a surprising statistic, an expert quote, a piercing question, or a single observation about what families actually experience. NEVER start with a fictional character scenario (no "Sarah stared at her phone", no "John walked into the clinic"). NEVER start with a generic definition.
- Family-perspective hooks work well: "Most people don't recognize the early signs of meth use in someone they love." / "By the time a family decides to look up rehab options, they've usually been worrying for eighteen months."
- Use varied sentence structure. Mix short punchy sentences with longer flowing ones. Avoid repetitive patterns.
- Write in second-person ("you", "your loved one") when speaking to the family member directly. Use third-person ("families often find", "research shows") for context and evidence. Avoid first-person ("I", "my experience").
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

PILLAR LINKING — REQUIRED (per CONTENT_STRATEGY.md §6):
- This article belongs to the **${pillar.title}** pillar at /rehab/${pillar.slug}
- Within the first 250 words of body text, link to that pillar page using natural descriptive anchor text. Do NOT write "click here" or "read more" — use anchor text like "${pillar.title.toLowerCase()} programs" or "centers specializing in ${pillar.title.toLowerCase().replace(/ treatment$/, "")}"
- Format: [anchor text](/rehab/${pillar.slug})
- If the topic mentions a specific country or city, naturally include one country/city hub reference (the auto-linker will link it).
- Mention that readers can compare programs side-by-side or take an assessment at least once.

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
  "slug": "url-friendly-slug",
  "image_queries": ["5 specific image search queries for this article - each should find a photo that visually represents a key section of this specific article. Be descriptive and specific to THIS topic, not generic. Example for an article about EMDR therapy: 'therapist guiding patient through EMDR session', 'brain neural pathways healing illustration', 'woman in therapy session peaceful office', 'trauma recovery support group therapy', 'calm meditation mindfulness practice'"]
}`,
      messages: [
        {
          role: "user",
          content: `Write a comprehensive article about: "${topic}"\n\nCategory: ${category}\nTarget pillar: ${pillar.title} (/rehab/${pillar.slug}) — link back to this in the first 250 words.${brief ? `\n\nBrief: ${brief}` : ""}${keywords?.length ? `\n\nTarget keywords: ${keywords.join(", ")}` : ""}${avoidContext ? `\n\n${avoidContext}` : ""}\n\nWrite the article now.`,
        },
      ],
    });

    // Log usage
    await logClaudeUsage(response, "content_creator", "article_generation", "claude-sonnet-4-20250514", { topic, category, pillar: pillar.slug });

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
      image_queries: Array.isArray(parsed.image_queries) ? parsed.image_queries : [],
    };
  } catch (err) {
    console.error("Article generation failed:", err);
    return null;
  }
}

// Default knobs — admin can override these via /admin/agents → settings,
// stored in site_settings under agent_content_creator_setting_*.
const DEFAULT_POOL_TARGET = 20;
const DEFAULT_ARTICLES_PER_DAY = 3;

/**
 * Main function: write articles from the content calendar.
 *
 * Buffer strategy:
 * - Check how many days of drafts are in the pool
 * - If < BUFFER_DAYS, draft multiple days to fill the buffer
 * - If >= BUFFER_DAYS, draft only the next day's content
 * - This ensures there are always ~5 days of content ready for approval
 */
export async function createArticleDraft(options?: {
  maxArticles?: number;
  skipWeekendCheck?: boolean;
}): Promise<{ written: number; poolSize: number }> {
  const enabled = await isAgentEnabled("content_creator");
  if (!enabled) return { written: 0, poolSize: 0 };

  // Read knobs from site_settings (with defaults)
  const { getAgentSettingNumber } = await import("./config");
  const POOL_TARGET = await getAgentSettingNumber(
    "content_creator",
    "pool_target",
    DEFAULT_POOL_TARGET
  );
  const ARTICLES_PER_DAY = await getAgentSettingNumber(
    "content_creator",
    "articles_per_run",
    DEFAULT_ARTICLES_PER_DAY
  );

  // Skip weekends (unless overridden for pool fill)
  if (!options?.skipWeekendCheck) {
    const day = new Date().getDay();
    if (day === 0 || day === 6) {
      console.log("Content Creator: skipping weekend");
      return { written: 0, poolSize: 0 };
    }
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

  console.log(`Content Creator: pool has ${totalInPool}/${POOL_TARGET} articles.`);

  if (totalInPool >= POOL_TARGET && !options?.maxArticles) {
    console.log("Content Creator: pool is full, skipping");
    return { written: 0, poolSize: totalInPool };
  }

  // Calculate how many articles to draft
  const articlesNeeded = options?.maxArticles || (
    totalInPool >= POOL_TARGET ? ARTICLES_PER_DAY : POOL_TARGET - totalInPool
  );
  const daysToDraft = Math.ceil(articlesNeeded / ARTICLES_PER_DAY);
  console.log(`Content Creator: will draft up to ${articlesNeeded} articles (~${daysToDraft} days)`);

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
    futureDate.setDate(futureDate.getDate() + daysToDraft + 14); // look ahead enough
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

      // Draft articles across dates until we hit the limit
      for (const [date, topics] of byDate) {
        if (articlesWritten >= articlesNeeded) break;

        console.log(`Content Creator: drafting ${topics.length} articles for ${date}`);
        for (const topic of topics) {
          if (articlesWritten >= articlesNeeded) break;
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
      }
    } else {
      // No calendar topics — fall back to topic pool
      console.log("Content Creator: no calendar topics, using topic pool");
      for (let i = 0; i < articlesNeeded; i++) {
        const topicInfo = await pickTopic();
        if (!topicInfo) break;
        const success = await writeOneArticle(topicInfo.topic, topicInfo.category, undefined, undefined, undefined, usedImages);
        if (success) articlesWritten++;
      }
    }
  } catch {
    // Content planner not available, use fallback
    console.log("Content Creator: planner unavailable, using topic pool");
    for (let i = 0; i < Math.min(articlesNeeded, ARTICLES_PER_DAY); i++) {
      const topicInfo = await pickTopic();
      if (!topicInfo) break;
      const success = await writeOneArticle(topicInfo.topic, topicInfo.category, undefined, undefined, undefined, usedImages);
      if (success) articlesWritten++;
    }
  }

  console.log(`Content Creator: wrote ${articlesWritten} articles`);
  return { written: articlesWritten, poolSize: totalInPool + articlesWritten };
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
  // Resolve the pillar this article belongs to (see CONTENT_STRATEGY.md §3).
  const pillar = inferPillar(topic, category);
  console.log(`Content Creator: writing "${topic}" (${category} → ${pillar.slug})`);

  // Generate the article, then dedup-check it. If Claude flags it as a
  // duplicate of something we already published, re-prompt with an avoid-list
  // and try again up to DEDUP_MAX_REWRITES times. Final attempt is saved
  // regardless — if still flagged, it's a draft for admin review.
  let article: Awaited<ReturnType<typeof generateArticle>> = null;
  let dedupResult: DedupResult | null = null;
  let dedupRetries = 0;
  let avoidContext: string | undefined;

  for (let attempt = 0; attempt <= DEDUP_MAX_REWRITES; attempt++) {
    article = await generateArticle(topic, category, pillar, brief, keywords, avoidContext);
    if (!article || !article.content) {
      console.error("Content Creator: article generation failed");
      return false;
    }

    dedupResult = await checkDuplicate({
      title: article.title,
      meta_description: article.meta_description,
      content: article.content,
    });

    if (!dedupResult.isDuplicate) {
      if (attempt > 0) {
        console.log(`Content Creator: dedup cleared after ${attempt} rewrite(s)`);
      }
      break;
    }

    dedupRetries = attempt + 1;
    console.log(
      `Content Creator: dedup FLAGGED (attempt ${attempt + 1}/${DEDUP_MAX_REWRITES + 1}) — closest: ${dedupResult.closestMatch?.slug ?? "?"} — ${dedupResult.reasoning}`,
    );

    if (attempt < DEDUP_MAX_REWRITES) {
      avoidContext = buildAvoidContext(dedupResult.candidates, dedupResult.closestMatch);
    }
  }

  // Both are guaranteed non-null by the loop above (we always do at least one
  // generation + checkDuplicate before exiting; failure returns early).
  const finalArticle = article!;
  const finalDedupResult = dedupResult!;

  // Use article-specific image queries from Claude, fall back to topic-based.
  // Track each image alongside the descriptive query that produced it so we
  // can use it as alt text for accessibility and image SEO.
  const articleQueries = finalArticle.image_queries || [];
  const imagePairs: Array<{ url: string; alt: string }> = [];

  if (articleQueries.length > 0) {
    for (const q of articleQueries.slice(0, 5)) {
      if (imagePairs.length >= 5) break;
      const found = await searchImages(q, 1, usedImages);
      if (found.length > 0) {
        imagePairs.push({ url: found[0], alt: q });
        usedImages?.add(found[0]);
      }
    }
  }

  // Fallback: any remaining slots get topic-based search and a generic alt
  // derived from the article topic.
  if (imagePairs.length < 5) {
    const fallbackQuery = topic.replace(/[^a-zA-Z ]/g, "").slice(0, 60);
    const fallback = await searchImages(fallbackQuery, 5 - imagePairs.length, usedImages);
    for (const url of fallback) {
      imagePairs.push({ url, alt: topic });
    }
  }

  const featured = imagePairs[0] || null;
  const inline = imagePairs.slice(1);

  // Sanitize alt text: strip characters that would break markdown image syntax.
  function altSafe(s: string, fallback: string): string {
    const cleaned = (s || "")
      .replace(/[\[\]()\n\r"]/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 120);
    return cleaned || fallback;
  }

  // Build content with featured image and inline images
  let fullContent = finalArticle.content;

  // Replace image placeholders with real Unsplash images + descriptive alt text
  for (let i = 0; i < 4; i++) {
    const placeholder = `{{IMAGE_${i + 1}}}`;
    if (fullContent.includes(placeholder) && inline[i]) {
      const alt = altSafe(inline[i].alt, topic);
      fullContent = fullContent.replace(placeholder, `\n![${alt}](${inline[i].url})\n`);
    } else {
      // Remove unused placeholders
      fullContent = fullContent.replace(placeholder, "");
    }
  }

  // Prepend featured image. The "featured" alt is a marker the renderer uses
  // to extract+strip the hero image; the descriptive text rides as the
  // markdown title attribute so it can be promoted to img@alt at render time.
  if (featured) {
    const alt = altSafe(featured.alt, topic);
    fullContent = `![featured](${featured.url} "${alt}")\n\n${fullContent}`;
  }

  // Ensure unique slug
  const admin = createAdminClient();
  const { data: slugCheck } = await admin
    .from("pages")
    .select("id")
    .eq("slug", finalArticle.slug)
    .single();

  const finalSlug = slugCheck
    ? `${finalArticle.slug}-${Date.now().toString(36)}`
    : finalArticle.slug;

  // Auto-insert internal links to condition + country/city landing pages.
  // Passing `pillar` guarantees a back-link to the pillar page — if Claude
  // didn't include it naturally, auto-linker force-inserts one. See
  // CONTENT_STRATEGY.md §6.
  const { content: linkedContent, linksAdded } = await autoLinkArticle(fullContent, {
    currentHref: `/blog/${finalSlug}`,
    pillar,
  });
  fullContent = linkedContent;

  // Map category to user-friendly tags
  const CATEGORY_TAG_MAP: Record<string, string[]> = {
    "addiction-types": ["Addiction", "Substance Use", "Recovery", "Treatment"],
    "treatment-types": ["Treatment", "Rehabilitation", "Recovery", "Therapy"],
    "mental-health": ["Mental Health", "Wellness", "Therapy", "Recovery"],
    "recovery-guides": ["Recovery", "Sobriety", "Relapse Prevention", "Wellness"],
    "practical-guides": ["Guides", "Resources", "Treatment", "Recovery"],
    "international-treatment": ["International", "Medical Tourism", "Treatment", "Rehabilitation"],
    "family-support": ["Family Support", "Relationships", "Recovery", "Wellness"],
    "family-recognition": ["For Families", "Warning Signs", "Addiction", "Family Support"],
    "family-decision": ["For Families", "Choosing Rehab", "Family Support", "Guides"],
    "family-during-after": ["For Families", "Recovery", "Family Support", "Relapse Prevention"],
  };
  const tags = CATEGORY_TAG_MAP[category] || [category.replace(/-/g, " "), "Recovery", "Treatment", "Wellness"];

  // Save as draft
  const { data: page, error } = await admin
    .from("pages")
    .insert({
      title: finalArticle.title,
      slug: finalSlug,
      content: fullContent,
      page_type: "blog",
      status: "draft",
      author_type: "rehabatlas",
      author_name: "Rehab-Atlas Editorial",
      meta_title: finalArticle.meta_title,
      meta_description: finalArticle.meta_description,
      tags,
    })
    .select("id")
    .single();

  if (error || !page) {
    console.error("Content Creator: failed to save draft:", error?.message);
    return false;
  }

  // Persist the dedup verdict on the new row so admin can see it in
  // /admin/content. status='clear' means it passed all retries; status=
  // 'flagged' means it's still a near-duplicate after the rewrite loop and
  // needs admin review before approval.
  await persistDedupVerdict(page.id as string, finalDedupResult, dedupRetries);

  // Calculate word count
  const wordCount = finalArticle.content.split(/\s+/).length;

  // Create agent task for admin approval
  await createAgentTask({
    agent_type: "content_creator",
    entity_type: "page",
    entity_id: page.id as string,
    checklist: {
      title: finalArticle.title,
      slug: finalSlug,
      category,
      word_count: wordCount,
      has_featured_image: !!featured,
      image_url: featured?.url ?? null,
      inline_images: inline.length,
      meta_title: finalArticle.meta_title,
      meta_description: finalArticle.meta_description,
    },
    ai_summary: `New article drafted: "${finalArticle.title}" (${wordCount} words, ${category})`,
    ai_recommendation: "approve",
    confidence: 0.85,
  });

  await logAgentAction({
    agent_type: "content_creator",
    action: "article_drafted",
    details: {
      page_id: page.id,
      title: finalArticle.title,
      slug: finalSlug,
      category,
      word_count: wordCount,
      has_image: !!featured,
      total_images: imagePairs.length,
      internal_links_added: linksAdded.length,
      dedup_status: finalDedupResult.isDuplicate ? "flagged" : "clear",
      dedup_closest_slug: finalDedupResult.closestMatch?.slug ?? null,
      dedup_retry_count: dedupRetries,
      dedup_judged_by_claude: finalDedupResult.judgedByClaude,
      internal_links: linksAdded,
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

  console.log(`Content Creator: drafted "${finalArticle.title}" (${wordCount} words)`);
  return true;
}

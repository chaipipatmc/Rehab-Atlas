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
 * Search Unsplash for relevant images.
 * Returns up to `count` image URLs.
 */
async function searchUnsplashImages(query: string, count: number = 5): Promise<string[]> {
  const accessKey = process.env.UNSPLASH_ACCESS_KEY?.trim();
  if (!accessKey) {
    console.warn("UNSPLASH_ACCESS_KEY not set, skipping images");
    return [];
  }

  try {
    const response = await fetch(
      `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&orientation=landscape&per_page=${count}`,
      { headers: { Authorization: `Client-ID ${accessKey}` } }
    );

    if (!response.ok) return [];

    const data = await response.json();
    const photos = data.results || [];

    return photos
      .map((p: Record<string, unknown>) => {
        const urls = p.urls as Record<string, string> | undefined;
        return urls?.regular || urls?.small || null;
      })
      .filter(Boolean) as string[];
  } catch {
    return [];
  }
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
async function generateArticle(topic: string, category: string): Promise<{
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
      system: `You are a health content writer for Rehab-Atlas, a global platform connecting people with rehabilitation centers. Write authoritative, empathetic, SEO-optimized blog articles about addiction, mental health, and recovery.

WRITING RULES:
- Write 1500-2000 words in markdown format
- Use H2 (##) for main sections and H3 (###) for subsections
- Be empathetic and non-judgmental — readers may be in crisis
- NEVER give specific medical advice — always recommend consulting professionals
- Include relevant statistics and facts (cite general sources like WHO, NIDA, SAMHSA)
- Link naturally to [our assessment tool](/assessment) and [center directory](/centers) where relevant
- End with a "Frequently Asked Questions" section with 5 FAQs using ### for each question
- Tone: warm, authoritative, hopeful — like a trusted counselor
- Avoid stigmatizing language: say "person with addiction" not "addict"
- Include a brief conclusion with an encouraging message

IMAGE PLACEHOLDERS:
- Insert exactly 3-4 image placeholders between sections using this format: {{IMAGE_1}}, {{IMAGE_2}}, {{IMAGE_3}}, {{IMAGE_4}}
- Place them BETWEEN sections (after an H2 heading's content, before the next H2)
- Do NOT put them at the very beginning or end — spread them evenly through the article
- Each placeholder should be on its own line

SEO RULES:
- Use the main keyword in the first paragraph
- Include related long-tail keywords naturally throughout
- Keep paragraphs short (2-3 sentences max)
- Use bullet points and numbered lists for scanability

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
          content: `Write a comprehensive article about: "${topic}"\n\nCategory: ${category}\n\nWrite the article now.`,
        },
      ],
    });

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

/**
 * Main function: research, write, and save a draft article.
 */
export async function createArticleDraft(): Promise<boolean> {
  const enabled = await isAgentEnabled("content_creator");
  if (!enabled) return false;

  // Skip weekends (Saturday=6, Sunday=0)
  const day = new Date().getDay();
  if (day === 0 || day === 6) {
    console.log("Content Creator: skipping weekend");
    return false;
  }

  // Pick a topic
  const topicInfo = await pickTopic();
  if (!topicInfo) {
    console.log("Content Creator: all topics covered, no new topic to write");
    return false;
  }

  console.log(`Content Creator: writing about "${topicInfo.topic}" (${topicInfo.category})`);

  // Generate article with Claude
  const article = await generateArticle(topicInfo.topic, topicInfo.category);
  if (!article || !article.content) {
    console.error("Content Creator: article generation failed");
    return false;
  }

  // Search for images (1 featured + up to 4 inline)
  const images = await searchUnsplashImages(topicInfo.imageQuery, 5);
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
      category: topicInfo.category,
      word_count: wordCount,
      has_featured_image: !!featuredImage,
      image_url: featuredImage,
      inline_images: inlineImages.length,
      meta_title: article.meta_title,
      meta_description: article.meta_description,
    },
    ai_summary: `New article drafted: "${article.title}" (${wordCount} words, ${topicInfo.category})`,
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
      category: topicInfo.category,
      word_count: wordCount,
      has_image: !!featuredImage,
      total_images: images.length,
    },
  });

  console.log(`Content Creator: drafted "${article.title}" (${wordCount} words)`);
  return true;
}

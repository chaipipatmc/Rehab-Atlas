import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { countryToSlug } from "@/lib/utils";
import { CenterCard } from "@/components/centers/center-card";
import {
  BreadcrumbJsonLd,
  MedicalWebPageJsonLd,
} from "@/components/shared/json-ld";
import { Button } from "@/components/ui/button";
import {
  MapPin,
  Building2,
  ArrowRight,
  Globe,
  CheckCircle,
  BookOpen,
} from "lucide-react";
import type { Center, CenterPhoto } from "@/types/center";
import Anthropic from "@anthropic-ai/sdk";

export const revalidate = 3600;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CountryParagraph {
  title: string;
  text: string;
}

interface UnsplashImage {
  url: string;
  alt: string;
  photographer: string;
  photographerUrl: string;
}

interface CountryContent {
  paragraphs: CountryParagraph[];
  highlights: string[];
  images: UnsplashImage[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function extractFeaturedImage(content: string | null): string | null {
  if (!content) return null;
  const match = content.match(/!\[featured\]\(([^)]+)\)/);
  return match ? match[1] : null;
}

function estimateReadTime(content: string | null): string {
  if (!content) return "3 min read";
  const words = content.split(/\s+/).length;
  return `${Math.max(3, Math.ceil(words / 200))} min read`;
}

// ---------------------------------------------------------------------------
// Unsplash — only called during generation, results cached in DB
// ---------------------------------------------------------------------------

async function fetchUnsplashImages(
  queries: string[]
): Promise<UnsplashImage[]> {
  const key = process.env.UNSPLASH_ACCESS_KEY;
  if (!key) return [];

  const results: UnsplashImage[] = [];
  for (const query of queries) {
    try {
      const res = await fetch(
        `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&orientation=landscape&per_page=1`,
        { headers: { Authorization: `Client-ID ${key}` } }
      );
      if (!res.ok) continue;
      const data = await res.json();
      const photo = data.results?.[0];
      if (photo) {
        results.push({
          url: `${photo.urls.raw}&w=1200&q=80&auto=format&fit=crop`,
          alt: photo.alt_description || query,
          photographer: photo.user?.name || "Unsplash",
          photographerUrl:
            photo.user?.links?.html || "https://unsplash.com",
        });
      }
    } catch {
      /* skip */
    }
  }
  return results;
}

// ---------------------------------------------------------------------------
// Country resolution
// ---------------------------------------------------------------------------

async function resolveCountry(slug: string): Promise<string | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("centers")
    .select("country")
    .eq("status", "published");
  if (!data) return null;

  const unique = [
    ...new Set(data.map((c) => c.country).filter(Boolean)),
  ] as string[];
  return unique.find((name) => countryToSlug(name) === slug) ?? null;
}

// ---------------------------------------------------------------------------
// Content generation + DB cache (text + images cached together)
// ---------------------------------------------------------------------------

async function getOrGenerateContent(
  countryName: string,
  countrySlug: string
): Promise<CountryContent> {
  const supabase = await createClient();
  const admin = createAdminClient();

  // 1. Check DB cache
  const { data: cached } = await supabase
    .from("country_descriptions")
    .select("description, highlights, images")
    .eq("country_slug", countrySlug)
    .single();

  if (cached?.description) {
    try {
      const parsed = JSON.parse(cached.description);
      if (Array.isArray(parsed.paragraphs) && parsed.paragraphs.length >= 2) {
        return {
          paragraphs: parsed.paragraphs,
          highlights: (cached.highlights as string[]) ?? [],
          images: (cached.images as UnsplashImage[]) ?? [],
        };
      }
    } catch {
      // Old format — regenerate
    }
  }

  // 2. Gather center stats for AI prompt
  const { data: centers } = await supabase
    .from("centers")
    .select("treatment_focus, conditions, price_min, price_max")
    .eq("status", "published")
    .eq("country", countryName);

  const centerCount = centers?.length ?? 0;
  const allFocus: string[] = [];
  const allConditions: string[] = [];
  let minPrice: number | null = null;
  let maxPrice: number | null = null;

  for (const c of centers ?? []) {
    if (Array.isArray(c.treatment_focus)) allFocus.push(...c.treatment_focus);
    if (Array.isArray(c.conditions)) allConditions.push(...c.conditions);
    if (c.price_min != null && (minPrice === null || c.price_min < minPrice))
      minPrice = c.price_min;
    if (c.price_max != null && (maxPrice === null || c.price_max > maxPrice))
      maxPrice = c.price_max;
  }

  const topItems = (arr: string[], n: number) => {
    const freq: Record<string, number> = {};
    for (const item of arr) freq[item] = (freq[item] || 0) + 1;
    return Object.entries(freq)
      .sort((a, b) => b[1] - a[1])
      .slice(0, n)
      .map(([k]) => k);
  };
  const topFocus = topItems(allFocus, 5);
  const topConditions = topItems(allConditions, 5);
  const priceRange =
    minPrice != null && maxPrice != null
      ? `$${minPrice.toLocaleString()} - $${maxPrice.toLocaleString()}`
      : "varies";

  // 3. Generate AI paragraphs + fetch images in parallel
  const [aiResult, images] = await Promise.all([
    generateAIContent(countryName, centerCount, topFocus, topConditions, priceRange),
    fetchUnsplashImages([
      `${countryName} famous landmark scenery`,
      `${countryName} wellness spa retreat`,
      `${countryName} peaceful nature landscape`,
    ]),
  ]);

  // 4. Persist everything to DB
  await admin.from("country_descriptions").upsert(
    {
      country_slug: countrySlug,
      country_name: countryName,
      description: JSON.stringify({ paragraphs: aiResult.paragraphs }),
      highlights: aiResult.highlights,
      images,
      generated_at: new Date().toISOString(),
    },
    { onConflict: "country_slug" }
  );

  return { ...aiResult, images };
}

async function generateAIContent(
  countryName: string,
  centerCount: number,
  topFocus: string[],
  topConditions: string[],
  priceRange: string
): Promise<{ paragraphs: CountryParagraph[]; highlights: string[] }> {
  if (process.env.ANTHROPIC_API_KEY) {
    try {
      const client = new Anthropic();
      const message = await client.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1200,
        messages: [
          {
            role: "user",
            content: `Write content for a rehab center directory landing page about ${countryName}.

Stats: ${centerCount} centers, specialties: ${topFocus.join(", ") || "various"}, conditions: ${topConditions.join(", ") || "various"}, price range: ${priceRange}/month.

Return ONLY valid JSON (no markdown, no code fences):
{
  "paragraphs": [
    {
      "title": "Recovery in ${countryName}",
      "text": "4-6 sentences about why ${countryName} is a compelling destination for rehabilitation. Mention the therapeutic environment, culture of care, natural beauty, and what draws people there."
    },
    {
      "title": "World-Class Treatment Programs",
      "text": "4-6 sentences about treatment quality and variety. Mention evidence-based approaches, clinical expertise, types of conditions treated. Be specific to ${countryName}."
    },
    {
      "title": "What to Expect",
      "text": "4-6 sentences about the practical experience. Cover environment, lifestyle, aftercare, and how the setting supports long-term recovery."
    }
  ],
  "highlights": ["4 concise bullet points about key advantages of rehab in ${countryName}"]
}

Warm, professional, compassionate tone. No specific prices or counts. Each paragraph distinct and SEO-rich with natural keywords.`,
          },
        ],
      });

      const text =
        message.content[0].type === "text" ? message.content[0].text : "";
      const parsed = JSON.parse(text);
      if (Array.isArray(parsed.paragraphs) && parsed.paragraphs.length >= 2) {
        return {
          paragraphs: parsed.paragraphs,
          highlights: Array.isArray(parsed.highlights)
            ? parsed.highlights
            : [],
        };
      }
    } catch {
      /* fall through */
    }
  }

  // Template fallback
  return {
    paragraphs: [
      {
        title: `Recovery in ${countryName}`,
        text: `${countryName} has become an increasingly sought-after destination for individuals seeking rehabilitation and recovery. The country offers a unique blend of professional healthcare standards and therapeutic environments that support healing. With a growing number of accredited facilities, those seeking treatment can find programs that match their specific needs and preferences. The combination of qualified clinical teams and supportive surroundings creates an ideal foundation for lasting recovery.`,
      },
      {
        title: "World-Class Treatment Programs",
        text: `Rehabilitation centers in ${countryName} provide evidence-based treatment programs that address a wide range of conditions, from substance use disorders to mental health challenges. Many facilities employ internationally trained clinicians who bring diverse therapeutic approaches, including cognitive behavioral therapy, holistic wellness programs, and medically supervised detoxification. This comprehensive approach ensures that each individual receives personalized care tailored to their unique circumstances and recovery goals.`,
      },
      {
        title: "What to Expect",
        text: `Attending rehab in ${countryName} means immersing yourself in an environment designed to promote healing and personal growth. Facilities range from serene residential programs in natural settings to modern outpatient clinics in urban centers. Most programs include structured daily activities, individual and group therapy, and aftercare planning to support your transition back to daily life. The focus is always on building sustainable habits and coping strategies for long-term recovery.`,
      },
    ],
    highlights: [
      `${centerCount > 0 ? centerCount : "Multiple"} verified rehabilitation facilities`,
      topFocus.length > 0
        ? `Specialties include ${topFocus.slice(0, 3).join(", ")}`
        : "Wide range of treatment specialties",
      topConditions.length > 0
        ? `Treatment for ${topConditions.slice(0, 3).join(", ")}`
        : "Comprehensive condition coverage",
      "Professional clinical teams with international experience",
    ],
  };
}

// ---------------------------------------------------------------------------
// Metadata (SEO)
// ---------------------------------------------------------------------------

interface PageProps {
  params: Promise<{ country: string }>;
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { country: slug } = await params;
  const countryName = await resolveCountry(slug);
  if (!countryName) return {};

  const title = `Best Rehab Centers in ${countryName} — Verified Programs | Rehab-Atlas`;
  const description = `Find the best rehabilitation centers in ${countryName}. Compare verified treatment programs, read expert reviews, and start your recovery journey. Trusted by thousands worldwide.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: `https://rehab-atlas.com/rehab-in/${slug}`,
      type: "website",
      siteName: "Rehab-Atlas",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
    alternates: {
      canonical: `https://rehab-atlas.com/rehab-in/${slug}`,
    },
  };
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function CountryRehabPage({ params }: PageProps) {
  const { country: slug } = await params;
  const countryName = await resolveCountry(slug);
  if (!countryName) notFound();

  const supabase = await createClient();

  // Fetch content + centers + blog posts in parallel
  const [content, centersResult, postsResult] = await Promise.all([
    getOrGenerateContent(countryName, slug),
    supabase
      .from("centers")
      .select(
        "*, photos:center_photos(id, url, alt_text, sort_order, is_primary)"
      )
      .eq("status", "published")
      .eq("country", countryName)
      .order("trusted_partner", { ascending: false })
      .order("verified_profile", { ascending: false })
      .order("is_unclaimed", { ascending: true })
      .order("editorial_overall", { ascending: false, nullsFirst: false }),
    supabase
      .from("pages")
      .select("slug, title, meta_description, published_at, content, tags")
      .eq("page_type", "blog")
      .eq("status", "published")
      .or(
        `tags.cs.{${countryName}},tags.cs.{International},tags.cs.{international}`
      )
      .order("published_at", { ascending: false })
      .limit(6),
  ]);

  const { paragraphs, highlights, images } = content;
  const centers = centersResult.data;
  const posts = postsResult.data;
  const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://rehab-atlas.com";
  const centerCount = centers?.length ?? 0;
  const heroImage = images[0] ?? null;

  return (
    <div className="bg-surface min-h-screen">
      <BreadcrumbJsonLd
        items={[
          { name: "Home", url: BASE_URL },
          { name: "Rehab Destinations", url: `${BASE_URL}/rehab-in` },
          { name: countryName, url: `${BASE_URL}/rehab-in/${slug}` },
        ]}
      />
      <MedicalWebPageJsonLd
        title={`Rehabilitation Centers in ${countryName}`}
        description={paragraphs[0]?.text || ""}
        url={`${BASE_URL}/rehab-in/${slug}`}
      />

      {/* ── Hero ── */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0">
          {heroImage ? (
            <>
              <img
                src={heroImage.url}
                alt={heroImage.alt}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-[#45636b]/90 via-[#45636b]/70 to-[#45636b]/40" />
            </>
          ) : (
            <>
              <div className="absolute inset-0 bg-gradient-to-br from-[#45636b] to-[#2d4a52]" />
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(255,255,255,0.08),transparent_60%)]" />
            </>
          )}
        </div>

        <div className="relative container mx-auto px-4 sm:px-6 py-16 md:py-24">
          <nav
            aria-label="Breadcrumb"
            className="flex items-center gap-2 text-xs text-white/50 mb-8"
          >
            <Link href="/" className="hover:text-white/80 transition-colors">
              Home
            </Link>
            <span>/</span>
            <Link
              href="/rehab-in"
              className="hover:text-white/80 transition-colors"
            >
              Destinations
            </Link>
            <span>/</span>
            <span className="text-white/80">{countryName}</span>
          </nav>

          <div className="max-w-3xl">
            <div className="flex items-center gap-2 text-white/60 text-sm mb-4">
              <Globe className="h-4 w-4" />
              <span>Rehab Destination</span>
            </div>

            <h1 className="text-4xl md:text-5xl font-serif font-semibold text-white leading-tight">
              Rehabilitation in {countryName}
            </h1>

            <p className="mt-4 text-base md:text-lg text-white/80 leading-relaxed max-w-2xl">
              {paragraphs[0]?.text?.split(". ").slice(0, 2).join(". ")}.
            </p>

            <div className="flex flex-wrap items-center gap-3 mt-6">
              <span className="inline-flex items-center gap-1.5 bg-white/10 backdrop-blur-sm text-white/90 text-sm rounded-full px-4 py-1.5">
                <Building2 className="h-3.5 w-3.5" />
                {centerCount} {centerCount === 1 ? "Center" : "Centers"}
              </span>
              <span className="inline-flex items-center gap-1.5 bg-white/10 backdrop-blur-sm text-white/90 text-sm rounded-full px-4 py-1.5">
                <MapPin className="h-3.5 w-3.5" />
                {countryName}
              </span>
            </div>
          </div>

          {heroImage && (
            <p className="absolute bottom-3 right-4 text-[10px] text-white/30">
              Photo by{" "}
              <a
                href={`${heroImage.photographerUrl}?utm_source=rehab-atlas&utm_medium=referral`}
                target="_blank"
                rel="noopener noreferrer"
                className="underline"
              >
                {heroImage.photographer}
              </a>{" "}
              on Unsplash
            </p>
          )}
        </div>
      </section>

      {/* ── Content: alternating text + image sections ── */}
      <section className="container mx-auto px-4 sm:px-6 py-12 md:py-20">
        <div className="max-w-5xl mx-auto space-y-16 md:space-y-24">
          {paragraphs.map((para, i) => {
            const image = images[i] ?? null;
            const reversed = i % 2 === 1;

            return (
              <article
                key={i}
                className={`flex flex-col ${reversed ? "md:flex-row-reverse" : "md:flex-row"} gap-8 md:gap-12 items-center`}
              >
                {/* Text */}
                <div className="flex-1">
                  <h2 className="text-2xl md:text-3xl font-serif font-semibold text-foreground mb-4">
                    {para.title}
                  </h2>
                  <p className="text-sm md:text-base text-muted-foreground leading-relaxed">
                    {para.text}
                  </p>
                </div>

                {/* Image */}
                {image && (
                  <div className="flex-1 w-full">
                    <div className="relative aspect-[4/3] rounded-2xl overflow-hidden shadow-ambient-lg">
                      <img
                        src={image.url}
                        alt={image.alt}
                        loading={i === 0 ? "eager" : "lazy"}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <p className="text-[10px] text-muted-foreground/50 mt-2 text-right">
                      Photo by{" "}
                      <a
                        href={`${image.photographerUrl}?utm_source=rehab-atlas&utm_medium=referral`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline"
                      >
                        {image.photographer}
                      </a>{" "}
                      on Unsplash
                    </p>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      </section>

      {/* ── Highlights ── */}
      {highlights.length > 0 && (
        <section className="bg-surface-container-low">
          <div className="container mx-auto px-4 sm:px-6 py-12 md:py-16">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-2xl md:text-3xl font-serif font-semibold text-foreground text-center">
                Why Choose {countryName} for Rehab?
              </h2>
              <div className="grid sm:grid-cols-2 gap-4 mt-8">
                {highlights.map((h, i) => (
                  <div
                    key={i}
                    className="flex gap-3 p-5 rounded-2xl bg-surface-container-lowest shadow-ambient"
                  >
                    <CheckCircle className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-foreground leading-relaxed">
                      {h}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ── Centers Grid ── */}
      <section className="container mx-auto px-4 sm:px-6 py-12 md:py-16">
        <div className="flex items-end justify-between mb-8">
          <div>
            <h2 className="text-2xl md:text-3xl font-serif font-semibold text-foreground">
              Centers in {countryName}
            </h2>
            <p className="text-sm text-muted-foreground mt-2">
              {centerCount} verified{" "}
              {centerCount === 1 ? "facility" : "facilities"} available
            </p>
          </div>
          <Button
            variant="outline"
            className="rounded-full ghost-border border-0 text-sm hover:bg-surface-container transition-colors duration-300"
            asChild
          >
            <Link href={`/centers?country=${countryName}`}>
              View All <ArrowRight className="h-4 w-4 ml-1.5" />
            </Link>
          </Button>
        </div>

        {centers && centers.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {centers.map((center) => (
              <CenterCard
                key={center.id as string}
                center={
                  center as unknown as Center & { photos?: CenterPhoto[] }
                }
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-16 rounded-2xl bg-surface-container-lowest shadow-ambient">
            <Building2 className="h-10 w-10 text-muted-foreground mx-auto mb-4" />
            <p className="text-lg font-serif text-foreground">
              No centers listed yet
            </p>
            <p className="text-sm text-muted-foreground mt-2 max-w-md mx-auto">
              We are actively adding verified rehab centers in {countryName}.
              Check back soon or contact us for recommendations.
            </p>
            <Button
              className="rounded-full gradient-primary text-white mt-6"
              asChild
            >
              <Link href="/contact">Get Recommendations</Link>
            </Button>
          </div>
        )}
      </section>

      {/* ── Related Blog Posts ── */}
      {posts && posts.length > 0 && (
        <section className="container mx-auto px-4 sm:px-6 py-8 md:py-12">
          <div className="flex items-end justify-between mb-8">
            <div>
              <h2 className="text-2xl md:text-3xl font-serif font-semibold text-foreground">
                Related Articles
              </h2>
              <p className="text-sm text-muted-foreground mt-2">
                Insights and resources about recovery in {countryName}
              </p>
            </div>
            <Button
              variant="outline"
              className="rounded-full ghost-border border-0 text-sm hover:bg-surface-container transition-colors duration-300"
              asChild
            >
              <Link href="/blog">
                All Articles <ArrowRight className="h-4 w-4 ml-1.5" />
              </Link>
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {posts.map((post) => {
              const featuredImage = extractFeaturedImage(post.content);
              const readTime = estimateReadTime(post.content);
              return (
                <Link
                  key={post.slug}
                  href={`/blog/${post.slug}`}
                  className="group rounded-2xl bg-surface-container-lowest overflow-hidden shadow-ambient hover:shadow-ambient-lg transition-all duration-300"
                >
                  {featuredImage && (
                    <div className="relative aspect-[16/9] bg-surface-container overflow-hidden">
                      <img
                        src={featuredImage}
                        alt={post.title}
                        loading="lazy"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    </div>
                  )}
                  <div className="p-5">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                      <BookOpen className="h-3 w-3" />
                      <span>{readTime}</span>
                      {post.published_at && (
                        <>
                          <span className="text-muted-foreground/40">|</span>
                          <span>
                            {new Date(post.published_at).toLocaleDateString(
                              "en-US",
                              { month: "short", day: "numeric", year: "numeric" }
                            )}
                          </span>
                        </>
                      )}
                    </div>
                    <h3 className="font-editorial text-base font-semibold text-foreground group-hover:text-primary transition-colors duration-300 line-clamp-2">
                      {post.title}
                    </h3>
                    {post.meta_description && (
                      <p className="text-xs text-muted-foreground mt-2 line-clamp-2 leading-relaxed">
                        {post.meta_description}
                      </p>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* ── CTA ── */}
      <section className="container mx-auto px-4 sm:px-6 py-12 md:py-20">
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#45636b] to-[#2d4a52] p-8 md:p-14 text-center">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,rgba(255,255,255,0.06),transparent_50%)]" />
          <div className="relative max-w-xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-serif font-semibold text-white">
              Not Sure Where to Start?
            </h2>
            <p className="mt-3 text-sm text-white/70 leading-relaxed">
              Take our confidential assessment to receive personalized
              recommendations matched to your needs, preferences, and budget.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-8">
              <Button
                className="rounded-full bg-white text-foreground hover:bg-white/90 transition-opacity duration-300 px-8"
                asChild
              >
                <Link href="/assessment">Start Free Assessment</Link>
              </Button>
              <Button
                variant="outline"
                className="rounded-full border-white/20 text-white hover:bg-white/10 transition-colors duration-300 px-8"
                asChild
              >
                <Link href="/inquiry">Send an Inquiry</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

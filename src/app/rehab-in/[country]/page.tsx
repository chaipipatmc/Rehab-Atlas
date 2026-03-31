import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { countryToSlug } from "@/lib/utils";
import { CenterCard } from "@/components/centers/center-card";
import { BreadcrumbJsonLd, MedicalWebPageJsonLd } from "@/components/shared/json-ld";
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
// Helper functions
// ---------------------------------------------------------------------------

function extractFeaturedImage(content: string | null): string | null {
  if (!content) return null;
  const match = content.match(/!\[featured\]\(([^)]+)\)/);
  return match ? match[1] : null;
}

function estimateReadTime(content: string | null): string {
  if (!content) return "3 min read";
  const words = content.split(/\s+/).length;
  const mins = Math.max(3, Math.ceil(words / 200));
  return `${mins} min read`;
}

// ---------------------------------------------------------------------------
// Dynamic country resolution
// ---------------------------------------------------------------------------

async function resolveCountry(slug: string): Promise<string | null> {
  const supabase = await createClient();
  const { data: countries } = await supabase
    .from("centers")
    .select("country")
    .eq("status", "published");

  if (!countries) return null;

  // Get distinct country names
  const uniqueCountries = [...new Set(countries.map((c) => c.country).filter(Boolean))] as string[];

  // Find the country whose slugified name matches the URL slug
  for (const name of uniqueCountries) {
    if (countryToSlug(name) === slug) {
      return name;
    }
  }

  return null;
}

// ---------------------------------------------------------------------------
// AI description generation + caching
// ---------------------------------------------------------------------------

interface CountryDescription {
  description: string;
  highlights: string[];
}

async function getOrGenerateDescription(
  countryName: string,
  countrySlug: string
): Promise<CountryDescription> {
  const supabase = await createClient();
  const admin = createAdminClient();

  // Check cache first
  const { data: cached } = await supabase
    .from("country_descriptions")
    .select("description, highlights")
    .eq("country_slug", countrySlug)
    .single();

  if (cached?.description && cached?.highlights) {
    return {
      description: cached.description,
      highlights: (cached.highlights as string[]) ?? [],
    };
  }

  // Gather stats for the prompt
  const { data: centers } = await supabase
    .from("centers")
    .select("treatment_focus, conditions_treated, price_from, price_to")
    .eq("status", "published")
    .eq("country", countryName);

  const centerCount = centers?.length ?? 0;

  const allFocus: string[] = [];
  const allConditions: string[] = [];
  let minPrice: number | null = null;
  let maxPrice: number | null = null;

  for (const c of centers ?? []) {
    if (Array.isArray(c.treatment_focus)) allFocus.push(...c.treatment_focus);
    if (Array.isArray(c.conditions_treated)) allConditions.push(...c.conditions_treated);
    if (c.price_from != null && (minPrice === null || c.price_from < minPrice)) minPrice = c.price_from;
    if (c.price_to != null && (maxPrice === null || c.price_to > maxPrice)) maxPrice = c.price_to;
  }

  // Count frequency and take top items
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

  // Generate with Claude if API key is available
  if (process.env.ANTHROPIC_API_KEY) {
    try {
      const client = new Anthropic();
      const message = await client.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 600,
        messages: [
          {
            role: "user",
            content: `Write content for a rehab center directory page about ${countryName}.

Stats: ${centerCount} centers, common specialties: ${topFocus.join(", ") || "various"}, common conditions: ${topConditions.join(", ") || "various"}, price range: ${priceRange}/month.

Return ONLY valid JSON (no markdown, no code fences):
{
  "description": "Two paragraphs about recovery and rehabilitation in ${countryName}. Focus on what makes this country unique for recovery, the therapeutic environment, and quality of care. Do not mention specific prices or center counts as they change.",
  "highlights": ["highlight 1", "highlight 2", "highlight 3", "highlight 4"]
}

The highlights should be concise bullet points about why someone would choose ${countryName} for rehab. Keep a professional, compassionate tone.`,
          },
        ],
      });

      const text =
        message.content[0].type === "text" ? message.content[0].text : "";
      const parsed = JSON.parse(text);

      if (parsed.description && Array.isArray(parsed.highlights)) {
        // Cache in DB using admin client
        await admin.from("country_descriptions").upsert(
          {
            country_slug: countrySlug,
            country_name: countryName,
            description: parsed.description,
            highlights: parsed.highlights,
            generated_at: new Date().toISOString(),
          },
          { onConflict: "country_slug" }
        );

        return {
          description: parsed.description,
          highlights: parsed.highlights,
        };
      }
    } catch {
      // Fall through to template
    }
  }

  // Template fallback
  const fallbackDescription = `${countryName} offers a diverse range of rehabilitation centers providing professional, evidence-based treatment programs. From residential facilities to outpatient programs, centers here combine clinical expertise with supportive recovery environments.\n\nWhether you are seeking treatment for substance use, mental health challenges, or behavioral conditions, ${countryName} has options to suit various needs and budgets. Explore verified facilities below to find your path to recovery.`;
  const fallbackHighlights = [
    `${centerCount > 0 ? centerCount : "Multiple"} verified rehabilitation facilities`,
    topFocus.length > 0
      ? `Specialties include ${topFocus.slice(0, 3).join(", ")}`
      : "Wide range of treatment specialties",
    topConditions.length > 0
      ? `Treatment for ${topConditions.slice(0, 3).join(", ")}`
      : "Comprehensive condition coverage",
    "Professional clinical teams with international experience",
  ];

  // Cache the fallback too
  await admin.from("country_descriptions").upsert(
    {
      country_slug: countrySlug,
      country_name: countryName,
      description: fallbackDescription,
      highlights: fallbackHighlights,
      generated_at: new Date().toISOString(),
    },
    { onConflict: "country_slug" }
  );

  return { description: fallbackDescription, highlights: fallbackHighlights };
}

// ---------------------------------------------------------------------------
// Metadata
// ---------------------------------------------------------------------------

interface PageProps {
  params: Promise<{ country: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { country: slug } = await params;
  const countryName = await resolveCountry(slug);
  if (!countryName) return {};

  const title = `Rehab Centers in ${countryName} | Rehab-Atlas`;
  const description = `Discover top-rated rehabilitation centers in ${countryName}. Compare programs, read reviews, and start your recovery journey with Rehab-Atlas.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: `https://rehab-atlas.vercel.app/rehab-in/${slug}`,
      type: "website",
    },
    alternates: {
      canonical: `https://rehab-atlas.vercel.app/rehab-in/${slug}`,
    },
  };
}

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------

export default async function CountryRehabPage({ params }: PageProps) {
  const { country: slug } = await params;
  const countryName = await resolveCountry(slug);

  if (!countryName) {
    notFound();
  }

  const supabase = await createClient();

  // Get AI-generated (or cached) description
  const { description: countryDescription, highlights } =
    await getOrGenerateDescription(countryName, slug);

  // Fetch published centers in this country, sorted by trust level
  const { data: centers } = await supabase
    .from("centers")
    .select(
      "*, photos:center_photos(id, url, alt_text, sort_order, is_primary)"
    )
    .eq("status", "published")
    .eq("country", countryName)
    .order("trusted_partner", { ascending: false })
    .order("verified_profile", { ascending: false })
    .order("is_unclaimed", { ascending: true })
    .order("editorial_overall", { ascending: false, nullsFirst: false });

  // Fetch related blog posts
  const { data: posts } = await supabase
    .from("pages")
    .select("slug, title, meta_description, published_at, content, tags")
    .eq("page_type", "blog")
    .eq("status", "published")
    .or(
      `tags.cs.{${countryName}},tags.cs.{International},tags.cs.{international}`
    )
    .order("published_at", { ascending: false })
    .limit(6);

  const BASE_URL =
    process.env.NEXT_PUBLIC_APP_URL || "https://rehab-atlas.vercel.app";

  const centerCount = centers?.length ?? 0;

  return (
    <div className="bg-surface min-h-screen">
      <BreadcrumbJsonLd
        items={[
          { name: "Home", url: BASE_URL },
          { name: "Rehab Destinations", url: `${BASE_URL}/rehab-in` },
          {
            name: countryName,
            url: `${BASE_URL}/rehab-in/${slug}`,
          },
        ]}
      />
      <MedicalWebPageJsonLd
        title={`Rehabilitation Centers in ${countryName}`}
        description={countryDescription}
        url={`${BASE_URL}/rehab-in/${slug}`}
      />

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-br from-[#45636b] to-[#2d4a52]" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(255,255,255,0.08),transparent_60%)]" />
        </div>
        <div className="relative container mx-auto px-4 sm:px-6 py-16 md:py-24">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-2 text-xs text-white/50 mb-8">
            <Link
              href="/"
              className="hover:text-white/80 transition-colors duration-300"
            >
              Home
            </Link>
            <span>/</span>
            <Link
              href="/rehab-in"
              className="hover:text-white/80 transition-colors duration-300"
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
            <p className="mt-4 text-base text-white/70 leading-relaxed max-w-2xl">
              {countryDescription}
            </p>
            <div className="flex items-center gap-3 mt-6">
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
        </div>
      </section>

      {/* Why choose this country */}
      {highlights.length > 0 && (
        <section className="container mx-auto px-4 sm:px-6 py-12 md:py-16">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-serif font-semibold text-foreground">
              Why Choose {countryName} for Rehab?
            </h2>
            <div className="grid sm:grid-cols-2 gap-4 mt-8">
              {highlights.map((highlight, i) => (
                <div
                  key={i}
                  className="flex gap-3 p-5 rounded-2xl bg-surface-container-lowest shadow-ambient"
                >
                  <CheckCircle className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-foreground leading-relaxed">
                    {highlight}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Centers Grid */}
      <section className="container mx-auto px-4 sm:px-6 py-8 md:py-12">
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
              View All
              <ArrowRight className="h-4 w-4 ml-1.5" />
            </Link>
          </Button>
        </div>

        {centers && centers.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {centers.map((center) => (
              <CenterCard
                key={center.id as string}
                center={center as unknown as Center & { photos?: CenterPhoto[] }}
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
              We are actively adding verified rehab centers in{" "}
              {countryName}. Check back soon or contact us for
              recommendations.
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

      {/* Related Blog Posts */}
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
                All Articles
                <ArrowRight className="h-4 w-4 ml-1.5" />
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
                              {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              }
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

      {/* CTA Section */}
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

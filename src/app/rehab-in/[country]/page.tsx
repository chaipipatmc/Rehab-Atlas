import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
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

// ---------------------------------------------------------------------------
// Country data mappings
// ---------------------------------------------------------------------------

interface CountryData {
  name: string;
  slug: string;
  dbName: string;
  description: string;
  highlights: string[];
}

const COUNTRIES: Record<string, CountryData> = {
  thailand: {
    name: "Thailand",
    slug: "thailand",
    dbName: "Thailand",
    description:
      "Thailand has emerged as one of the world's leading destinations for rehabilitation and wellness retreats. With world-class facilities set against stunning tropical landscapes, centers here combine evidence-based Western therapies with traditional Eastern healing practices. The affordability of treatment, paired with warm hospitality and year-round sunshine, makes Thailand an exceptional choice for lasting recovery.",
    highlights: [
      "Affordable luxury treatment at a fraction of Western prices",
      "Integration of mindfulness, yoga, and Thai wellness traditions",
      "Tropical resort-style settings that promote holistic healing",
      "Experienced international clinical teams with multilingual staff",
    ],
  },
  canada: {
    name: "Canada",
    slug: "canada",
    dbName: "Canada",
    description:
      "Canada offers some of the most reputable and well-regulated rehabilitation programs in the world. With a strong emphasis on evidence-based care and publicly funded healthcare infrastructure, Canadian rehab centers provide rigorous clinical standards. The country's vast natural landscapes — from the Rockies to coastal retreats — create serene environments ideally suited to recovery.",
    highlights: [
      "Strict regulatory standards ensuring high-quality clinical care",
      "Wilderness and nature-based therapy programs",
      "Comprehensive aftercare and community reintegration support",
      "Multicultural, inclusive treatment environments",
    ],
  },
  india: {
    name: "India",
    slug: "india",
    dbName: "India",
    description:
      "India is a growing hub for holistic rehabilitation, blending modern psychiatric and addiction medicine with ancient Ayurvedic and yogic traditions. Treatment is remarkably affordable, and many centers are situated in peaceful rural or coastal settings. India's deep spiritual heritage provides a unique foundation for personal transformation and lasting sobriety.",
    highlights: [
      "Highly affordable treatment with world-class medical professionals",
      "Ayurvedic detox and yoga-integrated recovery programs",
      "Rich spiritual and meditation traditions supporting inner healing",
      "Growing number of NABH-accredited treatment facilities",
    ],
  },
  bali: {
    name: "Bali",
    slug: "bali",
    dbName: "Bali",
    description:
      "Bali has become a sought-after destination for those seeking recovery in a deeply nurturing environment. The island's lush rice terraces, sacred temples, and warm Balinese culture create a naturally restorative atmosphere. Rehabilitation centers here focus on holistic mind-body-spirit healing, often incorporating surf therapy, breathwork, and traditional Balinese wellness rituals.",
    highlights: [
      "Stunning natural surroundings that inspire mindfulness and peace",
      "Holistic programs blending Western clinical methods with local healing arts",
      "Strong recovery community with ongoing peer support",
      "Adventure and nature-based therapies including surf and equine therapy",
    ],
  },
  malaysia: {
    name: "Malaysia",
    slug: "malaysia",
    dbName: "Malaysia",
    description:
      "Malaysia offers a compelling combination of modern medical infrastructure and multicultural warmth. Rehabilitation centers here deliver professional, accredited treatment at competitive prices, with many facilities located in tropical settings. Malaysia's diverse cultural landscape fosters inclusive, respectful care environments for international clients.",
    highlights: [
      "Modern medical facilities with JCI-accredited hospitals",
      "Competitive pricing with high-quality standards of care",
      "Multicultural and multilingual treatment teams",
      "Tropical climate and natural beauty supporting recovery",
    ],
  },
  australia: {
    name: "Australia",
    slug: "australia",
    dbName: "Australia",
    description:
      "Australia's rehabilitation sector is known for rigorous accreditation, evidence-based methodologies, and a strong community recovery culture. Centers range from beachside retreats to outback wilderness programs. Australia's emphasis on peer support, aftercare planning, and dual-diagnosis treatment makes it a world leader in long-term recovery outcomes.",
    highlights: [
      "Highly regulated, evidence-based treatment programs",
      "Diverse settings from coastal retreats to outback wilderness",
      "Strong emphasis on dual-diagnosis and co-occurring disorders",
      "Robust aftercare networks and sober living communities",
    ],
  },
  "south-africa": {
    name: "South Africa",
    slug: "south-africa",
    dbName: "South Africa",
    description:
      "South Africa has gained international recognition for its high-quality rehabilitation programs offered at remarkably affordable rates. Centers are often set in breathtaking natural environments — from the Cape Winelands to Indian Ocean coastlines. The country's approach combines the 12-step model with innovative therapeutic techniques and strong community support.",
    highlights: [
      "Exceptional value with treatment costs well below Western averages",
      "Spectacular natural settings that enhance the healing process",
      "Experienced clinical teams with international training",
      "Comprehensive programs combining multiple therapeutic modalities",
    ],
  },
  japan: {
    name: "Japan",
    slug: "japan",
    dbName: "Japan",
    description:
      "Japan offers a distinctive approach to rehabilitation that integrates cutting-edge clinical care with centuries-old wellness traditions. From forest bathing (shinrin-yoku) to mindful tea ceremonies, Japanese rehab centers emphasize discipline, routine, and inner harmony. The country's culture of respect and discretion provides an exceptionally private recovery experience.",
    highlights: [
      "Unique integration of Japanese wellness traditions with modern therapy",
      "Exceptional privacy and discretion throughout treatment",
      "Highly disciplined, structured therapeutic environments",
      "Access to Japan's renowned healthcare infrastructure",
    ],
  },
};

const ALL_SLUGS = Object.keys(COUNTRIES);

export const revalidate = 3600; // revalidate every hour

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
// Metadata
// ---------------------------------------------------------------------------

interface PageProps {
  params: Promise<{ country: string }>;
}

export async function generateStaticParams() {
  return ALL_SLUGS.map((slug) => ({ country: slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { country: slug } = await params;
  const countryData = COUNTRIES[slug];
  if (!countryData) return {};

  const title = `Rehab Centers in ${countryData.name} | Rehab-Atlas`;
  const description = `Discover top-rated rehabilitation centers in ${countryData.name}. Compare programs, read reviews, and start your recovery journey with Rehab-Atlas.`;

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
  const countryData = COUNTRIES[slug];

  if (!countryData) {
    notFound();
  }

  const supabase = await createClient();

  // Fetch published centers in this country
  const { data: centers } = await supabase
    .from("centers")
    .select(
      "*, photos:center_photos(id, url, alt_text, sort_order, is_primary)"
    )
    .eq("status", "published")
    .eq("country", countryData.dbName)
    .order("is_featured", { ascending: false })
    .order("editorial_overall", { ascending: false, nullsFirst: false });

  // Fetch related blog posts — match by country name in tags or "International" tag
  const { data: posts } = await supabase
    .from("pages")
    .select("slug, title, meta_description, published_at, content, tags")
    .eq("page_type", "blog")
    .eq("status", "published")
    .or(
      `tags.cs.{${countryData.name}},tags.cs.{International},tags.cs.{international}`
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
            name: countryData.name,
            url: `${BASE_URL}/rehab-in/${slug}`,
          },
        ]}
      />
      <MedicalWebPageJsonLd
        title={`Rehabilitation Centers in ${countryData.name}`}
        description={countryData.description}
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
            <span className="text-white/80">{countryData.name}</span>
          </nav>

          <div className="max-w-3xl">
            <div className="flex items-center gap-2 text-white/60 text-sm mb-4">
              <Globe className="h-4 w-4" />
              <span>Rehab Destination</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-serif font-semibold text-white leading-tight">
              Rehabilitation in {countryData.name}
            </h1>
            <p className="mt-4 text-base text-white/70 leading-relaxed max-w-2xl">
              {countryData.description}
            </p>
            <div className="flex items-center gap-3 mt-6">
              <span className="inline-flex items-center gap-1.5 bg-white/10 backdrop-blur-sm text-white/90 text-sm rounded-full px-4 py-1.5">
                <Building2 className="h-3.5 w-3.5" />
                {centerCount} {centerCount === 1 ? "Center" : "Centers"}
              </span>
              <span className="inline-flex items-center gap-1.5 bg-white/10 backdrop-blur-sm text-white/90 text-sm rounded-full px-4 py-1.5">
                <MapPin className="h-3.5 w-3.5" />
                {countryData.name}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Why choose this country */}
      <section className="container mx-auto px-4 sm:px-6 py-12 md:py-16">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-serif font-semibold text-foreground">
            Why Choose {countryData.name} for Rehab?
          </h2>
          <div className="grid sm:grid-cols-2 gap-4 mt-8">
            {countryData.highlights.map((highlight, i) => (
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

      {/* Centers Grid */}
      <section className="container mx-auto px-4 sm:px-6 py-8 md:py-12">
        <div className="flex items-end justify-between mb-8">
          <div>
            <h2 className="text-2xl md:text-3xl font-serif font-semibold text-foreground">
              Centers in {countryData.name}
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
            <Link href={`/centers?country=${countryData.dbName}`}>
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
              {countryData.name}. Check back soon or contact us for
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
                Insights and resources about recovery in {countryData.name}
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

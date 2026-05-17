import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { countryToSlug } from "@/lib/utils";
import { CenterCard } from "@/components/centers/center-card";
import { BreadcrumbJsonLd, MedicalWebPageJsonLd, FAQJsonLd } from "@/components/shared/json-ld";
import { ArrowRight, BookOpen, Search, HeartPulse, MapPin } from "lucide-react";
import type { Center, CenterPhoto } from "@/types/center";

const BASE_URL =
  process.env.NEXT_PUBLIC_APP_URL || "https://rehab-atlas.vercel.app";

// ---------------------------------------------------------------------------
// Condition data mappings
// ---------------------------------------------------------------------------

interface ConditionData {
  title: string;
  shortLabel: string; // used in cross-link cards
  description: string;
  relatedTags: string[];
  centerFilter: string[];
  related: string[]; // slugs of conceptually related conditions for internal linking
}

const CONDITIONS: Record<string, ConditionData> = {
  "alcohol-addiction": {
    title: "Alcohol Addiction Treatment",
    shortLabel: "Alcohol Addiction",
    description:
      "Alcohol addiction is one of the most prevalent substance use disorders worldwide. Effective treatment combines medically supervised detoxification with behavioral therapies such as CBT and motivational interviewing. Recovery programs range from intensive inpatient stays to flexible outpatient options, each tailored to the severity of dependence.",
    relatedTags: ["alcohol", "detox", "addiction", "substance abuse", "recovery"],
    centerFilter: ["alcohol", "alcohol_addiction", "substance_abuse", "detox"],
    related: ["drug-addiction", "prescription-drug-abuse", "dual-diagnosis", "trauma-ptsd"],
  },
  "drug-addiction": {
    title: "Drug Addiction Treatment",
    shortLabel: "Drug Addiction",
    description:
      "Drug addiction encompasses dependency on illicit substances including cocaine, methamphetamine, heroin, and synthetic drugs. Comprehensive rehabilitation addresses the physical, psychological, and social dimensions of dependency. Treatment typically includes medically managed withdrawal, individual and group counseling, and long-term aftercare planning.",
    relatedTags: ["drugs", "substance abuse", "addiction", "rehabilitation", "recovery"],
    centerFilter: ["drug_addiction", "substance_abuse", "drugs"],
    related: ["alcohol-addiction", "opioid-addiction", "prescription-drug-abuse", "dual-diagnosis"],
  },
  "opioid-addiction": {
    title: "Opioid Addiction Treatment",
    shortLabel: "Opioid Addiction",
    description:
      "The opioid crisis demands specialized treatment approaches including medication-assisted therapy (MAT) with buprenorphine, methadone, or naltrexone. Centers specializing in opioid addiction provide safe detox protocols, chronic pain management alternatives, and evidence-based relapse prevention. Early intervention significantly improves long-term outcomes.",
    relatedTags: ["opioids", "heroin", "fentanyl", "MAT", "detox", "addiction"],
    centerFilter: ["opioid_addiction", "opioids", "substance_abuse", "detox"],
    related: ["prescription-drug-abuse", "drug-addiction", "alcohol-addiction", "dual-diagnosis"],
  },
  "dual-diagnosis": {
    title: "Dual Diagnosis Treatment",
    shortLabel: "Dual Diagnosis",
    description:
      "Dual diagnosis — the co-occurrence of a substance use disorder and a mental health condition — requires integrated treatment that addresses both issues simultaneously. Without treating both conditions, recovery from either becomes significantly harder. Specialized programs employ psychiatrists, therapists, and addiction counselors working as a coordinated care team.",
    relatedTags: ["dual diagnosis", "co-occurring", "mental health", "addiction", "psychiatric"],
    centerFilter: ["dual_diagnosis", "co_occurring", "mental_health"],
    related: ["mental-health", "trauma-ptsd", "alcohol-addiction", "drug-addiction"],
  },
  "mental-health": {
    title: "Mental Health Treatment",
    shortLabel: "Mental Health",
    description:
      "Residential and outpatient mental health treatment addresses conditions such as depression, anxiety, bipolar disorder, schizophrenia, and personality disorders. Programs combine psychiatric medication management with evidence-based psychotherapies including CBT, DBT, and EMDR. A supportive therapeutic environment is foundational to lasting mental wellness.",
    relatedTags: ["mental health", "depression", "anxiety", "bipolar", "psychiatric", "therapy"],
    centerFilter: ["mental_health", "depression", "anxiety", "psychiatric"],
    related: ["dual-diagnosis", "trauma-ptsd", "eating-disorders", "behavioral-addiction"],
  },
  "gambling-addiction": {
    title: "Gambling Addiction Treatment",
    shortLabel: "Gambling Addiction",
    description:
      "Compulsive gambling is a behavioral addiction that can devastate finances, relationships, and mental health. Treatment centers use cognitive-behavioral therapy to restructure distorted thinking patterns around risk and reward. Programs also address co-occurring conditions like depression and anxiety that frequently accompany problem gambling.",
    relatedTags: ["gambling", "behavioral addiction", "compulsive", "addiction"],
    centerFilter: ["gambling", "behavioral_addiction", "gambling_addiction"],
    related: ["behavioral-addiction", "mental-health", "dual-diagnosis", "alcohol-addiction"],
  },
  "prescription-drug-abuse": {
    title: "Prescription Drug Abuse Treatment",
    shortLabel: "Prescription Drug Abuse",
    description:
      "Prescription drug abuse involves dependency on medications such as benzodiazepines, opioid painkillers, and stimulants. Because abrupt cessation can be medically dangerous, treatment requires carefully supervised tapering protocols alongside therapeutic support. Rehabilitation centers help patients develop non-pharmacological coping strategies and pain management techniques.",
    relatedTags: ["prescription drugs", "benzodiazepines", "painkillers", "medication", "detox"],
    centerFilter: ["prescription_drug_abuse", "prescription_drugs", "substance_abuse", "detox"],
    related: ["opioid-addiction", "drug-addiction", "alcohol-addiction", "dual-diagnosis"],
  },
  "eating-disorders": {
    title: "Eating Disorder Treatment",
    shortLabel: "Eating Disorders",
    description:
      "Eating disorders — including anorexia nervosa, bulimia, and binge eating disorder — are serious conditions that affect both physical and mental health. Specialized treatment centers offer nutritional rehabilitation, body image therapy, and structured meal support alongside psychiatric care. Early, comprehensive treatment leads to the best recovery outcomes.",
    relatedTags: ["eating disorders", "anorexia", "bulimia", "body image", "nutrition"],
    centerFilter: ["eating_disorders", "eating_disorder", "anorexia", "bulimia"],
    related: ["mental-health", "trauma-ptsd", "dual-diagnosis", "behavioral-addiction"],
  },
  "trauma-ptsd": {
    title: "Trauma & PTSD Treatment",
    shortLabel: "Trauma & PTSD",
    description:
      "Trauma-informed care is essential for individuals living with PTSD, complex trauma, or the lingering effects of abuse and adverse experiences. Evidence-based modalities like EMDR, somatic experiencing, and prolonged exposure therapy help process traumatic memories safely. Residential programs provide a secure environment for deep healing work.",
    relatedTags: ["trauma", "PTSD", "EMDR", "abuse", "therapy", "mental health"],
    centerFilter: ["trauma", "ptsd", "trauma_ptsd"],
    related: ["mental-health", "dual-diagnosis", "eating-disorders", "alcohol-addiction"],
  },
  "behavioral-addiction": {
    title: "Behavioral Addiction Treatment",
    shortLabel: "Behavioral Addiction",
    description:
      "Behavioral or process addictions — such as internet, gaming, sex, and shopping compulsions — share neurological pathways with substance addictions. Treatment focuses on identifying triggers, restructuring compulsive behaviors, and building healthier reward systems. Centers offering behavioral addiction programs integrate individual therapy, group work, and digital wellness strategies.",
    relatedTags: ["behavioral addiction", "internet addiction", "gaming", "compulsive", "process addiction"],
    centerFilter: ["behavioral_addiction", "process_addiction", "internet_addiction"],
    related: ["gambling-addiction", "mental-health", "eating-disorders", "dual-diagnosis"],
  },
};

const CONDITION_SLUGS = Object.keys(CONDITIONS);

// ---------------------------------------------------------------------------
// Static params for pre-rendering
// ---------------------------------------------------------------------------

export function generateStaticParams() {
  return CONDITION_SLUGS.map((condition) => ({ condition }));
}

// ---------------------------------------------------------------------------
// Dynamic metadata
// ---------------------------------------------------------------------------

export async function generateMetadata({
  params,
}: {
  params: Promise<{ condition: string }>;
}): Promise<Metadata> {
  const { condition } = await params;
  const data = CONDITIONS[condition];
  if (!data) return {};

  return {
    title: `${data.title} Centers | Rehab-Atlas`,
    description: data.description,
    openGraph: {
      title: `${data.title} Centers | Rehab-Atlas`,
      description: data.description,
      url: `${BASE_URL}/rehab/${condition}`,
    },
  };
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
  const mins = Math.max(3, Math.ceil(words / 200));
  return `${mins} min read`;
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function ConditionPage({
  params,
}: {
  params: Promise<{ condition: string }>;
}) {
  const { condition } = await params;
  const data = CONDITIONS[condition];
  if (!data) notFound();

  const supabase = await createClient();

  // Fetch centers whose treatment_focus overlaps with our filter values
  const centerPromises = data.centerFilter.map((filter) =>
    supabase
      .from("centers")
      .select("*, photos:center_photos(*)")
      .eq("status", "published")
      .contains("treatment_focus", [filter])
  );

  const centerResults = await Promise.all(centerPromises);

  // Deduplicate centers by id
  const seenIds = new Set<string>();
  const centers: (Center & { photos?: CenterPhoto[] })[] = [];
  for (const result of centerResults) {
    if (result.data) {
      for (const center of result.data) {
        if (!seenIds.has(center.id)) {
          seenIds.add(center.id);
          centers.push(center as Center & { photos?: CenterPhoto[] });
        }
      }
    }
  }

  // Sort: featured first, then by rating
  centers.sort((a, b) => {
    if (a.is_featured !== b.is_featured) return a.is_featured ? -1 : 1;
    return (b.rating ?? 0) - (a.rating ?? 0);
  });

  // Aggregate country distribution from matching centers (for Locations section).
  // Uses the same set already loaded above — no extra DB call.
  const countryCounts = new Map<string, number>();
  for (const c of centers) {
    if (!c.country) continue;
    countryCounts.set(c.country, (countryCounts.get(c.country) || 0) + 1);
  }
  const countriesWithCondition = [...countryCounts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 12);

  // Fetch related blog posts
  const tagPromises = data.relatedTags.map((tag) =>
    supabase
      .from("pages")
      .select("slug, title, meta_description, published_at, content, tags")
      .eq("page_type", "blog")
      .eq("status", "published")
      .contains("tags", [tag])
      .order("published_at", { ascending: false })
      .limit(6)
  );

  const tagResults = await Promise.all(tagPromises);

  const seenSlugs = new Set<string>();
  const posts: {
    slug: string;
    title: string;
    meta_description: string | null;
    published_at: string | null;
    content: string | null;
    tags: string[] | null;
  }[] = [];
  for (const result of tagResults) {
    if (result.data) {
      for (const post of result.data) {
        if (!seenSlugs.has(post.slug)) {
          seenSlugs.add(post.slug);
          posts.push(post as typeof posts[number]);
        }
      }
    }
  }
  // Limit to 6 total
  const relatedPosts = posts.slice(0, 6);

  // Resolve related conditions (filter out missing slugs defensively)
  const relatedConditions = data.related
    .map((slug) => ({ slug, data: CONDITIONS[slug] }))
    .filter((r): r is { slug: string; data: ConditionData } => Boolean(r.data));

  // Auto-generated FAQs for FAQPage JSON-LD (AISO). Generic but condition-aware.
  const conditionLower = data.shortLabel.toLowerCase();
  const faqs: { question: string; answer: string }[] = [
    {
      question: `What is ${data.title.toLowerCase()}?`,
      answer: data.description,
    },
    {
      question: `How long does ${conditionLower} treatment take?`,
      answer: `Most ${conditionLower} programs run 28 to 90 days for residential care, with longer outpatient and aftercare phases that can extend for 6 to 12 months. The right length depends on severity, prior treatment history, and co-occurring conditions. View individual center profiles on Rehab-Atlas for specific program durations.`,
    },
    {
      question: `Where can I find ${conditionLower} treatment centers?`,
      answer: countriesWithCondition.length > 0
        ? `Rehab-Atlas lists verified ${conditionLower} centers in ${countriesWithCondition.slice(0, 5).map(([c]) => c).join(", ")}${countriesWithCondition.length > 5 ? ", and other countries" : ""}. Browse the location list below or take our confidential assessment for a personalized match.`
        : `Rehab-Atlas connects you with verified ${conditionLower} centers worldwide. Take our confidential assessment or browse our full directory to find the right fit.`,
    },
    {
      question: `How do I choose the right ${conditionLower} program?`,
      answer: `Consider clinical credentials (medical detox capability, accreditation), treatment approach (evidence-based vs. holistic), program length, accommodation tier, languages spoken, and cost. The Rehab-Atlas comparison tool lets you place two or three centers side-by-side. For a personalized recommendation, take our 5-minute assessment.`,
    },
    {
      question: `How do I contact a ${conditionLower} center on Rehab-Atlas?`,
      answer: `All inquiries are routed confidentially through Rehab-Atlas — never directly to the center. Submit a single inquiry from any center profile and our specialist team will review your needs and coordinate the introduction. Your information stays private until you choose to engage.`,
    },
  ];

  return (
    <div className="bg-surface min-h-screen">
      <BreadcrumbJsonLd
        items={[
          { name: "Home", url: BASE_URL },
          { name: "Treatment Conditions", url: `${BASE_URL}/rehab` },
          { name: data.title, url: `${BASE_URL}/rehab/${condition}` },
        ]}
      />
      <MedicalWebPageJsonLd
        title={data.title}
        description={data.description}
        url={`${BASE_URL}/rehab/${condition}`}
      />
      <FAQJsonLd faqs={faqs} />

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0">
          <img
            src="https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=1600&q=80&auto=format&fit=crop"
            alt=""
            className="w-full h-full object-cover object-center"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#45636b]/90 to-[#45636b]/65" />
        </div>
        <div className="relative container mx-auto px-4 sm:px-6 max-w-5xl py-16 md:py-24">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-2 text-xs text-white/60 mb-6">
            <Link href="/" className="hover:text-white/90 transition-colors duration-300">
              Home
            </Link>
            <span>/</span>
            <Link href="/rehab" className="hover:text-white/90 transition-colors duration-300">
              Treatment Conditions
            </Link>
            <span>/</span>
            <span className="text-white/90">{data.title}</span>
          </nav>

          <h1 className="text-3xl md:text-4xl font-serif font-semibold text-white leading-tight">
            {data.title}
          </h1>
          <p className="mt-4 text-sm md:text-base text-white/70 max-w-2xl leading-relaxed">
            {data.description}
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/assessment"
              className="inline-flex items-center justify-center rounded-full bg-white text-[#45636b] hover:bg-white/90 transition-colors duration-300 px-5 py-2 text-sm font-medium"
            >
              Take Assessment
            </Link>
            <Link
              href={`/centers?treatment_focus=${encodeURIComponent(data.centerFilter[0])}`}
              className="inline-flex items-center gap-1.5 justify-center rounded-full bg-white/15 backdrop-blur-sm text-white hover:bg-white/25 transition-colors duration-300 px-5 py-2 text-sm font-medium"
            >
              <Search className="h-3.5 w-3.5" />
              Search Centers
            </Link>
          </div>
        </div>
      </section>

      <div className="container mx-auto px-4 sm:px-6 py-10 md:py-16 max-w-5xl">
        {/* Matching Centers */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-headline-sm md:text-headline-md font-serif font-semibold text-foreground">
              Rehabilitation Centers
            </h2>
            {centers.length > 0 && (
              <span className="text-xs text-muted-foreground">
                {centers.length} center{centers.length !== 1 ? "s" : ""} found
              </span>
            )}
          </div>

          {centers.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-6">
              {centers.slice(0, 9).map((center) => (
                <CenterCard key={center.id} center={center} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12 bg-surface-container-lowest rounded-2xl shadow-ambient">
              <p className="text-headline-sm text-foreground">
                No centers listed yet
              </p>
              <p className="text-sm text-muted-foreground mt-2 max-w-md mx-auto">
                We are actively adding {data.title.toLowerCase()} centers to our
                directory. Submit an inquiry and our team will help you find the
                right match.
              </p>
              <Link
                href="/inquiry"
                className="inline-flex items-center justify-center rounded-full gradient-primary text-white hover:opacity-90 transition-opacity duration-300 px-6 py-2.5 text-sm font-medium mt-6"
              >
                Send an Inquiry
              </Link>
            </div>
          )}

          {centers.length > 9 && (
            <div className="mt-8 text-center">
              <Link
                href={`/centers?treatment_focus=${encodeURIComponent(data.centerFilter[0])}`}
                className="inline-flex items-center gap-1.5 text-sm text-primary font-medium hover:underline"
              >
                View all {centers.length} centers{" "}
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          )}
        </section>

        {/* Related Articles */}
        {relatedPosts.length > 0 && (
          <section className="mt-14 md:mt-20">
            <div className="flex items-center gap-2 mb-6">
              <BookOpen className="h-4 w-4 text-primary" />
              <h2 className="text-headline-sm md:text-headline-md font-serif font-semibold text-foreground">
                Related Articles
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-6">
              {relatedPosts.map((post) => {
                const postImage = extractFeaturedImage(post.content);
                const postTags = post.tags as string[] | null;
                return (
                  <Link
                    key={post.slug}
                    href={`/blog/${post.slug}`}
                    className="group bg-surface-container-lowest rounded-2xl overflow-hidden shadow-ambient hover:shadow-ambient-lg transition-all duration-300"
                  >
                    {postImage && (
                      <div className="aspect-[16/9] relative overflow-hidden">
                        <img
                          src={postImage}
                          alt={post.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      </div>
                    )}
                    <div className="p-5">
                      <h3 className="text-base font-semibold text-foreground group-hover:text-primary transition-colors duration-300 line-clamp-2">
                        {post.title}
                      </h3>
                      {post.meta_description && (
                        <p className="text-xs text-muted-foreground mt-2 leading-relaxed line-clamp-2">
                          {post.meta_description}
                        </p>
                      )}
                      {postTags?.length ? (
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {postTags.slice(0, 3).map((tag) => (
                            <span
                              key={tag}
                              className="text-[10px] font-medium rounded-full px-2 py-0.5 bg-primary/8 text-primary/80"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      ) : null}
                      <div className="flex items-center justify-between mt-4 pt-3">
                        <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                          {post.published_at && (
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
                          )}
                          <span className="w-1 h-1 rounded-full bg-muted-foreground" />
                          <span>{estimateReadTime(post.content)}</span>
                        </div>
                        <span className="text-xs text-primary">
                          Read &rarr;
                        </span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        )}

        {/* Locations — countries where this treatment is available */}
        {countriesWithCondition.length > 0 && (
          <section className="mt-14 md:mt-20">
            <div className="flex items-center gap-2 mb-6">
              <MapPin className="h-4 w-4 text-primary" />
              <h2 className="text-headline-sm md:text-headline-md font-serif font-semibold text-foreground">
                {data.shortLabel} Treatment Around the World
              </h2>
            </div>
            <p className="text-sm text-muted-foreground mb-6 max-w-2xl">
              Browse {data.shortLabel.toLowerCase()} centers by location. Each country page lists verified facilities, pricing context, and local programs.
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {countriesWithCondition.map(([country, count]) => (
                <Link
                  key={country}
                  href={`/rehab-in/${countryToSlug(country)}`}
                  className="flex items-center justify-between p-4 rounded-xl bg-surface-container-lowest shadow-ambient hover:shadow-ambient-lg transition-all duration-300 group"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground group-hover:text-primary transition-colors truncate">
                      {data.shortLabel} in {country}
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {count} {count === 1 ? "center" : "centers"}
                    </p>
                  </div>
                  <ArrowRight className="h-3.5 w-3.5 text-primary flex-shrink-0 group-hover:translate-x-0.5 transition-transform" />
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Related Conditions — internal links to other /rehab/[condition] pages */}
        {relatedConditions.length > 0 && (
          <section className="mt-14 md:mt-20">
            <div className="flex items-center gap-2 mb-6">
              <HeartPulse className="h-4 w-4 text-primary" />
              <h2 className="text-headline-sm md:text-headline-md font-serif font-semibold text-foreground">
                Related Treatment Areas
              </h2>
            </div>
            <p className="text-sm text-muted-foreground mb-6 max-w-2xl">
              People exploring {data.shortLabel.toLowerCase()} treatment often look at related conditions — many co-occur and may share clinical approaches.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {relatedConditions.map((r) => (
                <Link
                  key={r.slug}
                  href={`/rehab/${r.slug}`}
                  className="block p-5 rounded-2xl bg-surface-container-lowest shadow-ambient hover:shadow-ambient-lg transition-all duration-300 group"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[10px] uppercase tracking-wider text-primary font-medium mb-1">
                        Treatment Area
                      </p>
                      <h3 className="text-base font-semibold text-foreground group-hover:text-primary transition-colors">
                        {r.data.title}
                      </h3>
                      <p className="text-xs text-muted-foreground mt-2 line-clamp-2 leading-relaxed">
                        {r.data.description.split(". ")[0]}.
                      </p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-primary flex-shrink-0 mt-1 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* FAQs — visible + FAQPage JSON-LD above for AISO */}
        <section className="mt-14 md:mt-20 max-w-3xl">
          <h2 className="text-headline-sm md:text-headline-md font-serif font-semibold text-foreground mb-6">
            Frequently Asked Questions
          </h2>
          <div className="space-y-4">
            {faqs.map((faq) => (
              <details
                key={faq.question}
                className="bg-surface-container-low rounded-2xl p-5 ghost-border group"
              >
                <summary className="cursor-pointer text-sm font-medium text-foreground list-none flex justify-between items-center">
                  <span>{faq.question}</span>
                  <span className="text-primary text-lg group-open:rotate-45 transition-transform">+</span>
                </summary>
                <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
                  {faq.answer}
                </p>
              </details>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="mt-14 md:mt-20 text-center bg-surface-container-low rounded-2xl p-8 md:p-10 ghost-border">
          <h2 className="text-headline-sm md:text-headline-md font-semibold text-foreground">
            Need help finding the right treatment?
          </h2>
          <p className="mt-2 text-sm text-muted-foreground max-w-md mx-auto">
            Our confidential assessment matches you with centers that specialize
            in {data.title.toLowerCase()}. It takes just a few minutes.
          </p>
          <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/assessment"
              className="inline-flex items-center justify-center rounded-full gradient-primary text-white hover:opacity-90 transition-opacity duration-300 px-6 py-2.5 text-sm font-medium"
            >
              Take Assessment
            </Link>
            <Link
              href="/inquiry"
              className="inline-flex items-center justify-center rounded-full ghost-border border-0 bg-surface-container-lowest text-foreground hover:bg-surface-container transition-colors duration-300 px-6 py-2.5 text-sm font-medium"
            >
              Contact Us
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}

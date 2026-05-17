import { cache } from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { countryToSlug, cityToSlug } from "@/lib/utils";
import { CenterCard } from "@/components/centers/center-card";
import {
  BreadcrumbJsonLd,
  MedicalWebPageJsonLd,
  FAQJsonLd,
} from "@/components/shared/json-ld";
import { Button } from "@/components/ui/button";
import { MapPin, Building2, ArrowRight, ArrowLeft, CheckCircle, Sparkles } from "lucide-react";
import type { Center, CenterPhoto } from "@/types/center";

export const revalidate = 86400; // 24h

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://rehab-atlas.com";

// 10 conditions taken from /rehab/[condition]/page.tsx — keep in sync.
// Used to surface city × condition cross-links at the bottom of the city page.
const CONDITIONS_FOR_LINKS: { slug: string; label: string; filters: string[] }[] = [
  { slug: "alcohol-addiction", label: "Alcohol Addiction", filters: ["alcohol", "alcohol_addiction"] },
  { slug: "drug-addiction", label: "Drug Addiction", filters: ["drug_addiction", "substance_abuse", "drugs"] },
  { slug: "opioid-addiction", label: "Opioid Addiction", filters: ["opioid_addiction", "opioids"] },
  { slug: "dual-diagnosis", label: "Dual Diagnosis", filters: ["dual_diagnosis", "co_occurring"] },
  { slug: "mental-health", label: "Mental Health", filters: ["mental_health", "depression", "anxiety"] },
  { slug: "gambling-addiction", label: "Gambling Addiction", filters: ["gambling", "behavioral_addiction"] },
  { slug: "prescription-drug-abuse", label: "Prescription Drug Abuse", filters: ["prescription_drug_abuse", "prescription_drugs"] },
  { slug: "eating-disorders", label: "Eating Disorders", filters: ["eating_disorders", "eating_disorder"] },
  { slug: "trauma-ptsd", label: "Trauma & PTSD", filters: ["trauma", "ptsd", "trauma_ptsd"] },
  { slug: "behavioral-addiction", label: "Behavioral Addiction", filters: ["behavioral_addiction", "process_addiction"] },
];

interface PageProps {
  params: Promise<{ country: string; city: string }>;
}

interface ResolvedLocation {
  countryName: string;
  cityName: string;
}

/**
 * Resolve country + city from URL slugs. Returns null if no published centers
 * match this combination (avoid generating empty pages).
 *
 * Wrapped in React cache() so generateMetadata + page render share one query
 * per request instead of double-fetching the entire centers list.
 */
const resolveLocation = cache(
  async (
    countrySlug: string,
    citySlug: string,
  ): Promise<ResolvedLocation | null> => {
    const admin = createAdminClient();
    const { data } = await admin
      .from("centers")
      .select("country, city")
      .eq("status", "published");
    if (!data) return null;

    for (const row of data) {
      if (!row.country || !row.city) continue;
      if (
        countryToSlug(row.country) === countrySlug &&
        cityToSlug(row.city) === citySlug
      ) {
        return { countryName: row.country, cityName: row.city };
      }
    }
    return null;
  },
);

export async function generateStaticParams(): Promise<{ country: string; city: string }[]> {
  try {
    const admin = createAdminClient();
    const { data } = await admin
      .from("centers")
      .select("country, city")
      .eq("status", "published");
    if (!data) return [];

    const seen = new Set<string>();
    const out: { country: string; city: string }[] = [];
    for (const row of data) {
      if (!row.country || !row.city) continue;
      const key = `${countryToSlug(row.country)}/${cityToSlug(row.city)}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({ country: countryToSlug(row.country), city: cityToSlug(row.city) });
    }
    return out;
  } catch {
    return [];
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { country, city } = await params;
  const loc = await resolveLocation(country, city);
  if (!loc) return { title: "Location Not Found — Rehab-Atlas" };

  const title = `Rehab Centers in ${loc.cityName}, ${loc.countryName} — Verified Programs | Rehab-Atlas`;
  const description = `Find verified rehabilitation centers in ${loc.cityName}, ${loc.countryName}. Compare treatment programs, pricing, and amenities. Confidential inquiries through Rehab-Atlas.`;

  return {
    title,
    description,
    alternates: {
      canonical: `${BASE_URL}/rehab-in/${country}/${city}`,
    },
    openGraph: {
      type: "website",
      title,
      description,
      url: `${BASE_URL}/rehab-in/${country}/${city}`,
    },
  };
}

export default async function CityRehabPage({ params }: PageProps) {
  const { country: countrySlug, city: citySlug } = await params;
  const loc = await resolveLocation(countrySlug, citySlug);
  if (!loc) notFound();

  const supabase = await createClient();
  const { data: centers } = await supabase
    .from("centers")
    .select("*, photos:center_photos(id, url, alt_text, sort_order, is_primary)")
    .eq("status", "published")
    .eq("country", loc.countryName)
    .eq("city", loc.cityName)
    .order("is_featured", { ascending: false })
    .order("editorial_overall", { ascending: false, nullsFirst: false })
    .order("rating", { ascending: false, nullsFirst: false });

  // Which conditions are actually covered by centers in this city — for cross-link section
  const conditionsAvailable = new Set<string>();
  for (const c of centers || []) {
    const focus = (c as { treatment_focus: string[] | null }).treatment_focus || [];
    for (const cond of CONDITIONS_FOR_LINKS) {
      if (cond.filters.some((f) => focus.includes(f))) {
        conditionsAvailable.add(cond.slug);
      }
    }
  }

  // Aggregate clinical stats for the intro
  const allFocus: string[] = [];
  let hasDetox = false;
  let minPrice: number | null = null;
  let maxPrice: number | null = null;
  for (const c of centers || []) {
    const row = c as { treatment_focus: string[] | null; has_detox: boolean | null; price_min: number | null; price_max: number | null };
    if (Array.isArray(row.treatment_focus)) allFocus.push(...row.treatment_focus);
    if (row.has_detox) hasDetox = true;
    if (row.price_min != null && (minPrice === null || row.price_min < minPrice)) minPrice = row.price_min;
    if (row.price_max != null && (maxPrice === null || row.price_max > maxPrice)) maxPrice = row.price_max;
  }
  const topFocus = [...new Set(allFocus.map((f) => f.replace(/_/g, " ")))].slice(0, 5);
  const centerCount = centers?.length ?? 0;

  // Auto-generate FAQs for FAQPage schema (AISO)
  const faqs = [
    {
      question: `How many rehab centers are in ${loc.cityName}?`,
      answer: `${centerCount} verified rehabilitation ${centerCount === 1 ? "center is" : "centers are"} currently listed in ${loc.cityName}, ${loc.countryName} on Rehab-Atlas. All listings are vetted by our editorial team before publication.`,
    },
    {
      question: `What types of treatment are available in ${loc.cityName}?`,
      answer: topFocus.length > 0
        ? `Centers in ${loc.cityName} offer programs covering ${topFocus.join(", ")}. Specific program availability varies by facility — view each center's profile for full details.`
        : `${loc.cityName} offers a range of rehabilitation programs across substance use, mental health, and behavioral addiction.`,
    },
    {
      question: `Is medical detox available in ${loc.cityName}?`,
      answer: hasDetox
        ? `Yes, at least one center in ${loc.cityName} offers on-site medical detoxification supervised by clinical staff. Always confirm specific protocols and medical capabilities with the center before admission.`
        : `On-site medical detox does not appear in the current ${loc.cityName} listings. For detox needs, check our other listings in ${loc.countryName} or contact our team for a personalized recommendation.`,
    },
    {
      question: `How much does rehab cost in ${loc.cityName}?`,
      answer: minPrice && maxPrice
        ? `Programs in ${loc.cityName} range from approximately $${minPrice.toLocaleString()} to $${maxPrice.toLocaleString()} per month based on currently listed centers. Pricing depends on length of stay, accommodation tier, and program intensity.`
        : `Pricing in ${loc.cityName} varies by program length, accommodation, and treatment intensity. Contact individual centers via Rehab-Atlas for current rates.`,
    },
    {
      question: `How do I contact a rehab center in ${loc.cityName}?`,
      answer: `All inquiries are routed through Rehab-Atlas to protect your privacy. Submit a single confidential inquiry on the center's profile page and our specialist team will coordinate the introduction.`,
    },
  ];

  return (
    <div className="bg-surface min-h-screen">
      <BreadcrumbJsonLd
        items={[
          { name: "Home", url: BASE_URL },
          { name: "Destinations", url: `${BASE_URL}/rehab-in` },
          { name: loc.countryName, url: `${BASE_URL}/rehab-in/${countrySlug}` },
          { name: loc.cityName, url: `${BASE_URL}/rehab-in/${countrySlug}/${citySlug}` },
        ]}
      />
      <MedicalWebPageJsonLd
        title={`Rehab Centers in ${loc.cityName}, ${loc.countryName}`}
        description={`Verified rehabilitation centers and treatment programs in ${loc.cityName}.`}
        url={`${BASE_URL}/rehab-in/${countrySlug}/${citySlug}`}
      />
      <FAQJsonLd faqs={faqs} />

      {/* Hero */}
      <section className="relative bg-gradient-to-br from-[#45636b] to-[#2d4a52] overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(255,255,255,0.08),transparent_60%)]" />
        <div className="relative container mx-auto px-4 sm:px-6 py-12 md:py-20">
          <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs text-white/50 mb-6">
            <Link href="/" className="hover:text-white/80 transition-colors">Home</Link>
            <span>/</span>
            <Link href="/rehab-in" className="hover:text-white/80 transition-colors">Destinations</Link>
            <span>/</span>
            <Link href={`/rehab-in/${countrySlug}`} className="hover:text-white/80 transition-colors">
              {loc.countryName}
            </Link>
            <span>/</span>
            <span className="text-white/90">{loc.cityName}</span>
          </nav>

          <div className="max-w-3xl">
            <div className="flex items-center gap-2 text-white/60 text-sm mb-3">
              <MapPin className="h-4 w-4" />
              <span>{loc.cityName}, {loc.countryName}</span>
            </div>
            <h1 className="text-3xl md:text-5xl font-serif font-semibold text-white leading-tight">
              Rehab Centers in {loc.cityName}
            </h1>
            <p className="mt-4 text-base md:text-lg text-white/80 leading-relaxed max-w-2xl">
              {centerCount > 0
                ? `${centerCount} verified rehabilitation ${centerCount === 1 ? "facility" : "facilities"} in ${loc.cityName}, ${loc.countryName}. Compare programs, pricing, and clinical approach before reaching out — all inquiries handled confidentially through Rehab-Atlas.`
                : `Discover rehabilitation options near ${loc.cityName}, ${loc.countryName}. Our specialists can help you find the right center.`}
            </p>
            <div className="flex flex-wrap items-center gap-3 mt-6">
              <span className="inline-flex items-center gap-1.5 bg-white/10 backdrop-blur-sm text-white/90 text-sm rounded-full px-4 py-1.5">
                <Building2 className="h-3.5 w-3.5" />
                {centerCount} {centerCount === 1 ? "Center" : "Centers"}
              </span>
              {hasDetox && (
                <span className="inline-flex items-center gap-1.5 bg-white/10 backdrop-blur-sm text-white/90 text-sm rounded-full px-4 py-1.5">
                  <CheckCircle className="h-3.5 w-3.5" />
                  Medical Detox Available
                </span>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Centers grid */}
      <section className="container mx-auto px-4 sm:px-6 py-12 md:py-16">
        <div className="flex items-end justify-between mb-8">
          <div>
            <h2 className="text-2xl md:text-3xl font-serif font-semibold text-foreground">
              Centers in {loc.cityName}
            </h2>
            {topFocus.length > 0 && (
              <p className="text-sm text-muted-foreground mt-2">
                Programs include: {topFocus.slice(0, 4).join(" · ")}
              </p>
            )}
          </div>
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
            <p className="text-lg font-serif text-foreground">No centers listed yet</p>
            <p className="text-sm text-muted-foreground mt-2 max-w-md mx-auto">
              We&apos;re adding centers in {loc.cityName} soon. Browse all centers in {loc.countryName} below or contact our team.
            </p>
            <Button className="rounded-full gradient-primary text-white mt-6" asChild>
              <Link href={`/rehab-in/${countrySlug}`}>All {loc.countryName} Centers</Link>
            </Button>
          </div>
        )}
      </section>

      {/* City × Condition cross-links — programmatic SEO for "alcohol rehab in [city]" etc. */}
      {conditionsAvailable.size > 0 && (
        <section className="bg-surface-container-low">
          <div className="container mx-auto px-4 sm:px-6 py-12 md:py-16">
            <div className="max-w-4xl">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="h-4 w-4 text-primary" />
                <p className="text-xs uppercase tracking-wider text-primary font-medium">Treatment Specialties</p>
              </div>
              <h2 className="text-2xl md:text-3xl font-serif font-semibold text-foreground">
                Specific Treatment in {loc.cityName}
              </h2>
              <p className="text-sm text-muted-foreground mt-2 max-w-2xl">
                Looking for treatment for a specific condition? Browse {loc.cityName} centers filtered by what they specialize in.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-8">
                {CONDITIONS_FOR_LINKS.filter((c) => conditionsAvailable.has(c.slug)).map((cond) => (
                  <Link
                    key={cond.slug}
                    href={`/rehab-in/${countrySlug}/${citySlug}/${cond.slug}`}
                    className="flex items-center justify-between p-4 rounded-xl bg-surface-container-lowest shadow-ambient hover:shadow-ambient-lg transition-all group"
                  >
                    <span className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">
                      {cond.label} in {loc.cityName}
                    </span>
                    <ArrowRight className="h-4 w-4 text-primary group-hover:translate-x-0.5 transition-transform" />
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* FAQs (visible + JSON-LD above) */}
      <section className="container mx-auto px-4 sm:px-6 py-12 md:py-16">
        <div className="max-w-3xl">
          <h2 className="text-2xl md:text-3xl font-serif font-semibold text-foreground mb-6">
            Frequently Asked Questions
          </h2>
          <div className="space-y-4">
            {faqs.map((faq) => (
              <details key={faq.question} className="bg-surface-container-low rounded-2xl p-5 ghost-border group">
                <summary className="cursor-pointer text-sm font-medium text-foreground list-none flex justify-between items-center">
                  <span>{faq.question}</span>
                  <span className="text-primary text-lg group-open:rotate-45 transition-transform">+</span>
                </summary>
                <p className="mt-3 text-sm text-muted-foreground leading-relaxed">{faq.answer}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="container mx-auto px-4 sm:px-6 pb-12 md:pb-20">
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#45636b] to-[#2d4a52] p-8 md:p-14 text-center">
          <div className="relative max-w-xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-serif font-semibold text-white">
              Not Sure Where to Start?
            </h2>
            <p className="mt-3 text-sm text-white/70 leading-relaxed">
              Take our confidential assessment for a personalized match — or speak with our specialists directly.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-8">
              <Button className="rounded-full bg-white text-foreground hover:bg-white/90 px-8" asChild>
                <Link href="/assessment">Start Free Assessment</Link>
              </Button>
              <Button variant="outline" className="rounded-full border-white/20 text-white hover:bg-white/10 px-8" asChild>
                <Link href="/inquiry">Send an Inquiry</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Back to country */}
      <div className="container mx-auto px-4 sm:px-6 pb-12 text-center">
        <Link
          href={`/rehab-in/${countrySlug}`}
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          All centers in {loc.countryName}
        </Link>
      </div>
    </div>
  );
}

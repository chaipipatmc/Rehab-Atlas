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
import { ArrowLeft, ArrowRight, MapPin, Building2 } from "lucide-react";
import type { Center, CenterPhoto } from "@/types/center";

export const revalidate = 86400;

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://rehab-atlas.com";

// Condition definitions — keep in sync with /rehab/[condition]/page.tsx
const CITY_CONDITIONS: Record<
  string,
  { label: string; description: string; filters: string[] }
> = {
  "alcohol-addiction": {
    label: "Alcohol Addiction",
    description:
      "Alcohol addiction treatment combining medically supervised detox with behavioral therapy. Programs cover assessment, withdrawal management, individual and group therapy, and structured aftercare.",
    filters: ["alcohol", "alcohol_addiction", "substance_abuse", "detox"],
  },
  "drug-addiction": {
    label: "Drug Addiction",
    description:
      "Comprehensive drug addiction rehabilitation covering cocaine, methamphetamine, cannabis, and other illicit substances. Includes medically managed withdrawal and long-term recovery planning.",
    filters: ["drug_addiction", "substance_abuse", "drugs"],
  },
  "opioid-addiction": {
    label: "Opioid Addiction",
    description:
      "Specialized opioid addiction programs with medication-assisted treatment (MAT), safe detox protocols, and chronic pain alternatives.",
    filters: ["opioid_addiction", "opioids", "substance_abuse", "detox"],
  },
  "dual-diagnosis": {
    label: "Dual Diagnosis",
    description:
      "Integrated treatment for co-occurring substance use and mental health disorders, delivered by a coordinated psychiatric and addiction care team.",
    filters: ["dual_diagnosis", "co_occurring", "mental_health"],
  },
  "mental-health": {
    label: "Mental Health",
    description:
      "Residential and outpatient mental health treatment for depression, anxiety, bipolar disorder, and other psychiatric conditions.",
    filters: ["mental_health", "depression", "anxiety", "psychiatric"],
  },
  "gambling-addiction": {
    label: "Gambling Addiction",
    description:
      "Treatment for compulsive gambling using cognitive-behavioral therapy and co-occurring condition support.",
    filters: ["gambling", "behavioral_addiction", "gambling_addiction"],
  },
  "prescription-drug-abuse": {
    label: "Prescription Drug Abuse",
    description:
      "Medically supervised tapering and rehabilitation for benzodiazepine, opioid painkiller, and stimulant dependence.",
    filters: ["prescription_drug_abuse", "prescription_drugs", "substance_abuse", "detox"],
  },
  "eating-disorders": {
    label: "Eating Disorders",
    description:
      "Treatment for anorexia, bulimia, and binge eating disorder — nutritional rehabilitation alongside body image and psychiatric therapy.",
    filters: ["eating_disorders", "eating_disorder", "anorexia", "bulimia"],
  },
  "trauma-ptsd": {
    label: "Trauma & PTSD",
    description:
      "Trauma-informed care including EMDR, somatic experiencing, and prolonged exposure therapy in a secure residential setting.",
    filters: ["trauma", "ptsd", "trauma_ptsd"],
  },
  "behavioral-addiction": {
    label: "Behavioral Addiction",
    description:
      "Treatment for internet, gaming, sex, and shopping compulsions with trigger identification and reward-system restructuring.",
    filters: ["behavioral_addiction", "process_addiction", "internet_addiction"],
  },
};

interface PageProps {
  params: Promise<{ country: string; city: string; condition: string }>;
}

interface ResolvedLocation {
  countryName: string;
  cityName: string;
}

// Cached so generateMetadata + page render share a single fetch per request
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

export async function generateStaticParams(): Promise<
  { country: string; city: string; condition: string }[]
> {
  try {
    const admin = createAdminClient();
    const { data } = await admin
      .from("centers")
      .select("country, city, treatment_focus")
      .eq("status", "published");
    if (!data) return [];

    // Build a map of (country, city) → set of treatment_focus tokens
    type LocBucket = { countrySlug: string; citySlug: string; focus: Set<string> };
    const buckets = new Map<string, LocBucket>();
    for (const row of data) {
      if (!row.country || !row.city) continue;
      const cSlug = countryToSlug(row.country);
      const citySlug = cityToSlug(row.city);
      const key = `${cSlug}/${citySlug}`;
      if (!buckets.has(key)) {
        buckets.set(key, { countrySlug: cSlug, citySlug, focus: new Set() });
      }
      const bucket = buckets.get(key)!;
      const focus = (row as { treatment_focus: string[] | null }).treatment_focus || [];
      for (const f of focus) bucket.focus.add(f);
    }

    const out: { country: string; city: string; condition: string }[] = [];
    for (const bucket of buckets.values()) {
      for (const [condSlug, def] of Object.entries(CITY_CONDITIONS)) {
        if (def.filters.some((f) => bucket.focus.has(f))) {
          out.push({
            country: bucket.countrySlug,
            city: bucket.citySlug,
            condition: condSlug,
          });
        }
      }
    }
    return out;
  } catch {
    return [];
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { country, city, condition } = await params;
  const loc = await resolveLocation(country, city);
  const cond = CITY_CONDITIONS[condition];
  if (!loc || !cond) return { title: "Page Not Found — Rehab-Atlas" };

  const title = `${cond.label} Rehab in ${loc.cityName}, ${loc.countryName} | Rehab-Atlas`;
  const description = `Find ${cond.label.toLowerCase()} treatment centers in ${loc.cityName}, ${loc.countryName}. Compare verified programs and submit confidential inquiries through Rehab-Atlas.`;

  return {
    title: title.slice(0, 70),
    description: description.slice(0, 160),
    alternates: {
      canonical: `${BASE_URL}/rehab-in/${country}/${city}/${condition}`,
    },
    openGraph: {
      type: "website",
      title,
      description,
      url: `${BASE_URL}/rehab-in/${country}/${city}/${condition}`,
    },
  };
}

export default async function CityConditionPage({ params }: PageProps) {
  const { country: countrySlug, city: citySlug, condition: condSlug } = await params;
  const loc = await resolveLocation(countrySlug, citySlug);
  const cond = CITY_CONDITIONS[condSlug];
  if (!loc || !cond) notFound();

  const supabase = await createClient();

  // Fetch centers in this city matching ANY of the condition filters
  const queries = cond.filters.map((f) =>
    supabase
      .from("centers")
      .select("*, photos:center_photos(id, url, alt_text, sort_order, is_primary)")
      .eq("status", "published")
      .eq("country", loc.countryName)
      .eq("city", loc.cityName)
      .contains("treatment_focus", [f]),
  );
  const results = await Promise.all(queries);
  const seen = new Set<string>();
  const centers: (Center & { photos?: CenterPhoto[] })[] = [];
  for (const r of results) {
    for (const c of r.data || []) {
      if (!seen.has(c.id as string)) {
        seen.add(c.id as string);
        centers.push(c as unknown as Center & { photos?: CenterPhoto[] });
      }
    }
  }
  centers.sort((a, b) => {
    if (a.is_featured !== b.is_featured) return a.is_featured ? -1 : 1;
    return (b.editorial_overall ?? b.rating ?? 0) - (a.editorial_overall ?? a.rating ?? 0);
  });

  if (centers.length === 0) notFound();

  // FAQs for AISO
  const faqs = [
    {
      question: `Where can I find ${cond.label.toLowerCase()} treatment in ${loc.cityName}?`,
      answer: `${centers.length} verified ${centers.length === 1 ? "center offers" : "centers offer"} ${cond.label.toLowerCase()} programs in ${loc.cityName}, ${loc.countryName}. View each center's profile on Rehab-Atlas for program details, pricing, and clinical approach.`,
    },
    {
      question: `What does ${cond.label.toLowerCase()} treatment involve?`,
      answer: cond.description,
    },
    {
      question: `How do I choose between ${cond.label.toLowerCase()} centers in ${loc.cityName}?`,
      answer: `Compare clinical credentials, treatment approach (evidence-based vs. holistic), program length, accommodation tier, languages spoken, and pricing. Use the Rehab-Atlas comparison tool to view two or three centers side-by-side, or take the confidential assessment for a personalized match.`,
    },
    {
      question: `How do I contact a ${cond.label.toLowerCase()} center in ${loc.cityName}?`,
      answer: `All inquiries are routed through Rehab-Atlas to protect your privacy. Submit a single inquiry on the center's profile and our specialist team will coordinate the introduction confidentially.`,
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
          { name: cond.label, url: `${BASE_URL}/rehab-in/${countrySlug}/${citySlug}/${condSlug}` },
        ]}
      />
      <MedicalWebPageJsonLd
        title={`${cond.label} Rehab in ${loc.cityName}, ${loc.countryName}`}
        description={cond.description}
        url={`${BASE_URL}/rehab-in/${countrySlug}/${citySlug}/${condSlug}`}
      />
      <FAQJsonLd faqs={faqs} />

      <div className="container mx-auto px-4 sm:px-6 py-8 md:py-12 max-w-6xl">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-xs text-muted-foreground mb-6 flex-wrap">
          <Link href="/" className="hover:text-foreground">Home</Link>
          <span>/</span>
          <Link href="/rehab-in" className="hover:text-foreground">Destinations</Link>
          <span>/</span>
          <Link href={`/rehab-in/${countrySlug}`} className="hover:text-foreground">{loc.countryName}</Link>
          <span>/</span>
          <Link href={`/rehab-in/${countrySlug}/${citySlug}`} className="hover:text-foreground">{loc.cityName}</Link>
          <span>/</span>
          <span className="text-foreground">{cond.label}</span>
        </nav>

        {/* H1 + Intro */}
        <header className="mb-10 max-w-3xl">
          <div className="flex items-center gap-2 text-sm text-primary mb-3">
            <MapPin className="h-4 w-4" />
            <span>{loc.cityName}, {loc.countryName}</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-serif font-semibold text-foreground leading-tight">
            {cond.label} Rehab in {loc.cityName}
          </h1>
          <p className="mt-4 text-sm md:text-base text-muted-foreground leading-relaxed">
            {cond.description} The {centers.length} {centers.length === 1 ? "center" : "centers"} below in {loc.cityName} {centers.length === 1 ? "specializes" : "specialize"} in {cond.label.toLowerCase()} care.
          </p>

          <div className="flex flex-wrap gap-3 mt-6">
            <Button className="rounded-full gradient-primary text-white hover:opacity-90" asChild>
              <Link href="/assessment">Take Confidential Assessment</Link>
            </Button>
            <Button variant="outline" className="rounded-full ghost-border border-0 hover:bg-surface-container" asChild>
              <Link href={`/rehab-in/${countrySlug}/${citySlug}`}>
                All {loc.cityName} Centers
              </Link>
            </Button>
          </div>
        </header>

        {/* Centers grid */}
        <section>
          <div className="flex items-end justify-between mb-6">
            <h2 className="text-xl md:text-2xl font-serif font-semibold text-foreground">
              {cond.label} Centers in {loc.cityName}
            </h2>
            <span className="text-xs text-muted-foreground">
              {centers.length} {centers.length === 1 ? "center" : "centers"}
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {centers.map((c) => (
              <CenterCard key={c.id} center={c} />
            ))}
          </div>
        </section>

        {/* Related links */}
        <section className="mt-12">
          <h2 className="text-base font-serif font-semibold text-foreground mb-4">Related</h2>
          <div className="flex flex-wrap gap-2">
            <Link
              href={`/rehab/${condSlug}`}
              className="text-xs bg-surface-container-high text-foreground rounded-full px-3 py-1.5 hover:bg-primary/10 hover:text-primary transition-colors"
            >
              {cond.label} (all countries)
            </Link>
            <Link
              href={`/rehab-in/${countrySlug}`}
              className="text-xs bg-surface-container-high text-foreground rounded-full px-3 py-1.5 hover:bg-primary/10 hover:text-primary transition-colors"
            >
              All rehabs in {loc.countryName}
            </Link>
            <Link
              href={`/rehab-in/${countrySlug}/${citySlug}`}
              className="text-xs bg-surface-container-high text-foreground rounded-full px-3 py-1.5 hover:bg-primary/10 hover:text-primary transition-colors"
            >
              All rehabs in {loc.cityName}
            </Link>
          </div>
        </section>

        {/* FAQs */}
        <section className="mt-12 max-w-3xl">
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
        </section>

        {/* Back nav */}
        <div className="mt-12 text-center">
          <Link
            href={`/rehab-in/${countrySlug}/${citySlug}`}
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            All centers in {loc.cityName}
          </Link>
        </div>
      </div>

      {/* Bottom CTA */}
      <section className="container mx-auto px-4 sm:px-6 pb-12 max-w-6xl">
        <div className="bg-surface-container-low rounded-2xl p-8 text-center ghost-border">
          <Building2 className="h-8 w-8 text-primary mx-auto mb-3" />
          <h2 className="text-xl md:text-2xl font-serif font-semibold text-foreground">
            Need help choosing?
          </h2>
          <p className="mt-2 text-sm text-muted-foreground max-w-md mx-auto">
            Our specialists can match you with the right {cond.label.toLowerCase()} program in {loc.cityName} based on your needs.
          </p>
          <Button className="rounded-full gradient-primary text-white mt-5" asChild>
            <Link href="/inquiry">
              Send Confidential Inquiry <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </section>
    </div>
  );
}

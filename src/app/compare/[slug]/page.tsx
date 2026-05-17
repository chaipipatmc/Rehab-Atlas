import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { countryToSlug } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  MapPin,
  Star,
  Shield,
  ArrowRight,
  Check,
  X,
  ArrowLeft,
  Sparkles,
  AlertCircle,
} from "lucide-react";
import type { Metadata } from "next";
import type { Center, CenterPhoto } from "@/types/center";
import { BreadcrumbJsonLd } from "@/components/shared/json-ld";

// ISR: revalidate every 24h. Pre-rendered pairs stay fresh; new pairs render on demand.
export const revalidate = 86400;
export const dynamicParams = true;

const SEPARATOR = "-vs-";
const BASE_URL =
  process.env.NEXT_PUBLIC_APP_URL || "https://rehab-atlas.com";

interface PageProps {
  params: Promise<{ slug: string }>;
}

type CenterWithPhotos = Center & { photos?: CenterPhoto[] };

function parseSlugs(slug: string): string[] {
  return slug
    .split(SEPARATOR)
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 3);
}

function formatList(items: string[] | null | undefined): string {
  if (!items || items.length === 0) return "—";
  return items.map((s) => s.replace(/_/g, " ")).join(", ");
}

function formatPrice(center: Center): string {
  if (center.price_min) {
    const min = `$${center.price_min.toLocaleString()}`;
    const max = center.price_max
      ? ` – $${center.price_max.toLocaleString()}`
      : "+";
    return min + max;
  }
  if (center.pricing_text) return center.pricing_text;
  return "Contact for pricing";
}

function hasVariation(
  centers: CenterWithPhotos[],
  getValue: (c: CenterWithPhotos) => string,
): boolean {
  const values = centers.map(getValue);
  return new Set(values).size > 1;
}

/**
 * Pre-render the most popular comparison pairs at build time.
 * Takes top featured/rated centers, then pairs them within country (more natural matchups).
 * Falls back to ISR for any other valid slug combo.
 */
export async function generateStaticParams() {
  try {
    const supabase = createAdminClient();
    const { data: topCenters } = await supabase
      .from("centers")
      .select("slug, country, is_featured, editorial_overall, rating")
      .eq("status", "published")
      .order("is_featured", { ascending: false })
      .order("editorial_overall", { ascending: false, nullsFirst: false })
      .order("rating", { ascending: false, nullsFirst: false })
      .limit(40);

    if (!topCenters || topCenters.length < 2) return [];

    // Group by country for natural same-country pairs
    const byCountry = new Map<string, string[]>();
    for (const c of topCenters) {
      const key = c.country || "_other";
      if (!byCountry.has(key)) byCountry.set(key, []);
      byCountry.get(key)!.push(c.slug);
    }

    const params: { slug: string }[] = [];
    const seen = new Set<string>();

    // Within-country pairs
    for (const slugs of byCountry.values()) {
      for (let i = 0; i < slugs.length; i++) {
        for (let j = i + 1; j < slugs.length; j++) {
          const pair = [slugs[i], slugs[j]].sort();
          const key = pair.join(SEPARATOR);
          if (seen.has(key)) continue;
          seen.add(key);
          params.push({ slug: key });
          if (params.length >= 80) break;
        }
        if (params.length >= 80) break;
      }
      if (params.length >= 80) break;
    }

    // Add top cross-country pairs (Thailand vs Bali, etc.) up to 100 total
    const topSlugs = topCenters.slice(0, 12).map((c) => c.slug);
    for (let i = 0; i < topSlugs.length && params.length < 100; i++) {
      for (let j = i + 1; j < topSlugs.length && params.length < 100; j++) {
        const pair = [topSlugs[i], topSlugs[j]].sort();
        const key = pair.join(SEPARATOR);
        if (seen.has(key)) continue;
        seen.add(key);
        params.push({ slug: key });
      }
    }

    return params;
  } catch {
    return [];
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const slugs = parseSlugs(slug);

  if (slugs.length < 2) {
    return { title: "Compare Rehab Centers — Rehab-Atlas" };
  }

  const supabase = await createClient();
  const { data } = await supabase
    .from("centers")
    .select("name, city, country, short_description")
    .in("slug", slugs)
    .eq("status", "published");

  if (!data || data.length < 2) {
    return { title: "Comparison Not Found — Rehab-Atlas" };
  }

  const names = data.map((c) => c.name);
  const namesPretty = names.length === 2
    ? `${names[0]} vs ${names[1]}`
    : `${names.slice(0, -1).join(", ")} vs ${names[names.length - 1]}`;

  const countries = [...new Set(data.map((c) => c.country).filter(Boolean))];
  const locationStr = countries.length === 1 ? ` in ${countries[0]}` : "";

  const year = new Date().getFullYear();
  const title = `${namesPretty}: Which Rehab Should You Choose?${locationStr ? "" : ""} (${year})`;
  const description = `Side-by-side comparison of ${namesPretty}${locationStr}. Compare treatment programs, pricing, accreditation, languages, and amenities to find the right fit for you or your loved one.`;

  return {
    title: title.slice(0, 70),
    description: description.slice(0, 160),
    alternates: {
      canonical: `${BASE_URL}/compare/${slugs.sort().join(SEPARATOR)}`,
    },
    openGraph: {
      type: "website",
      title: title.slice(0, 70),
      description: description.slice(0, 160),
      url: `${BASE_URL}/compare/${slug}`,
    },
    robots: {
      index: true,
      follow: true,
    },
  };
}

export default async function CompareSlugPage({ params }: PageProps) {
  const { slug } = await params;
  const slugs = parseSlugs(slug);

  if (slugs.length < 2) notFound();

  const supabase = await createClient();
  const { data } = await supabase
    .from("centers")
    .select(
      "*, photos:center_photos(id, center_id, url, alt_text, sort_order, is_primary)",
    )
    .in("slug", slugs)
    .eq("status", "published")
    .order("sort_order", { referencedTable: "center_photos" })
    .limit(1, { referencedTable: "center_photos" });

  if (!data || data.length < 2) notFound();

  // Preserve URL order
  const centerMap = new Map(data.map((c) => [c.slug, c]));
  const centers = slugs
    .map((s) => centerMap.get(s))
    .filter(Boolean) as CenterWithPhotos[];

  if (centers.length < 2) notFound();

  // Compute commonalities & differences for intro
  const allFocus = centers.map((c) => new Set(c.treatment_focus || []));
  const commonFocus = [...allFocus[0]].filter((f) =>
    allFocus.every((s) => s.has(f)),
  );

  const allMethods = centers.map((c) => new Set(c.treatment_methods || []));
  const commonMethods = [...allMethods[0]].filter((m) =>
    allMethods.every((s) => s.has(m)),
  );

  const uniqueByCenter: Record<string, string[]> = {};
  centers.forEach((c, i) => {
    const others = centers
      .filter((_, j) => j !== i)
      .flatMap((o) => [
        ...(o.treatment_focus || []),
        ...(o.treatment_methods || []),
        ...(o.services || []),
      ]);
    const otherSet = new Set(others.map((s) => s.toLowerCase()));
    const myThings = [
      ...(c.treatment_focus || []),
      ...(c.treatment_methods || []),
      ...(c.services || []),
    ];
    uniqueByCenter[c.id] = [
      ...new Set(myThings.filter((s) => !otherSet.has(s.toLowerCase()))),
    ].slice(0, 4);
  });

  // Auto-generated FAQs for AI search (FAQPage schema)
  const namesPretty = centers.map((c) => c.name).join(" vs ");
  const faqs: { question: string; answer: string }[] = [
    {
      question: `What's the main difference between ${centers.map((c) => c.name).join(" and ")}?`,
      answer: centers
        .map((c) => {
          const u = uniqueByCenter[c.id];
          const loc = [c.city, c.country].filter(Boolean).join(", ");
          return `${c.name} (${loc}) stands out for ${
            u.length > 0
              ? u.map((s) => s.replace(/_/g, " ")).join(", ")
              : "its overall program quality"
          }.`;
        })
        .join(" "),
    },
    {
      question: `Which is more affordable — ${centers.map((c) => c.name).join(" or ")}?`,
      answer: centers
        .map((c) => `${c.name}: ${formatPrice(c)}.`)
        .join(" "),
    },
    {
      question: `Do these centers offer medical detox?`,
      answer: centers
        .map(
          (c) =>
            `${c.name} ${c.has_detox ? "offers on-site medical detox" : "does not list on-site medical detox"}.`,
        )
        .join(" "),
    },
    {
      question: `How do I contact ${centers.map((c) => c.name).join(" or ")}?`,
      answer: `All inquiries are handled confidentially through Rehab-Atlas. Submit a single inquiry form and our specialist team will review your needs and connect you with the right center.`,
    },
  ];

  const rows: {
    label: string;
    getValue: (c: CenterWithPhotos) => string;
    type?: "boolean" | "list" | "rating";
  }[] = [
    {
      label: "Location",
      getValue: (c) =>
        [c.city, c.state_province, c.country].filter(Boolean).join(", ") || "—",
    },
    {
      label: "Setting Type",
      getValue: (c) => c.setting_type?.replace(/_/g, " ") || "—",
    },
    {
      label: "Treatment Focus",
      getValue: (c) => formatList(c.treatment_focus),
      type: "list",
    },
    {
      label: "Conditions",
      getValue: (c) => formatList(c.conditions),
      type: "list",
    },
    {
      label: "Treatment Methods",
      getValue: (c) => formatList(c.treatment_methods),
      type: "list",
    },
    {
      label: "Services",
      getValue: (c) => formatList(c.services),
      type: "list",
    },
    {
      label: "Languages",
      getValue: (c) => formatList(c.languages),
      type: "list",
    },
    {
      label: "Program Length",
      getValue: (c) => c.program_length || "—",
    },
    {
      label: "Pricing",
      getValue: (c) => formatPrice(c),
    },
    {
      label: "Medical Detox",
      getValue: (c) => (c.has_detox ? "Yes" : "No"),
      type: "boolean",
    },
    {
      label: "Accreditation",
      getValue: (c) => formatList(c.accreditation),
      type: "list",
    },
    {
      label: "Rating",
      getValue: (c) =>
        c.editorial_overall
          ? `${c.editorial_overall}/10`
          : c.rating
            ? `${Number(c.rating).toFixed(1)}`
            : "—",
      type: "rating",
    },
  ];

  const colWidth = centers.length === 2 ? "w-1/2" : "w-1/3";
  const year = new Date().getFullYear();
  const canonicalPath = `/compare/${[...slugs].sort().join(SEPARATOR)}`;

  // JSON-LD: FAQPage + ComparisonPage (ItemList) for AI search
  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: f.question,
      acceptedAnswer: { "@type": "Answer", text: f.answer },
    })),
  };

  const itemListJsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: `${namesPretty} Comparison`,
    itemListElement: centers.map((c, i) => ({
      "@type": "ListItem",
      position: i + 1,
      url: `${BASE_URL}/centers/${c.slug}`,
      name: c.name,
    })),
  };

  return (
    <div className="bg-surface min-h-screen">
      {/* JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListJsonLd) }}
      />
      <BreadcrumbJsonLd
        items={[
          { name: "Home", url: BASE_URL },
          { name: "Centers", url: `${BASE_URL}/centers` },
          { name: "Compare", url: `${BASE_URL}/compare` },
          { name: namesPretty, url: `${BASE_URL}${canonicalPath}` },
        ]}
      />

      <div className="container mx-auto px-4 sm:px-6 py-8 md:py-12 max-w-7xl">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-xs text-muted-foreground mb-6">
          <Link
            href="/centers"
            className="hover:text-foreground transition-colors"
          >
            Centers
          </Link>
          <span>/</span>
          <Link
            href="/compare"
            className="hover:text-foreground transition-colors"
          >
            Compare
          </Link>
          <span>/</span>
          <span className="text-foreground truncate max-w-[60vw]">
            {namesPretty}
          </span>
        </nav>

        {/* SEO-friendly H1 + Intro */}
        <header className="mb-8 max-w-3xl">
          <h1 className="text-headline-lg md:text-display-md font-editorial font-semibold text-foreground">
            {namesPretty}: Which Rehab Center Should You Choose? ({year})
          </h1>
          <p className="mt-4 text-sm md:text-base text-muted-foreground leading-relaxed">
            Choosing the right rehab is a deeply personal decision — and one most
            people make with a loved one in mind. This side-by-side comparison
            of <strong className="text-foreground">{namesPretty}</strong> walks
            through what each center treats, how they treat it, what it costs,
            and where they differ — so you can ask better questions before
            making contact.
          </p>
        </header>

        {/* At-a-glance summary card */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-10">
          <div className="bg-surface-container-low rounded-2xl p-5 ghost-border">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="h-4 w-4 text-primary" />
              <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
                Both Centers Offer
              </p>
            </div>
            {commonFocus.length > 0 || commonMethods.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {[...commonFocus, ...commonMethods].slice(0, 8).map((item) => (
                  <span
                    key={item}
                    className="text-[11px] bg-primary/10 text-primary rounded-full px-2.5 py-0.5"
                  >
                    {item.replace(/_/g, " ")}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">
                These centers take different clinical approaches — see the
                comparison below for details.
              </p>
            )}
          </div>

          <div className="bg-surface-container-low rounded-2xl p-5 ghost-border">
            <div className="flex items-center gap-2 mb-3">
              <AlertCircle className="h-4 w-4 text-primary" />
              <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
                Where They Differ Most
              </p>
            </div>
            <div className="space-y-2">
              {centers.map((c) => {
                const u = uniqueByCenter[c.id];
                if (u.length === 0) return null;
                return (
                  <div key={c.id} className="text-xs">
                    <span className="font-medium text-foreground">
                      {c.name}:
                    </span>{" "}
                    <span className="text-muted-foreground">
                      {u.map((s) => s.replace(/_/g, " ")).join(", ")}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Sticky Header with Center Names + Photos */}
        <div className="bg-surface-container-lowest rounded-2xl shadow-ambient overflow-hidden">
          <div className="flex border-b border-surface-container">
            {centers.map((center) => {
              const photo = center.photos?.[0];
              return (
                <div
                  key={center.id}
                  className={`${colWidth} p-5 sm:p-6 flex flex-col items-center text-center`}
                >
                  <div className="relative w-full aspect-[16/10] bg-surface-container rounded-xl overflow-hidden mb-4">
                    {photo ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={photo.url}
                        alt={photo.alt_text || center.name}
                        className="absolute inset-0 w-full h-full object-cover"
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
                        <Shield className="h-8 w-8" />
                      </div>
                    )}
                    {center.verified_profile && (
                      <div className="absolute top-2 left-2">
                        <span className="inline-flex items-center gap-1 bg-white/90 backdrop-blur-sm text-[10px] text-foreground rounded-full px-2 py-0.5">
                          <Shield className="h-2.5 w-2.5 text-primary" />
                          Verified
                        </span>
                      </div>
                    )}
                  </div>

                  <Link
                    href={`/centers/${center.slug}`}
                    className="font-editorial text-base sm:text-lg font-semibold text-foreground hover:text-primary transition-colors duration-300 line-clamp-2"
                  >
                    {center.name}
                  </Link>

                  <p className="flex items-center gap-1 text-xs text-muted-foreground mt-1.5">
                    <MapPin className="h-3 w-3 flex-shrink-0" />
                    {[center.city, center.country].filter(Boolean).join(", ")}
                  </p>

                  {center.rating && (
                    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground mt-1.5">
                      <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                      {Number(center.rating).toFixed(1)}
                    </span>
                  )}

                  <div className="flex flex-col gap-2 mt-4 w-full">
                    <Button
                      className="rounded-full gradient-primary text-white hover:opacity-90 text-xs w-full"
                      size="sm"
                      asChild
                    >
                      <Link href={`/inquiry?center=${center.id}`}>
                        Send Inquiry
                      </Link>
                    </Button>
                    <Button
                      variant="outline"
                      className="rounded-full ghost-border border-0 hover:bg-surface-container text-xs w-full"
                      size="sm"
                      asChild
                    >
                      <Link href={`/centers/${center.slug}`}>View Profile</Link>
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Comparison rows */}
          <div className="divide-y divide-surface-container">
            {rows.map((row) => {
              const varied = hasVariation(centers, row.getValue);
              return (
                <div key={row.label} className="flex">
                  {centers.map((center, i) => {
                    const value = row.getValue(center);
                    const isPositiveBoolean =
                      row.type === "boolean" && value === "Yes";
                    const isNegativeBoolean =
                      row.type === "boolean" && value === "No";

                    return (
                      <div
                        key={center.id}
                        className={`${colWidth} p-4 sm:p-5 ${
                          i > 0 ? "border-l border-surface-container" : ""
                        }`}
                      >
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5">
                          {row.label}
                        </p>
                        <div
                          className={`text-sm leading-relaxed ${
                            varied
                              ? "text-foreground font-medium"
                              : "text-muted-foreground"
                          }`}
                        >
                          {row.type === "boolean" ? (
                            <span
                              className={`inline-flex items-center gap-1.5 ${
                                isPositiveBoolean
                                  ? "text-emerald-600"
                                  : isNegativeBoolean
                                    ? "text-muted-foreground"
                                    : ""
                              }`}
                            >
                              {isPositiveBoolean ? (
                                <Check className="h-4 w-4" />
                              ) : (
                                <X className="h-4 w-4" />
                              )}
                              {value}
                            </span>
                          ) : row.type === "list" ? (
                            <div className="flex flex-wrap gap-1.5">
                              {value === "—" ? (
                                <span className="text-muted-foreground">—</span>
                              ) : (
                                value.split(", ").map((item) => {
                                  const otherCenters = centers.filter(
                                    (_, j) => j !== i,
                                  );
                                  const isUnique = !otherCenters.some((oc) =>
                                    row
                                      .getValue(oc)
                                      .toLowerCase()
                                      .includes(item.toLowerCase()),
                                  );
                                  return (
                                    <span
                                      key={item}
                                      className={`text-[11px] rounded-full px-2.5 py-0.5 ${
                                        isUnique
                                          ? "bg-primary/10 text-primary font-medium"
                                          : "bg-surface-container-high text-muted-foreground"
                                      }`}
                                    >
                                      {item}
                                    </span>
                                  );
                                })
                              )}
                            </div>
                          ) : row.type === "rating" ? (
                            <span className="inline-flex items-center gap-1">
                              {value !== "—" && (
                                <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                              )}
                              {value}
                            </span>
                          ) : (
                            <span>{value}</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>

          {/* Bottom CTA row */}
          <div className="flex border-t border-surface-container bg-surface-container-low/50">
            {centers.map((center) => (
              <div key={center.id} className={`${colWidth} p-5 text-center`}>
                <Button
                  className="rounded-full gradient-primary text-white hover:opacity-90 text-xs"
                  size="sm"
                  asChild
                >
                  <Link href={`/inquiry?center=${center.id}`}>
                    Submit Inquiry
                    <ArrowRight className="ml-1.5 h-3 w-3" />
                  </Link>
                </Button>
              </div>
            ))}
          </div>
        </div>

        {/* FAQ Section (visible + JSON-LD above) */}
        <section className="mt-12 max-w-3xl">
          <h2 className="text-headline-md font-editorial font-semibold text-foreground mb-6">
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
                  <span className="text-primary text-lg group-open:rotate-45 transition-transform">
                    +
                  </span>
                </summary>
                <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
                  {faq.answer}
                </p>
              </details>
            ))}
          </div>
        </section>

        {/* Internal links to related hubs */}
        <section className="mt-12 max-w-3xl">
          <h2 className="text-headline-sm font-editorial font-semibold text-foreground mb-4">
            Related Resources
          </h2>
          <div className="flex flex-wrap gap-2">
            {[
              ...new Set(centers.map((c) => c.country).filter(Boolean)),
            ].map((country) => (
              <Link
                key={country}
                href={`/rehab-in/${countryToSlug(country as string)}`}
                className="text-xs bg-surface-container-high text-foreground rounded-full px-3 py-1.5 hover:bg-primary/10 hover:text-primary transition-colors"
              >
                More rehabs in {country}
              </Link>
            ))}
            <Link
              href="/centers"
              className="text-xs bg-surface-container-high text-foreground rounded-full px-3 py-1.5 hover:bg-primary/10 hover:text-primary transition-colors"
            >
              Browse all centers
            </Link>
            <Link
              href="/assessment"
              className="text-xs bg-surface-container-high text-foreground rounded-full px-3 py-1.5 hover:bg-primary/10 hover:text-primary transition-colors"
            >
              Take the matching assessment
            </Link>
          </div>
        </section>

        {/* Disclaimer + back link */}
        <div className="mt-12 text-center">
          <Link
            href="/centers"
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to all centers
          </Link>
          <p className="text-[10px] text-muted-foreground mt-4">
            All inquiries are handled confidentially through Rehab-Atlas. We do
            not share your information without your consent.
          </p>
        </div>
      </div>
    </div>
  );
}

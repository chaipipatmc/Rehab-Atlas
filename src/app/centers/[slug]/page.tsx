import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { CenterBadges } from "@/components/centers/badges";
import { EditorialRatings } from "@/components/centers/editorial-rating";
import {
  MapPin,
  Globe,
  Clock,
  Star,
  ArrowRight,
  Shield,
} from "lucide-react";
import type { Metadata } from "next";
import type { Center, CenterFaq } from "@/types/center";
import { BreadcrumbJsonLd, FAQJsonLd } from "@/components/shared/json-ld";
import { ViewTracker } from "@/components/shared/view-tracker";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const supabase = await createClient();

  // Fetch center with its primary photo in one query
  const { data: center } = await supabase
    .from("centers")
    .select("id, name, short_description, city, country, photos:center_photos(url, alt_text)")
    .eq("slug", slug)
    .eq("status", "published")
    .order("sort_order", { referencedTable: "center_photos" })
    .limit(1, { referencedTable: "center_photos" })
    .single();

  if (!center) return { title: "Center Not Found" };

  const location = [center.city, center.country].filter(Boolean).join(", ");
  const description =
    center.short_description ||
    `Learn about ${center.name} rehab center in ${location}. View treatment programs, pricing, and more.`;

  const photos = center.photos as Array<{ url: string; alt_text: string | null }> | null;
  const primaryPhoto = photos?.[0] ?? null;

  return {
    title: `${center.name} — ${location}`,
    description,
    openGraph: {
      type: "website",
      ...(primaryPhoto
        ? {
            images: [
              {
                url: primaryPhoto.url,
                width: 1200,
                height: 630,
                alt: primaryPhoto.alt_text || center.name,
              },
            ],
          }
        : {}),
    },
  };
}

export default async function CenterProfilePage({ params }: PageProps) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: center } = await supabase
    .from("centers")
    .select("*")
    .eq("slug", slug)
    .eq("status", "published")
    .single();

  if (!center) notFound();

  const typedCenter = center as unknown as Center;

  // Load photos
  const { data: photos } = await supabase
    .from("center_photos")
    .select("*")
    .eq("center_id", center.id)
    .order("sort_order");

  // Load FAQs
  const { data: faqs } = await supabase
    .from("center_faqs")
    .select("*")
    .eq("center_id", center.id)
    .order("sort_order");

  const typedFaqs = (faqs || []) as unknown as CenterFaq[];

  const location = [typedCenter.city, typedCenter.state_province, typedCenter.country]
    .filter(Boolean)
    .join(", ");

  // Auto-generate FAQs from center data if none exist manually
  const autoFaqs: { question: string; answer: string }[] = [];
  autoFaqs.push({
    question: `What types of treatment does ${typedCenter.name} offer?`,
    answer: (typedCenter.treatment_focus || []).length > 0
      ? `${typedCenter.name} specializes in ${(typedCenter.treatment_focus || []).join(", ")}. ${(typedCenter.services || []).length > 0 ? `Services include ${(typedCenter.services || []).slice(0, 5).join(", ")}.` : ""}`
      : `${typedCenter.name} offers comprehensive rehabilitation and treatment programs. Contact Rehab-Atlas for details.`,
  });
  if (location) {
    autoFaqs.push({
      question: `Where is ${typedCenter.name} located?`,
      answer: `${typedCenter.name} is located in ${location}.${typedCenter.setting_type ? ` It is a ${typedCenter.setting_type.replace(/_/g, " ")} facility.` : ""}`,
    });
  }
  if (typedCenter.pricing_text) {
    autoFaqs.push({
      question: `How much does treatment at ${typedCenter.name} cost?`,
      answer: typedCenter.pricing_text + (typedCenter.insurance && typedCenter.insurance.length > 0 ? ` Insurance accepted: ${typedCenter.insurance.join(", ")}.` : ""),
    });
  }
  if (typedCenter.program_length) {
    autoFaqs.push({
      question: `How long is the program at ${typedCenter.name}?`,
      answer: `The typical program length at ${typedCenter.name} is ${typedCenter.program_length}.`,
    });
  }
  autoFaqs.push({
    question: `How do I contact ${typedCenter.name}?`,
    answer: `All inquiries are handled confidentially through Rehab-Atlas. Submit an inquiry on our platform and our specialist team will review your needs and connect you with ${typedCenter.name}.`,
  });
  if (typedCenter.has_detox) {
    autoFaqs.push({
      question: `Does ${typedCenter.name} offer medical detox?`,
      answer: `Yes, ${typedCenter.name} offers on-site medical detox services as part of their treatment programs.`,
    });
  }

  // Combine manual FAQs + auto FAQs (manual first, no duplicates)
  const allFaqsForSchema = [
    ...typedFaqs.map(f => ({ question: f.question, answer: f.answer })),
    ...autoFaqs,
  ];

  const BASE_URL =
    process.env.NEXT_PUBLIC_APP_URL || "https://rehab-atlas.vercel.app";

  return (
    <div className="bg-surface min-h-screen">
      <ViewTracker centerId={typedCenter.id} event="profile_view" />
      <BreadcrumbJsonLd
        items={[
          { name: "Home", url: BASE_URL },
          { name: "Centers", url: `${BASE_URL}/centers` },
          { name: typedCenter.name, url: `${BASE_URL}/centers/${typedCenter.slug}` },
        ]}
      />
      <FAQJsonLd faqs={allFaqsForSchema} />
      {/* Breadcrumb */}
      <div className="container mx-auto px-4 sm:px-6 pt-4 sm:pt-6">
        <nav className="flex items-center gap-2 text-xs text-muted-foreground">
          <Link href="/centers" className="hover:text-foreground transition-colors duration-300">
            Centers
          </Link>
          <span>/</span>
          <span className="text-foreground">{typedCenter.name}</span>
        </nav>
      </div>

      {/* Hero Section */}
      <div className="container mx-auto px-4 sm:px-6 pt-4 sm:pt-6 pb-6 sm:pb-8">
        <div className="flex flex-col lg:flex-row gap-6 md:gap-8 items-start">
          {/* Title + Badges */}
          <div className="flex-1">
            <h1 className="text-headline-lg md:text-display-md font-semibold text-foreground">
              {typedCenter.name}
            </h1>
            <div className="flex flex-wrap items-center gap-3 mt-3">
              {location && (
                <span className="flex items-center gap-1 text-sm text-muted-foreground">
                  <MapPin className="h-3.5 w-3.5" />
                  {location}
                </span>
              )}
              {typedCenter.rating && (
                <span className="flex items-center gap-1 text-sm text-muted-foreground">
                  <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                  {Number(typedCenter.rating).toFixed(1)} RATED
                </span>
              )}
              <CenterBadges
                verifiedProfile={typedCenter.verified_profile}
                trustedPartner={typedCenter.trusted_partner}
                isSponsored={typedCenter.is_sponsored}
              />
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-wrap gap-3 mt-6">
              <Button className="rounded-full px-6 gradient-primary text-white hover:opacity-90 transition-opacity duration-300" asChild>
                <Link href={`/inquiry?center=${typedCenter.id}`}>
                  Submit Inquiry via Rehab-Atlas
                </Link>
              </Button>
              <Button variant="outline" className="rounded-full ghost-border border-0 hover:bg-surface-container transition-colors duration-300" asChild>
                <Link href={`/inquiry?center=${typedCenter.id}&call=true`}>
                  Request a Confidential Call
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Image Gallery */}
      {photos && photos.length > 0 && (
        <div className="container mx-auto px-4 sm:px-6 mb-8 md:mb-10">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3 h-48 md:h-80">
            {/* Main large image */}
            <div className="col-span-2 row-span-2 rounded-2xl bg-surface-container overflow-hidden relative">
              <img
                src={photos[0].url}
                alt={photos[0].alt_text || typedCenter.name}
                className="absolute inset-0 w-full h-full object-cover"
              />
            </div>
            {/* Secondary images */}
            {photos.slice(1, 5).map((photo, i) => (
              <div key={photo.id} className="rounded-2xl bg-surface-container overflow-hidden relative">
                <img
                  src={photo.url}
                  alt={photo.alt_text || `${typedCenter.name} photo ${i + 2}`}
                  className="absolute inset-0 w-full h-full object-cover"
                />
                {i === 3 && photos.length > 5 && (
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                    <span className="text-white text-sm font-medium">+{photos.length - 5} more</span>
                  </div>
                )}
              </div>
            ))}
            {/* Fill empty slots if less than 4 secondary images */}
            {photos.length < 5 && Array.from({ length: 4 - (photos.length - 1) }).map((_, i) => (
              <div key={`empty-${i}`} className="rounded-2xl bg-surface-container overflow-hidden" />
            ))}
          </div>
        </div>
      )}

<div className="container mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 md:gap-10">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-12">
            {/* Treatment & Focus */}
            <section>
              <h2 className="text-headline-lg font-semibold text-foreground flex items-center gap-2">
                Treatment &amp; Focus
              </h2>

              {typedCenter.description && (
                <blockquote className="mt-4 font-editorial italic text-lg text-foreground/80 leading-relaxed">
                  &ldquo;{typedCenter.short_description || typedCenter.description.slice(0, 150)}&rdquo;
                </blockquote>
              )}

              {/* Treatment Focus Tags */}
              {(typedCenter.treatment_focus || []).length > 0 && (
                <div className="mt-6">
                  <p className="text-xs uppercase tracking-wider text-muted-foreground mb-3">
                    Conditions &amp; Focus
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {(typedCenter.treatment_focus || []).map((t) => (
                      <span
                        key={t}
                        className="text-xs bg-surface-container-high text-foreground rounded-full px-3 py-1.5"
                      >
                        {t.replace(/_/g, " ")}
                      </span>
                    ))}
                    {(typedCenter.conditions || []).map((c) => (
                      <span
                        key={c}
                        className="text-xs bg-surface-container-high text-foreground rounded-full px-3 py-1.5"
                      >
                        {c.replace(/_/g, " ")}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Services & Methods grid */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-8">
                {(typedCenter.services || []).slice(0, 6).map((s) => (
                  <div key={s} className="text-center p-4 bg-surface-container-low rounded-xl ghost-border">
                    <Shield className="h-5 w-5 text-primary mx-auto mb-2" />
                    <p className="text-xs text-foreground capitalize">{s.replace(/_/g, " ")}</p>
                  </div>
                ))}
              </div>
            </section>

{/* Editorial Quote */}
            <section className="bg-surface-container-low rounded-2xl p-8 ghost-border">
              <p className="text-xs uppercase tracking-wider text-muted-foreground mb-4">
                Rehab-Atlas Editorial Review
              </p>
              <blockquote className="font-editorial italic text-lg text-foreground leading-relaxed">
                &ldquo;{typedCenter.description?.slice(0, 250) || "A distinguished facility combining clinical excellence with an environment of profound tranquility."}&rdquo;
              </blockquote>
            </section>

            {/* Editorial Ratings */}
            <EditorialRatings
              overall={typedCenter.editorial_overall}
              staff={typedCenter.editorial_staff}
              facility={typedCenter.editorial_facility}
              program={typedCenter.editorial_program}
              privacy={typedCenter.editorial_privacy}
              value={typedCenter.editorial_value}
            />

            {/* Pricing & Program */}
            <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {typedCenter.pricing_text && (
                <div className="bg-surface-container-low rounded-xl p-5 ghost-border text-center">
                  <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Duration</p>
                  <p className="text-sm font-medium text-foreground">{typedCenter.program_length || "Custom"}</p>
                </div>
              )}
              <div className="bg-surface-container-low rounded-xl p-5 ghost-border text-center">
                <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Approach</p>
                <p className="text-sm font-medium text-foreground">
                  {typedCenter.setting_type || "Integrated"}
                </p>
              </div>
            </section>

            {/* FAQs — manual + auto-generated */}
            <section>
              <h2 className="text-headline-lg font-semibold text-foreground mb-6">
                Frequently Asked Questions
              </h2>
              <Accordion>
                {/* Manual FAQs first */}
                {typedFaqs.map((faq) => (
                  <AccordionItem key={faq.id}>
                    <AccordionTrigger className="text-left text-sm font-medium text-foreground">
                      {faq.question}
                    </AccordionTrigger>
                    <AccordionContent className="text-sm text-muted-foreground leading-relaxed">
                      {faq.answer}
                    </AccordionContent>
                  </AccordionItem>
                ))}
                {/* Auto-generated FAQs */}
                {autoFaqs.map((faq, i) => (
                  <AccordionItem key={`auto-${i}`}>
                    <AccordionTrigger className="text-left text-sm font-medium text-foreground">
                      {faq.question}
                    </AccordionTrigger>
                    <AccordionContent className="text-sm text-muted-foreground leading-relaxed">
                      {faq.answer}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </section>

            {/* Map */}
            {typedCenter.latitude && typedCenter.longitude && (
              <section>
                <h2 className="text-headline-lg font-semibold text-foreground mb-4">
                  Location
                </h2>
                <div className="aspect-video bg-surface-container rounded-2xl overflow-hidden">
                  <iframe
                    width="100%"
                    height="100%"
                    style={{ border: 0 }}
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                    src={`https://www.google.com/maps?q=${typedCenter.latitude},${typedCenter.longitude}&z=14&output=embed`}
                    title="Center location"
                  />
                </div>
              </section>
            )}
          </div>

          {/* Sidebar */}
          <aside className="space-y-6">
            {/* Inquiry Card */}
            <div className="sticky top-24 bg-surface-container-lowest rounded-2xl p-6 shadow-ambient space-y-5">
              <h3 className="text-headline-sm font-semibold text-foreground">
                Start Your Journey Today
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Submit a confidential inquiry through Rehab-Atlas. Our specialists will review your needs and guide you through the process.
              </p>

              <Button className="w-full rounded-full gradient-primary text-white hover:opacity-90 transition-opacity duration-300" asChild>
                <Link href={`/inquiry?center=${typedCenter.id}`}>
                  Complete Inquiry
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>

              {/* Center Info (no phone/email — contact via Rehab-Atlas only) */}
              <div className="space-y-3 pt-4">
                {typedCenter.website_url && (
                  <div className="flex items-center gap-2.5 text-sm text-muted-foreground">
                    <Globe className="h-4 w-4 flex-shrink-0 text-primary" />
                    <a href={typedCenter.website_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                      Visit Website
                    </a>
                  </div>
                )}
                {typedCenter.program_length && (
                  <div className="flex items-center gap-2.5 text-sm text-muted-foreground">
                    <Clock className="h-4 w-4 flex-shrink-0 text-primary" />
                    The typical length is {typedCenter.program_length}.
                  </div>
                )}
              </div>
              <p className="text-[10px] text-muted-foreground pt-2">
                All inquiries are handled through Rehab-Atlas to protect your privacy.
              </p>

              {/* Insurance */}
              {(typedCenter.insurance || []).length > 0 && (
                <div className="pt-4">
                  <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">
                    Insurance Accepted
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {(typedCenter.insurance || []).slice(0, 4).map((ins) => (
                      <Badge key={ins} variant="secondary" className="text-[10px] rounded-full bg-surface-container-high">
                        {ins}
                      </Badge>
                    ))}
                    {(typedCenter.insurance || []).length > 4 && (
                      <Badge variant="secondary" className="text-[10px] rounded-full bg-surface-container-high">
                        +{(typedCenter.insurance || []).length - 4} more
                      </Badge>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Explore more CTA */}
            <div className="bg-surface-container-low rounded-2xl p-6 ghost-border">
              <p className="text-sm font-medium text-foreground">
                Explore our curated collection of verified centers
              </p>
              <Button variant="outline" className="mt-3 rounded-full ghost-border border-0 text-xs" asChild>
                <Link href="/centers">Browse All Centers</Link>
              </Button>
            </div>
          </aside>
        </div>
      </div>

      {/* Bottom spacing */}
      <div className="h-20" />
    </div>
  );
}

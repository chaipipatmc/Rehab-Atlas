import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { countryToSlug } from "@/lib/utils";
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
  ShieldCheck,
  Languages,
  Pill,
  Brain,
  Quote,
  Users,
  UserCheck,
  Compass,
  HeartHandshake,
  Sparkles,
  Activity,
  Accessibility,
} from "lucide-react";
import type { Metadata } from "next";
import type { Center, CenterFaq, CenterStaff } from "@/types/center";
import { BreadcrumbJsonLd, FAQJsonLd, LocalBusinessJsonLd } from "@/components/shared/json-ld";
import { ViewTracker } from "@/components/shared/view-tracker";
import { SaveButton } from "@/components/centers/save-button";
import { PhotoGallery } from "@/components/centers/photo-gallery";

interface PageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ preview?: string }>;
}

async function canPreview(supabase: Awaited<ReturnType<typeof createClient>>, centerSlug: string): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;
  const { data: profile } = await supabase.from("profiles").select("role, center_id").eq("id", user.id).single();
  if (!profile) return false;
  // Admins can preview any center
  if (profile.role === "admin") return true;
  // Partners can preview their own center
  if (profile.role === "partner" && profile.center_id) {
    const { data: center } = await supabase.from("centers").select("slug").eq("id", profile.center_id).single();
    return center?.slug === centerSlug;
  }
  return false;
}

export async function generateMetadata({ params, searchParams }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const { preview } = await searchParams;
  const supabase = await createClient();

  const isPreview = preview === "1" && await canPreview(supabase, slug);

  // Fetch center with its primary photo in one query
  let query = supabase
    .from("centers")
    .select("id, name, short_description, city, country, photos:center_photos(url, alt_text)")
    .eq("slug", slug);
  if (!isPreview) query = query.eq("status", "published");
  const { data: center } = await query
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

export default async function CenterProfilePage({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const { preview } = await searchParams;
  const supabase = await createClient();

  const isPreview = preview === "1" && await canPreview(supabase, slug);

  let query = supabase
    .from("centers")
    .select("*")
    .eq("slug", slug);
  if (!isPreview) query = query.eq("status", "published");
  const { data: center } = await query.single();

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

  // Load staff
  const { data: staffRows } = await supabase
    .from("center_staff")
    .select("*")
    .eq("center_id", center.id)
    .order("sort_order");

  const staff = (staffRows || []) as unknown as CenterStaff[];

  // Check if user has saved this center
  let isSaved = false;
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    const { data: savedRow } = await supabase
      .from("saved_centers")
      .select("id")
      .eq("user_id", user.id)
      .eq("center_id", center.id)
      .single();
    isSaved = !!savedRow;
  }

  const cityParts = [typedCenter.city, typedCenter.state_province].filter(Boolean).join(", ");
  const location = [cityParts, typedCenter.country].filter(Boolean).join(", ");
  const countrySlug = typedCenter.country ? countryToSlug(typedCenter.country) : null;

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
      {isPreview && (
        <div className="bg-amber-500 text-white text-center py-2 text-xs font-medium tracking-wide">
          ADMIN PREVIEW — This center is not published yet. This is how it will look to users.
        </div>
      )}
      <ViewTracker centerId={typedCenter.id} event="profile_view" />
      <BreadcrumbJsonLd
        items={[
          { name: "Home", url: BASE_URL },
          { name: "Centers", url: `${BASE_URL}/centers` },
          { name: typedCenter.name, url: `${BASE_URL}/centers/${typedCenter.slug}` },
        ]}
      />
      <FAQJsonLd faqs={allFaqsForSchema} />
      <LocalBusinessJsonLd
        name={typedCenter.name}
        description={typedCenter.short_description || undefined}
        url={`${BASE_URL}/centers/${typedCenter.slug}`}
        image={(photos as Array<{url: string}> | null)?.[0]?.url || undefined}
        address={{
          street: typedCenter.address || undefined,
          city: typedCenter.city || undefined,
          region: typedCenter.state_province || undefined,
          country: typedCenter.country || undefined,
        }}
        phone={typedCenter.phone || undefined}
        email={typedCenter.email || undefined}
        priceRange={typedCenter.pricing_text || undefined}
        rating={typedCenter.editorial_overall ? { value: typedCenter.editorial_overall } : undefined}
      />
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
            <div className="flex items-start gap-3">
              <h1 className="text-headline-lg md:text-display-md font-semibold text-foreground">
                {typedCenter.name}
              </h1>
              <SaveButton centerId={typedCenter.id} initialSaved={isSaved} />
            </div>
            <div className="flex flex-wrap items-center gap-3 mt-3">
              {location && (
                <span className="flex items-center gap-1 text-sm text-muted-foreground">
                  <MapPin className="h-3.5 w-3.5" />
                  {cityParts}{cityParts && typedCenter.country ? ", " : ""}
                  {typedCenter.country && countrySlug ? (
                    <Link href={`/rehab-in/${countrySlug}`} className="text-primary hover:underline">
                      {typedCenter.country}
                    </Link>
                  ) : typedCenter.country}
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
                isUnclaimed={(typedCenter as unknown as Record<string, unknown>).is_unclaimed as boolean}
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
        <PhotoGallery
          photos={(photos as Array<{ id: string; url: string; alt_text: string | null }>)}
          centerName={typedCenter.name}
        />
      )}

<div className="container mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 md:gap-10">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-12">
            {/* About Section — Full Description */}
            {typedCenter.description && (
              <section>
                <h2 className="text-headline-lg font-semibold text-foreground">
                  About {typedCenter.name}
                </h2>
                <div className="mt-4 text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
                  {typedCenter.description}
                </div>
              </section>
            )}

            {/* Treatment & Focus */}
            <section>
              <h2 className="text-headline-lg font-semibold text-foreground flex items-center gap-2">
                Treatment &amp; Focus
              </h2>

              {typedCenter.short_description && (
                <blockquote className="mt-4 font-editorial italic text-lg text-foreground/80 leading-relaxed">
                  &ldquo;{typedCenter.short_description}&rdquo;
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

              {/* Who We Treat */}
              {(typedCenter.who_we_treat || []).length > 0 && (
                <div className="mt-8">
                  <p className="text-xs uppercase tracking-wider text-muted-foreground mb-3">
                    Who We Treat
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {(typedCenter.who_we_treat || []).map((w) => (
                      <span
                        key={w}
                        className="inline-flex items-center gap-1.5 text-xs bg-surface-container-high text-foreground rounded-full px-3 py-1.5"
                      >
                        <UserCheck className="h-3 w-3 text-primary" />
                        {w.replace(/_/g, " ")}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Services grid */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-8">
                {(typedCenter.services || []).slice(0, 6).map((s) => (
                  <div key={s} className="text-center p-4 bg-surface-container-low rounded-xl ghost-border">
                    <Shield className="h-5 w-5 text-primary mx-auto mb-2" />
                    <p className="text-xs text-foreground capitalize">{s.replace(/_/g, " ")}</p>
                  </div>
                ))}
              </div>

              {/* Treatment Methods */}
              {(typedCenter.treatment_methods || []).length > 0 && (
                <div className="mt-8">
                  <p className="text-xs uppercase tracking-wider text-muted-foreground mb-3">
                    Treatment Methods
                  </p>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {(typedCenter.treatment_methods || []).map((m) => (
                      <div key={m} className="flex items-center gap-2.5 p-3 bg-surface-container-low rounded-xl ghost-border">
                        <Brain className="h-4 w-4 text-primary flex-shrink-0" />
                        <span className="text-xs text-foreground capitalize">{m.replace(/_/g, " ")}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Our Approach */}
              {(typedCenter.approaches || []).length > 0 && (
                <div className="mt-8">
                  <p className="text-xs uppercase tracking-wider text-muted-foreground mb-3">
                    Our Approach
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {(typedCenter.approaches || []).map((a) => (
                      <span
                        key={a}
                        className="inline-flex items-center gap-1.5 text-xs bg-primary/10 text-primary rounded-full px-3 py-1.5"
                      >
                        <Compass className="h-3 w-3" />
                        {a.replace(/_/g, " ")}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Substances Treated */}
              {(typedCenter.substance_use || []).length > 0 && (
                <div className="mt-8">
                  <p className="text-xs uppercase tracking-wider text-muted-foreground mb-3">
                    Substances Treated
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {(typedCenter.substance_use || []).map((s) => (
                      <span
                        key={s}
                        className="inline-flex items-center gap-1.5 text-xs bg-primary/10 text-primary rounded-full px-3 py-1.5"
                      >
                        <Pill className="h-3 w-3" />
                        {s.replace(/_/g, " ")}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Aftercare */}
              {(typedCenter.aftercare || []).length > 0 && (
                <div className="mt-8">
                  <p className="text-xs uppercase tracking-wider text-muted-foreground mb-3">
                    Aftercare
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {(typedCenter.aftercare || []).map((a) => (
                      <span
                        key={a}
                        className="inline-flex items-center gap-1.5 text-xs bg-surface-container-high text-foreground rounded-full px-3 py-1.5"
                      >
                        <HeartHandshake className="h-3 w-3 text-primary" />
                        {a.replace(/_/g, " ")}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </section>

            {/* Experience — Amenities, Activities, Accommodations */}
            {((typedCenter.amenities || []).length > 0 || (typedCenter.activities || []).length > 0 || (typedCenter.accommodations || []).length > 0) && (
              <section>
                <h2 className="text-headline-lg font-semibold text-foreground flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary" />
                  The Experience
                </h2>

                {/* Amenities */}
                {(typedCenter.amenities || []).length > 0 && (
                  <div className="mt-6">
                    <p className="text-xs uppercase tracking-wider text-muted-foreground mb-3">
                      Amenities
                    </p>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {(typedCenter.amenities || []).map((a) => (
                        <div key={a} className="flex items-center gap-2.5 p-3 bg-surface-container-low rounded-xl ghost-border">
                          <Sparkles className="h-4 w-4 text-primary flex-shrink-0" />
                          <span className="text-xs text-foreground capitalize">{a.replace(/_/g, " ")}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Activities */}
                {(typedCenter.activities || []).length > 0 && (
                  <div className="mt-6">
                    <p className="text-xs uppercase tracking-wider text-muted-foreground mb-3">
                      Activities
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {(typedCenter.activities || []).map((a) => (
                        <span
                          key={a}
                          className="inline-flex items-center gap-1.5 text-xs bg-primary/10 text-primary rounded-full px-3 py-1.5"
                        >
                          <Activity className="h-3 w-3" />
                          {a.replace(/_/g, " ")}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Special Accommodations */}
                {(typedCenter.accommodations || []).length > 0 && (
                  <div className="mt-6">
                    <p className="text-xs uppercase tracking-wider text-muted-foreground mb-3">
                      Special Accommodations
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {(typedCenter.accommodations || []).map((a) => (
                        <span
                          key={a}
                          className="inline-flex items-center gap-1.5 text-xs bg-surface-container-high text-foreground rounded-full px-3 py-1.5"
                        >
                          <Accessibility className="h-3 w-3 text-primary" />
                          {a.replace(/_/g, " ")}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </section>
            )}

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

            {/* Review Summary */}
            {typedCenter.review_summary && (
              <section className="bg-surface-container-low rounded-2xl p-8 ghost-border">
                <div className="flex items-start gap-3">
                  <Quote className="h-6 w-6 text-primary flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">
                      Guest Reviews
                      {typedCenter.review_count > 0 && (
                        <span className="ml-2 normal-case">({typedCenter.review_count} reviews)</span>
                      )}
                    </p>
                    <p className="font-editorial italic text-base text-foreground leading-relaxed">
                      &ldquo;{typedCenter.review_summary}&rdquo;
                    </p>
                  </div>
                </div>
              </section>
            )}

            {/* Staff Profiles */}
            {staff.length > 0 && (
              <section>
                <h2 className="text-headline-lg font-semibold text-foreground flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" />
                  Clinical Team
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
                  {staff.map((member) => (
                    <div
                      key={member.id}
                      className="flex items-start gap-4 p-5 bg-surface-container-low rounded-2xl ghost-border"
                    >
                      {member.photo_url ? (
                        <img
                          src={member.photo_url}
                          alt={member.name}
                          className="h-14 w-14 rounded-full object-cover flex-shrink-0"
                        />
                      ) : (
                        <div className="h-14 w-14 rounded-full bg-surface-container-high flex items-center justify-center flex-shrink-0">
                          <span className="text-lg font-semibold text-muted-foreground">
                            {member.name.charAt(0)}
                          </span>
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-foreground">{member.name}</p>
                        <p className="text-xs text-primary">{member.position}</p>
                        {member.credentials && (
                          <p className="text-[10px] text-muted-foreground mt-0.5">{member.credentials}</p>
                        )}
                        {member.bio && (
                          <p className="text-xs text-muted-foreground mt-2 line-clamp-3 leading-relaxed">{member.bio}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

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
              {/* Hospital Affiliation */}
              {(() => {
                const ha = (typedCenter as unknown as Record<string, unknown>).hospital_affiliation as string | null;
                if (!ha || ha === "none") return null;
                return (
                  <div className="pt-4">
                    <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Hospital</p>
                    <span className={`inline-flex items-center gap-1.5 text-xs font-medium rounded-full px-3 py-1.5 ${
                      ha === "on_site" ? "bg-emerald-50 text-emerald-700" : "bg-blue-50 text-blue-700"
                    }`}>
                      {ha === "on_site" ? "Hospital On-Site" : "Partnered Hospital"}
                    </span>
                  </div>
                );
              })()}

              {/* Accreditations */}
              {(typedCenter.accreditation || []).length > 0 && (
                <div className="pt-4">
                  <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">
                    Accreditations
                  </p>
                  <div className="space-y-2">
                    {(typedCenter.accreditation || []).map((acc) => (
                      <div key={acc} className="flex items-center gap-2 text-sm text-foreground">
                        <ShieldCheck className="h-4 w-4 text-primary flex-shrink-0" />
                        <span className="text-xs">{acc}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Languages */}
              {(typedCenter.languages || []).length > 0 && (
                <div className="pt-4">
                  <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">
                    Languages Spoken
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {(typedCenter.languages || []).map((lang) => (
                      <Badge key={lang} variant="secondary" className="text-[10px] rounded-full bg-surface-container-high">
                        <Languages className="h-3 w-3 mr-1" />
                        {lang}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

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

import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MapPin, Star, ArrowRight, Search, AlertCircle, Brain, DollarSign, Building } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Your Matches",
  description: "View your personalized rehab center recommendations.",
};

interface PageProps {
  searchParams: Promise<{ id?: string }>;
}

export default async function ResultsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  if (!params.id) notFound();

  const supabase = await createClient();

  const { data: assessment } = await supabase
    .from("assessments")
    .select("*")
    .eq("id", params.id)
    .single();

  if (!assessment) notFound();

  const matchedIds = assessment.matched_center_ids || [];
  const explanations = (assessment.explanations || []) as Array<{
    center_id: string;
    explanation: string;
    fit_summary: string;
  }>;
  const matchScores = (assessment.match_scores || {}) as Record<string, number>;

  const { data: centers } = await supabase
    .from("centers")
    .select("id, name, slug, city, country, treatment_focus, services, rating, pricing_text, short_description, verified_profile, trusted_partner, editorial_overall, photos:center_photos(url, alt_text)")
    .in("id", matchedIds);

  const altIds = Object.keys(matchScores).filter(
    (id) => !matchedIds.includes(id)
  );
  const { data: altCenters } = altIds.length > 0
    ? await supabase
        .from("centers")
        .select("id, name, slug, city, country, rating, short_description")
        .in("id", altIds.slice(0, 5))
    : { data: [] };

  const isUrgent = assessment.urgency_level === "urgent";

  return (
    <div className="bg-surface min-h-screen">
      <div className="container mx-auto px-4 sm:px-6 py-8 md:py-12 max-w-4xl">
        {/* Header */}
        <div className="mb-8 md:mb-10">
          <h1 className="text-headline-lg md:text-display-md font-semibold text-foreground">
            We&apos;ve found the right path for you.
          </h1>
          <p className="mt-3 text-sm text-muted-foreground max-w-lg leading-relaxed">
            Based on your assessment responses, we&apos;ve carefully matched your preferences, clinical needs, and personal criteria to our curated network of treatment centers.
          </p>
        </div>

        {/* Urgency Warning */}
        {isUrgent && (
          <div className="bg-destructive/5 rounded-xl p-4 mb-8 flex gap-3">
            <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-foreground">
                You indicated this is urgent. Our team prioritizes urgent inquiries.
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Please submit an inquiry below for the fastest response.
              </p>
            </div>
          </div>
        )}

        {/* Empty state — no matching centers found */}
        {(!centers || centers.length === 0) && (
          <div className="bg-surface-container-lowest rounded-2xl p-10 shadow-ambient text-center mb-12">
            <Search className="h-10 w-10 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-headline-sm font-semibold text-foreground">No matching centers found</h2>
            <p className="text-sm text-muted-foreground mt-3 max-w-md mx-auto leading-relaxed">
              We couldn&apos;t find matching centers right now. Our database is growing — please try again soon or contact a specialist who can help you directly.
            </p>
            <div className="mt-6">
              <Button className="rounded-full gradient-primary text-white hover:opacity-90" asChild>
                <Link href="/inquiry">Contact a Specialist</Link>
              </Button>
            </div>
          </div>
        )}

        {/* Section label */}
        {centers && centers.length > 0 && (
          <p className="text-xs uppercase tracking-wider text-muted-foreground mb-6">
            Our Primary Recommendations
          </p>
        )}

        {/* Primary Matches */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          {(centers || []).map((center, index) => {
            const explanation = explanations.find((e) => e.center_id === center.id);
            const score = matchScores[center.id];

            return (
              <div key={center.id} className="bg-surface-container-lowest rounded-2xl overflow-hidden shadow-ambient group">
                {/* Image */}
                <div className="aspect-[4/3] bg-surface-container relative">
                  {(center as Record<string, unknown>).photos && ((center as Record<string, unknown>).photos as Array<{url: string; alt_text: string | null}>)[0] && (
                    <img
                      src={((center as Record<string, unknown>).photos as Array<{url: string}>)[0].url}
                      alt={center.name}
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                  )}
                  <div className="absolute top-3 left-3">
                    <span className="inline-flex items-center gap-1 bg-primary/90 text-white text-[10px] font-medium rounded-full px-2.5 py-1">
                      Match #{index + 1}
                      {score && <span className="opacity-70">&middot; {score}%</span>}
                    </span>
                  </div>
                  {center.rating && (
                    <div className="absolute top-3 right-3">
                      <span className="inline-flex items-center gap-1 bg-white/90 backdrop-blur-sm text-xs font-medium text-foreground rounded-full px-2.5 py-1">
                        <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                        {Number(center.rating).toFixed(1)}
                      </span>
                    </div>
                  )}
                </div>

                <div className="p-5">
                  <Link href={`/centers/${center.slug}`}>
                    <h3 className="font-editorial text-lg font-semibold text-foreground group-hover:text-primary transition-colors duration-300">
                      {center.name}
                    </h3>
                  </Link>
                  <p className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                    <MapPin className="h-3 w-3" />
                    {[center.city, center.country].filter(Boolean).join(", ")}
                  </p>

                  {/* Explanation */}
                  {explanation && (
                    <div className="mt-3 bg-primary/5 rounded-xl p-3">
                      <p className="text-xs font-medium text-primary">{explanation.fit_summary}</p>
                      <p className="text-[10px] text-muted-foreground mt-1 line-clamp-3">
                        {explanation.explanation}
                      </p>
                    </div>
                  )}

                  {/* Tags */}
                  <div className="flex flex-wrap gap-1 mt-3">
                    {(center.treatment_focus as string[])?.slice(0, 2).map((t: string) => (
                      <span key={t} className="text-[10px] uppercase tracking-wider bg-surface-container-high text-muted-foreground rounded-full px-2 py-0.5">
                        {t.replace(/_/g, " ")}
                      </span>
                    ))}
                  </div>

                  {/* CTAs */}
                  <div className="flex gap-2 mt-4">
                    <Button className="flex-1 rounded-full text-xs gradient-primary text-white hover:opacity-90 transition-opacity duration-300" size="sm" asChild>
                      <Link href={`/inquiry?center=${center.id}`}>
                        Inquire
                        <ArrowRight className="ml-1 h-3 w-3" />
                      </Link>
                    </Button>
                    <Button variant="outline" size="sm" className="rounded-full ghost-border border-0 text-xs" asChild>
                      <Link href={`/centers/${center.slug}`}>Profile</Link>
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Alternatives */}
        {altCenters && altCenters.length > 0 && (
          <>
            <p className="text-xs uppercase tracking-wider text-muted-foreground mb-4">
              Other centers that meet your criteria
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-12">
              {altCenters.map((center) => (
                <Link
                  key={center.id}
                  href={`/centers/${center.slug}`}
                  className="flex items-center gap-4 bg-surface-container-lowest rounded-xl p-4 ghost-border hover:shadow-ambient transition-all duration-300"
                >
                  <div className="w-12 h-12 rounded-xl bg-surface-container flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{center.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {[center.city, center.country].filter(Boolean).join(", ")}
                    </p>
                  </div>
                  {center.rating && (
                    <span className="text-xs text-muted-foreground">
                      {Number(center.rating).toFixed(1)}
                    </span>
                  )}
                </Link>
              ))}
            </div>
          </>
        )}

        {/* Methodology */}
        <div className="bg-surface-container-low rounded-2xl p-8 ghost-border mb-12">
          <h3 className="text-sm font-semibold text-foreground mb-4">
            Our methodology: How we selected these matches
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { icon: Brain, title: "Clinical Alignment", desc: "Matching your conditions and treatment needs to center specializations." },
              { icon: Building, title: "Resource Availability", desc: "Evaluating capacity, setting preferences, and detox availability." },
              { icon: DollarSign, title: "Budget Fit", desc: "Filtering by your budget range and insurance coverage." },
            ].map((item) => (
              <div key={item.title} className="flex gap-3">
                <item.icon className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-medium text-foreground">{item.title}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom CTA */}
        <div className="gradient-primary rounded-2xl p-8 text-center text-white">
          <h3 className="text-headline-md font-semibold">
            Need guidance on these choices?
          </h3>
          <p className="text-sm text-white/70 mt-2 max-w-md mx-auto">
            Our specialists can provide additional insight and help you make the right decision.
          </p>
          <div className="flex gap-3 justify-center mt-6">
            <Button className="rounded-full bg-white text-primary hover:bg-white/90" asChild>
              <Link href="/inquiry">Talk to a specialist</Link>
            </Button>
            <Button variant="outline" className="rounded-full border-white/30 text-white hover:bg-white/10" asChild>
              <Link href="/centers">
                <Search className="mr-2 h-3.5 w-3.5" />
                Browse all centers
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

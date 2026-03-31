import Link from "next/link";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { countryToSlug } from "@/lib/utils";
import { BreadcrumbJsonLd } from "@/components/shared/json-ld";
import { Button } from "@/components/ui/button";
import { Globe, Building2, ArrowRight, MapPin } from "lucide-react";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Rehab Destinations Worldwide | Rehab-Atlas",
  description:
    "Explore world-class rehabilitation centers across top recovery destinations. From Thailand to Canada, find the ideal location for your healing journey.",
  openGraph: {
    title: "Rehab Destinations Worldwide | Rehab-Atlas",
    description:
      "Explore world-class rehabilitation centers across top recovery destinations.",
    url: "https://rehab-atlas.vercel.app/rehab-in",
    type: "website",
  },
  alternates: {
    canonical: "https://rehab-atlas.vercel.app/rehab-in",
  },
};

interface CountryWithCount {
  name: string;
  slug: string;
  count: number;
}

export default async function RehabDestinationsPage() {
  const supabase = await createClient();

  // Get all published centers' countries
  const { data: centerData } = await supabase
    .from("centers")
    .select("country")
    .eq("status", "published");

  // Build unique countries with counts
  const countsByName: Record<string, number> = {};
  if (centerData) {
    for (const c of centerData) {
      if (c.country) {
        countsByName[c.country] = (countsByName[c.country] || 0) + 1;
      }
    }
  }

  const countries: CountryWithCount[] = Object.entries(countsByName)
    .map(([name, count]) => ({
      name,
      slug: countryToSlug(name),
      count,
    }))
    .sort((a, b) => b.count - a.count);

  const BASE_URL =
    process.env.NEXT_PUBLIC_APP_URL || "https://rehab-atlas.vercel.app";

  return (
    <div className="bg-surface min-h-screen">
      <BreadcrumbJsonLd
        items={[
          { name: "Home", url: BASE_URL },
          { name: "Rehab Destinations", url: `${BASE_URL}/rehab-in` },
        ]}
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
            <span className="text-white/80">Destinations</span>
          </nav>

          <div className="max-w-3xl">
            <div className="flex items-center gap-2 text-white/60 text-sm mb-4">
              <Globe className="h-4 w-4" />
              <span>Global Recovery Network</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-serif font-semibold text-white leading-tight">
              Rehab Destinations Worldwide
            </h1>
            <p className="mt-4 text-base text-white/70 leading-relaxed max-w-2xl">
              Recovery looks different for everyone. Explore our curated
              selection of international rehabilitation destinations, each
              offering unique therapeutic approaches, cultural experiences, and
              healing environments.
            </p>
          </div>
        </div>
      </section>

      {/* Countries Grid */}
      <section className="container mx-auto px-4 sm:px-6 py-12 md:py-16">
        {countries.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {countries.map((country) => (
              <Link
                key={country.slug}
                href={`/rehab-in/${country.slug}`}
                className="group rounded-2xl bg-surface-container-lowest overflow-hidden shadow-ambient hover:shadow-ambient-lg transition-all duration-300"
              >
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-primary" />
                      <h2 className="font-editorial text-lg font-semibold text-foreground group-hover:text-primary transition-colors duration-300">
                        {country.name}
                      </h2>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all duration-300" />
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Building2 className="h-3.5 w-3.5" />
                    <span>
                      {country.count}{" "}
                      {country.count === 1 ? "center" : "centers"}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center py-16 rounded-2xl bg-surface-container-lowest shadow-ambient">
            <Globe className="h-10 w-10 text-muted-foreground mx-auto mb-4" />
            <p className="text-lg font-serif text-foreground">
              No destinations available yet
            </p>
            <p className="text-sm text-muted-foreground mt-2 max-w-md mx-auto">
              We are actively adding verified rehab centers worldwide. Check
              back soon or contact us for recommendations.
            </p>
          </div>
        )}
      </section>

      {/* CTA */}
      <section className="container mx-auto px-4 sm:px-6 py-12 md:py-20">
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#45636b] to-[#2d4a52] p-8 md:p-14 text-center">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,rgba(255,255,255,0.06),transparent_50%)]" />
          <div className="relative max-w-xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-serif font-semibold text-white">
              Find Your Ideal Destination
            </h2>
            <p className="mt-3 text-sm text-white/70 leading-relaxed">
              Answer a few confidential questions and we will match you with
              rehab centers best suited to your needs, budget, and preferred
              location.
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
                <Link href="/centers">Browse All Centers</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

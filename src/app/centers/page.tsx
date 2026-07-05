import { Suspense } from "react";
import { unstable_cache } from "next/cache";
import { createPublicClient } from "@/lib/supabase/server";
import { CenterCard } from "@/components/centers/center-card";
import { CenterFilters } from "@/components/centers/center-filters";
import { MobileFilters } from "@/components/centers/mobile-filters";
import { CenterSort } from "@/components/centers/center-sort";
import { Pagination } from "@/components/shared/pagination";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import Image from "next/image";
import type { Center } from "@/types/center";
import type { Metadata } from "next";


export const revalidate = 60;

export const metadata: Metadata = {
  title: "Browse Rehab Centers",
  description:
    "Curated healing environments tailored to your recovery journey. Each facility is vetted for excellence and compassionate care.",
};

const PAGE_SIZE = 12;

// Facet options only change when centers are added/edited — cache for 5 min
// instead of re-scanning the whole published table on every request.
const getFilterOptions = unstable_cache(
  async () => {
    const supabase = createPublicClient();
    const { data: filterData } = await supabase
      .from("centers")
      .select(
        "country, treatment_focus, conditions, setting_type, insurance, who_we_treat, treatment_methods, languages, amenities"
      )
      .eq("status", "published");

    const allCentersForFilters = filterData || [];

    const toOption = (v: string) => ({
      value: v,
      label: v.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
    });

    function extractUniqueValues(field: string): { value: string; label: string }[] {
      const values = new Set<string>();
      for (const center of allCentersForFilters) {
        const arr = (center as Record<string, unknown>)[field];
        if (Array.isArray(arr)) {
          for (const v of arr) {
            if (typeof v === "string" && v) values.add(v);
          }
        }
      }
      return [...values].sort().map(toOption);
    }

    function extractUniqueScalarValues(field: string): { value: string; label: string }[] {
      const values = new Set<string>();
      for (const center of allCentersForFilters) {
        const val = (center as Record<string, unknown>)[field];
        if (typeof val === "string" && val) values.add(val);
      }
      return [...values].sort().map(toOption);
    }

    return {
      countries: [
        ...new Set(allCentersForFilters.map((c) => c.country).filter(Boolean)),
      ].sort() as string[],
      treatmentFocusOptions: extractUniqueValues("treatment_focus"),
      conditionOptions: extractUniqueValues("conditions"),
      settingTypeOptions: extractUniqueScalarValues("setting_type"),
      insuranceOptions: extractUniqueValues("insurance"),
      whoWeTreatOptions: extractUniqueValues("who_we_treat"),
      treatmentMethodOptions: extractUniqueValues("treatment_methods"),
      languageOptions: extractUniqueValues("languages"),
      amenityOptions: extractUniqueValues("amenities"),
    };
  },
  ["centers-filter-options"],
  { revalidate: 300 }
);

interface PageProps {
  searchParams: Promise<Record<string, string | undefined>>;
}

export default async function CentersPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const supabase = createPublicClient();
  const currentPage = Number(params.page) || 1;
  const offset = (currentPage - 1) * PAGE_SIZE;

  // Build query
  let query = supabase
    .from("centers")
    .select("*, photos:center_photos(id, url, alt_text, sort_order, is_primary)", { count: "exact" })
    .eq("status", "published");

  // Apply filters
  if (params.search) {
    query = query.ilike("name", `%${params.search}%`);
  }
  if (params.country) {
    query = query.eq("country", params.country);
  }
  if (params.treatment_focus) {
    query = query.contains("treatment_focus", [params.treatment_focus]);
  }
  if (params.condition) {
    query = query.contains("conditions", [params.condition]);
  }
  if (params.setting_type) {
    query = query.eq("setting_type", params.setting_type);
  }
  if (params.insurance) {
    query = query.contains("insurance", [params.insurance]);
  }
  if (params.who_we_treat) {
    query = query.contains("who_we_treat", [params.who_we_treat]);
  }
  if (params.treatment_methods) {
    query = query.contains("treatment_methods", [params.treatment_methods]);
  }
  if (params.languages) {
    query = query.contains("languages", [params.languages]);
  }
  if (params.amenities) {
    query = query.contains("amenities", [params.amenities]);
  }
  if (params.approaches) {
    query = query.contains("approaches", [params.approaches]);
  }
  if (params.activities) {
    query = query.contains("activities", [params.activities]);
  }
  if (params.accommodations) {
    query = query.contains("accommodations", [params.accommodations]);
  }
  if (params.has_detox === "true") {
    query = query.eq("has_detox", true);
  }

  // Apply sorting
  switch (params.sort) {
    case "featured":
      query = query.order("is_featured", { ascending: false }).order("name");
      break;
    case "price_asc":
      query = query.order("price_min", { ascending: true, nullsFirst: false });
      break;
    case "price_desc":
      query = query.order("price_max", { ascending: false, nullsFirst: false });
      break;
    case "rating":
      query = query.order("editorial_overall", {
        ascending: false,
        nullsFirst: false,
      });
      break;
    default:
      query = query
        .order("is_featured", { ascending: false })
        .order("trusted_partner", { ascending: false })
        .order("editorial_overall", { ascending: false, nullsFirst: false });
  }

  // Paginate
  query = query.range(offset, offset + PAGE_SIZE - 1);
  const { data: centers, count } = await query;
  const totalPages = Math.ceil((count || 0) / PAGE_SIZE);

  // Distinct filter values — cached (5 min) rather than re-scanned per request
  const {
    countries,
    treatmentFocusOptions,
    conditionOptions,
    settingTypeOptions,
    insuranceOptions,
    whoWeTreatOptions,
    treatmentMethodOptions,
    languageOptions,
    amenityOptions,
  } = await getFilterOptions();

  return (
    <div className="bg-surface min-h-screen">
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0">
          <Image
            src="https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=1600&q=80&auto=format&fit=crop"
            alt="Peaceful rehabilitation center surrounded by nature"
            fill
            sizes="100vw"
            priority
            className="object-cover object-center"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#45636b]/85 to-[#45636b]/60" />
        </div>
        <div className="relative container mx-auto px-4 sm:px-6 py-12 md:py-16">
          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
            <div>
              <h1 className="text-3xl md:text-4xl font-serif font-semibold text-white leading-tight">
                Browse Rehab Centers
              </h1>
              <p className="mt-2 text-sm text-white/70 max-w-lg">
                Curated healing environments tailored to your recovery journey.
                Each facility is vetted for excellence and compassionate care.
              </p>
            </div>
            <div className="flex items-center gap-4">
              <Suspense fallback={null}>
                <CenterSort />
              </Suspense>
              <Button className="rounded-full bg-white text-foreground hover:bg-white/90 transition-opacity duration-300" asChild>
                <Link href="/assessment">Start Confidential Assessment</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <div className="container mx-auto px-4 sm:px-6 py-6 md:py-10">

        {/* Mobile: filters collapse into a drawer so results are visible immediately */}
        <div className="mb-6 lg:hidden">
          <Suspense fallback={null}>
            <MobileFilters
              countries={countries}
              treatmentFocusOptions={treatmentFocusOptions}
              conditionOptions={conditionOptions}
              settingTypeOptions={settingTypeOptions}
              insuranceOptions={insuranceOptions}
              whoWeTreatOptions={whoWeTreatOptions}
              treatmentMethodOptions={treatmentMethodOptions}
              languageOptions={languageOptions}
              amenityOptions={amenityOptions}
            />
          </Suspense>
        </div>

        <div className="flex flex-col lg:flex-row gap-10">
          {/* Filters Sidebar — desktop only; mobile uses the drawer above */}
          <aside className="hidden lg:block w-64 flex-shrink-0">
            <Suspense fallback={<Skeleton className="h-96 w-full rounded-2xl" />}>
              <CenterFilters
                countries={countries}
                treatmentFocusOptions={treatmentFocusOptions}
                conditionOptions={conditionOptions}
                settingTypeOptions={settingTypeOptions}
                insuranceOptions={insuranceOptions}
                whoWeTreatOptions={whoWeTreatOptions}
                treatmentMethodOptions={treatmentMethodOptions}
                languageOptions={languageOptions}
                amenityOptions={amenityOptions}
              />
            </Suspense>
          </aside>

          {/* Results */}
          <div className="flex-1">
            {/* Results count — only show when results exist; never lead with a bare zero */}
            <div className="flex items-center justify-between mb-6">
              {count !== null && count > 0 ? (
                <p className="text-sm text-muted-foreground">
                  <span className="font-medium text-foreground">{count}</span>{" "}
                  {count === 1 ? "center" : "centers"} in our network
                </p>
              ) : <span />}
              {count !== null && count > 0 && (
                <p className="text-xs text-muted-foreground">
                  Page {currentPage} of {totalPages || 1}
                </p>
              )}
            </div>

            {/* Grid */}
            {centers && centers.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {centers.map((center) => (
                  <CenterCard
                    key={center.id as string}
                    center={center as unknown as Center}
                  />
                ))}
              </div>
            ) : (
              <div className="bg-surface-container-lowest rounded-2xl p-10 md:p-14 text-center shadow-ambient">
                <h3 className="text-headline-md font-semibold text-foreground">
                  We&apos;ll match you to centers that actually fit
                </h3>
                <p className="text-sm text-muted-foreground mt-3 max-w-md mx-auto leading-relaxed">
                  No two recoveries are the same — and a directory alone can&apos;t tell you which centers
                  match your situation, budget, and care level. The confidential assessment will surface
                  the right shortlist for you.
                </p>
                <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
                  <Button className="rounded-full px-7 gradient-primary text-white hover:opacity-90 transition-opacity duration-300" asChild>
                    <Link href="/assessment">Start Confidential Assessment</Link>
                  </Button>
                  <Button variant="outline" className="rounded-full px-7 ghost-border border-0" asChild>
                    <Link href="/centers">Clear filters</Link>
                  </Button>
                </div>
                <p className="mt-4 text-xs text-muted-foreground">
                  Private &middot; takes 3–5 minutes &middot; no center contact without your consent
                </p>
              </div>
            )}

            {/* Pagination */}
            <div className="mt-10">
              <Suspense fallback={null}>
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  basePath="/centers"
                />
              </Suspense>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

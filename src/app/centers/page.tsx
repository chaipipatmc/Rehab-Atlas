import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { CenterCard } from "@/components/centers/center-card";
import { CenterFilters } from "@/components/centers/center-filters";
import { CenterSort } from "@/components/centers/center-sort";
import { Pagination } from "@/components/shared/pagination";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import type { Center } from "@/types/center";
import type { Metadata } from "next";


export const revalidate = 60;

export const metadata: Metadata = {
  title: "Browse Rehab Centers",
  description:
    "Curated healing environments tailored to your recovery journey. Each facility is vetted for excellence and compassionate care.",
};

const PAGE_SIZE = 12;

interface PageProps {
  searchParams: Promise<Record<string, string | undefined>>;
}

export default async function CentersPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const supabase = await createClient();
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

  // Get distinct filter values from published centers
  const { data: filterData } = await supabase
    .from("centers")
    .select("country, treatment_focus, conditions, setting_type, insurance, who_we_treat, treatment_methods, languages, amenities")
    .eq("status", "published");

  const allCentersForFilters = filterData || [];

  const countries = [
    ...new Set(allCentersForFilters.map((c) => c.country).filter(Boolean)),
  ].sort();

  // Helper to extract unique values from array columns
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
    return [...values].sort().map((v) => ({
      value: v,
      label: v.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
    }));
  }

  // Extract unique scalar values (like setting_type)
  function extractUniqueScalarValues(field: string): { value: string; label: string }[] {
    const values = new Set<string>();
    for (const center of allCentersForFilters) {
      const val = (center as Record<string, unknown>)[field];
      if (typeof val === "string" && val) values.add(val);
    }
    return [...values].sort().map((v) => ({
      value: v,
      label: v.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
    }));
  }

  const treatmentFocusOptions = extractUniqueValues("treatment_focus");
  const conditionOptions = extractUniqueValues("conditions");
  const settingTypeOptions = extractUniqueScalarValues("setting_type");
  const insuranceOptions = extractUniqueValues("insurance");
  const whoWeTreatOptions = extractUniqueValues("who_we_treat");
  const treatmentMethodOptions = extractUniqueValues("treatment_methods");
  const languageOptions = extractUniqueValues("languages");
  const amenityOptions = extractUniqueValues("amenities");

  return (
    <div className="bg-surface min-h-screen">
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0">
          <img
            src="https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=1600&q=80&auto=format&fit=crop"
            alt="Peaceful rehabilitation center surrounded by nature"
            className="w-full h-full object-cover object-center"
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
                <Link href="/assessment">Start Assessment</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <div className="container mx-auto px-4 sm:px-6 py-6 md:py-10">

        <div className="flex flex-col lg:flex-row gap-10">
          {/* Filters Sidebar */}
          <aside className="w-full lg:w-64 flex-shrink-0">
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
            {/* Results count */}
            <div className="flex items-center justify-between mb-6">
              {count !== null && (
                <p className="text-sm text-muted-foreground">
                  Found <span className="font-medium text-foreground">{count} Centers</span>
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                Page {currentPage} of {totalPages || 1}
              </p>
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
              <div className="text-center py-20">
                <p className="text-headline-md text-foreground">
                  No centers found
                </p>
                <p className="text-sm text-muted-foreground mt-3">
                  Try adjusting your filters or browse all centers.
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

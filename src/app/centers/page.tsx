import { Suspense } from "react";
import { headers } from "next/headers";
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

// Country coordinates for distance calculation
const COUNTRY_COORDS: Record<string, [number, number]> = {
  "United States": [39.8, -98.5], "United Kingdom": [54.0, -2.0], "Canada": [56.1, -106.3],
  "Australia": [-25.3, 133.8], "Thailand": [15.9, 100.9], "India": [20.6, 78.9],
  "Germany": [51.2, 10.4], "France": [46.2, 2.2], "Spain": [40.5, -3.7],
  "Italy": [41.9, 12.5], "Switzerland": [46.8, 8.2], "Netherlands": [52.1, 5.3],
  "Mexico": [23.6, -102.6], "Brazil": [-14.2, -51.9], "Japan": [36.2, 138.3],
  "South Korea": [35.9, 128.0], "China": [35.9, 104.2], "Indonesia": [-0.8, 113.9],
  "Philippines": [12.9, 121.8], "Malaysia": [4.2, 101.9], "Singapore": [1.4, 103.8],
  "South Africa": [-30.6, 22.9], "UAE": [23.4, 53.8], "Portugal": [39.4, -8.2],
  "Sweden": [60.1, 18.6], "Norway": [60.5, 8.5], "Denmark": [56.3, 9.5],
  "Austria": [47.5, 14.6], "Ireland": [53.1, -7.7], "New Zealand": [-40.9, 174.9],
  "Costa Rica": [9.7, -83.8], "Colombia": [4.6, -74.3], "Argentina": [-38.4, -63.6],
  "Peru": [-9.2, -75.0], "Chile": [-35.7, -71.5], "Turkey": [38.9, 35.2],
  "Israel": [31.0, 34.9], "Egypt": [26.8, 30.8], "Kenya": [-0.0, 37.9],
  "Nigeria": [9.1, 8.7], "Greece": [39.1, 21.8], "Poland": [51.9, 19.1],
  "Czech Republic": [49.8, 15.5], "Hungary": [47.2, 19.5], "Romania": [45.9, 25.0],
  "Vietnam": [14.1, 108.3], "Cambodia": [12.6, 104.9], "Taiwan": [23.7, 120.9],
};

// Map Vercel country codes to full names
const COUNTRY_CODE_MAP: Record<string, string> = {
  US: "United States", GB: "United Kingdom", CA: "Canada", AU: "Australia",
  TH: "Thailand", IN: "India", DE: "Germany", FR: "France", ES: "Spain",
  IT: "Italy", CH: "Switzerland", NL: "Netherlands", MX: "Mexico", BR: "Brazil",
  JP: "Japan", KR: "South Korea", CN: "China", ID: "Indonesia", PH: "Philippines",
  MY: "Malaysia", SG: "Singapore", ZA: "South Africa", AE: "UAE", PT: "Portugal",
  SE: "Sweden", NO: "Norway", DK: "Denmark", AT: "Austria", IE: "Ireland",
  NZ: "New Zealand", CR: "Costa Rica", CO: "Colombia", AR: "Argentina",
  PE: "Peru", CL: "Chile", TR: "Turkey", IL: "Israel", EG: "Egypt",
  KE: "Kenya", NG: "Nigeria", GR: "Greece", PL: "Poland", CZ: "Czech Republic",
  HU: "Hungary", RO: "Romania", VN: "Vietnam", KH: "Cambodia", TW: "Taiwan",
};

function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

async function getUserCountry(): Promise<string | null> {
  try {
    const h = await headers();
    // Vercel provides this header
    const countryCode = h.get("x-vercel-ip-country");
    if (countryCode && COUNTRY_CODE_MAP[countryCode]) {
      return COUNTRY_CODE_MAP[countryCode];
    }
    // Fallback for localhost: try free IP API
    const forwarded = h.get("x-forwarded-for");
    const ip = forwarded?.split(",")[0]?.trim();
    if (ip && ip !== "127.0.0.1" && ip !== "::1") {
      const res = await fetch(`http://ip-api.com/json/${ip}?fields=country`, { next: { revalidate: 3600 } });
      if (res.ok) {
        const data = await res.json();
        return data.country || null;
      }
    }
  } catch {}
  return null;
}

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

  // Detect user's country for geo-sorting
  const userCountry = await getUserCountry();

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
  if (params.setting_type) {
    query = query.eq("setting_type", params.setting_type);
  }
  if (params.insurance) {
    query = query.contains("insurance", [params.insurance]);
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

  // For geo-sorting: if no explicit sort/country filter and we know user's country,
  // fetch all results first, sort by distance, then paginate manually
  const isDefaultView = !params.sort && !params.country && !params.search && !params.treatment_focus && !params.setting_type && !params.insurance && !params.has_detox;
  const useGeoSort = isDefaultView && userCountry && COUNTRY_COORDS[userCountry];

  let centers: Record<string, unknown>[] | null = null;
  let count: number | null = null;

  if (useGeoSort) {
    // Fetch all published centers for geo-sorting
    const { data: allCenters, count: totalCount } = await supabase
      .from("centers")
      .select("*, photos:center_photos(id, url, alt_text, sort_order, is_primary)", { count: "exact" })
      .eq("status", "published");

    count = totalCount;
    const userCoords = COUNTRY_COORDS[userCountry!]!;

    // Sort: same country first, then by distance
    const sorted = (allCenters || []).sort((a, b) => {
      const aIsLocal = a.country === userCountry ? 0 : 1;
      const bIsLocal = b.country === userCountry ? 0 : 1;
      if (aIsLocal !== bIsLocal) return aIsLocal - bIsLocal;

      // Both in same group — sort by distance
      const aCoordsEntry = COUNTRY_COORDS[a.country || ""];
      const bCoordsEntry = COUNTRY_COORDS[b.country || ""];
      const aDist = aCoordsEntry ? haversineDistance(userCoords[0], userCoords[1], aCoordsEntry[0], aCoordsEntry[1]) : 99999;
      const bDist = bCoordsEntry ? haversineDistance(userCoords[0], userCoords[1], bCoordsEntry[0], bCoordsEntry[1]) : 99999;

      // Within same distance tier, prefer featured
      if (Math.abs(aDist - bDist) < 500) {
        if (a.is_featured !== b.is_featured) return a.is_featured ? -1 : 1;
      }
      return aDist - bDist;
    });

    centers = sorted.slice(offset, offset + PAGE_SIZE);
  } else {
    // Paginate
    query = query.range(offset, offset + PAGE_SIZE - 1);
    const result = await query;
    centers = result.data;
    count = result.count;
  }
  const totalPages = Math.ceil((count || 0) / PAGE_SIZE);

  // Get distinct countries for filter
  const { data: countryData } = await supabase
    .from("centers")
    .select("country")
    .eq("status", "published")
    .order("country");

  const countries = [
    ...new Set((countryData || []).map((c) => c.country).filter(Boolean)),
  ];

  return (
    <div className="bg-surface min-h-screen">
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0">
          <img
            src="https://images.unsplash.com/photo-1551190822-a9ce113ac100?w=1600&q=80&auto=format&fit=crop"
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
              <CenterFilters countries={countries} />
            </Suspense>
          </aside>

          {/* Results */}
          <div className="flex-1">
            {/* Results count */}
            <div className="flex items-center justify-between mb-6">
              {count !== null && (
                <p className="text-sm text-muted-foreground">
                  Found <span className="font-medium text-foreground">{count} Centers</span>
                  {useGeoSort && userCountry && (
                    <span className="ml-2 text-xs text-primary">
                      — showing nearest to {userCountry}
                    </span>
                  )}
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

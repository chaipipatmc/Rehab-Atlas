import type { MetadataRoute } from "next";
import { createAdminClient } from "@/lib/supabase/admin";
import { countryToSlug, cityToSlug } from "@/lib/utils";
import { CONDITIONS, CONDITION_SLUGS } from "@/lib/conditions";
import { BASE_URL } from "@/lib/site";

// Shared condition definitions — same source the pages use, so we only emit
// URLs that will actually render with ≥1 center.
const CITY_CONDITION_DEFS: { slug: string; filters: string[] }[] =
  Object.values(CONDITIONS).map((c) => ({ slug: c.slug, filters: c.filters }));

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Static pages
  const staticPages: MetadataRoute.Sitemap = [
    { url: `${BASE_URL}/`, lastModified: new Date(), changeFrequency: "weekly", priority: 1.0 },
    { url: `${BASE_URL}/centers`, lastModified: new Date(), changeFrequency: "daily", priority: 0.9 },
    { url: `${BASE_URL}/blog`, lastModified: new Date(), changeFrequency: "daily", priority: 0.8 },
    { url: `${BASE_URL}/about`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.7 },
    { url: `${BASE_URL}/contact`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.7 },
    { url: `${BASE_URL}/assessment`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.8 },
    { url: `${BASE_URL}/inquiry`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.7 },
    { url: `${BASE_URL}/partner/join`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.6 },
  ];

  // Rehab condition pages — from the shared module
  const conditionSlugs = CONDITION_SLUGS;

  const rehabPages: MetadataRoute.Sitemap = [
    {
      url: `${BASE_URL}/rehab`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.8,
    },
    ...conditionSlugs.map((slug) => ({
      url: `${BASE_URL}/rehab/${slug}`,
      lastModified: new Date(),
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
  ];

  // Country landing pages — dynamic from published centers
  let countryPages: MetadataRoute.Sitemap = [
    {
      url: `${BASE_URL}/rehab-in`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.8,
    },
  ];

  try {
    const supabaseCountry = createAdminClient();
    const { data: countryRows } = await supabaseCountry
      .from("centers")
      .select("country")
      .eq("status", "published");

    if (countryRows) {
      const uniqueCountries = [
        ...new Set(countryRows.map((c) => c.country).filter(Boolean)),
      ] as string[];
      countryPages = [
        ...countryPages,
        ...uniqueCountries.map((name) => ({
          url: `${BASE_URL}/rehab-in/${countryToSlug(name)}`,
          lastModified: new Date(),
          changeFrequency: "weekly" as const,
          priority: 0.8,
        })),
      ];
    }
  } catch {
    // Supabase not configured — skip dynamic country pages
  }

  // CMS pages
  const cmsPages: MetadataRoute.Sitemap = [
    { url: `${BASE_URL}/pages/privacy-policy`, lastModified: new Date(), changeFrequency: "yearly", priority: 0.4 },
    { url: `${BASE_URL}/pages/terms-of-use`, lastModified: new Date(), changeFrequency: "yearly", priority: 0.4 },
    { url: `${BASE_URL}/pages/disclaimer`, lastModified: new Date(), changeFrequency: "yearly", priority: 0.4 },
    { url: `${BASE_URL}/pages/hipaa`, lastModified: new Date(), changeFrequency: "yearly", priority: 0.4 },
  ];

  let centerPages: MetadataRoute.Sitemap = [];
  let blogPages: MetadataRoute.Sitemap = [];
  let comparePages: MetadataRoute.Sitemap = [];
  let cityPages: MetadataRoute.Sitemap = [];
  let cityConditionPages: MetadataRoute.Sitemap = [];

  try {
    const supabase = createAdminClient();

    // Fetch all published center slugs + city + treatment_focus for programmatic pages
    const { data: centers } = await supabase
      .from("centers")
      .select("slug, country, city, treatment_focus, is_featured, editorial_overall, rating, updated_at")
      .eq("status", "published");

    if (centers) {
      centerPages = centers.map((center) => ({
        url: `${BASE_URL}/centers/${center.slug}`,
        lastModified: center.updated_at ? new Date(center.updated_at) : new Date(),
        changeFrequency: "weekly" as const,
        priority: 0.8,
      }));

      // Generate top comparison pairs (same-country pairs of top centers)
      // Mirrors the logic in /compare/[slug]/generateStaticParams so SEO crawlers
      // discover the pre-rendered comparison URLs.
      type Row = { slug: string; country: string | null; is_featured: boolean; editorial_overall: number | null; rating: number | null };
      const ranked = (centers as Row[])
        .slice()
        .sort((a, b) => {
          if (a.is_featured !== b.is_featured) return a.is_featured ? -1 : 1;
          const ae = a.editorial_overall ?? -1;
          const be = b.editorial_overall ?? -1;
          if (ae !== be) return be - ae;
          const ar = a.rating ?? -1;
          const br = b.rating ?? -1;
          return br - ar;
        })
        .slice(0, 40);

      const byCountry = new Map<string, string[]>();
      for (const c of ranked) {
        const key = c.country || "_other";
        if (!byCountry.has(key)) byCountry.set(key, []);
        byCountry.get(key)!.push(c.slug);
      }

      const seen = new Set<string>();
      const pairs: string[] = [];
      for (const slugs of byCountry.values()) {
        for (let i = 0; i < slugs.length && pairs.length < 80; i++) {
          for (let j = i + 1; j < slugs.length && pairs.length < 80; j++) {
            const key = [slugs[i], slugs[j]].sort().join("-vs-");
            if (seen.has(key)) continue;
            seen.add(key);
            pairs.push(key);
          }
        }
      }
      const topSlugs = ranked.slice(0, 12).map((c) => c.slug);
      for (let i = 0; i < topSlugs.length && pairs.length < 100; i++) {
        for (let j = i + 1; j < topSlugs.length && pairs.length < 100; j++) {
          const key = [topSlugs[i], topSlugs[j]].sort().join("-vs-");
          if (seen.has(key)) continue;
          seen.add(key);
          pairs.push(key);
        }
      }

      comparePages = pairs.map((slug) => ({
        url: `${BASE_URL}/compare/${slug}`,
        lastModified: new Date(),
        changeFrequency: "monthly" as const,
        priority: 0.6,
      }));

      // City pages (/rehab-in/[country]/[city]) + city × condition combos.
      // Built from the same centers list so we only emit URLs that have ≥1 listing.
      type CityRow = { country: string | null; city: string | null; treatment_focus: string[] | null };
      const byLocation = new Map<string, { country: string; city: string; focus: Set<string> }>();
      for (const c of centers as CityRow[]) {
        if (!c.country || !c.city) continue;
        const key = `${countryToSlug(c.country)}/${cityToSlug(c.city)}`;
        if (!byLocation.has(key)) {
          byLocation.set(key, {
            country: countryToSlug(c.country),
            city: cityToSlug(c.city),
            focus: new Set<string>(),
          });
        }
        const entry = byLocation.get(key)!;
        for (const f of c.treatment_focus || []) entry.focus.add(f);
      }

      cityPages = [...byLocation.values()].map((loc) => ({
        url: `${BASE_URL}/rehab-in/${loc.country}/${loc.city}`,
        lastModified: new Date(),
        changeFrequency: "weekly" as const,
        priority: 0.7,
      }));

      for (const loc of byLocation.values()) {
        for (const cond of CITY_CONDITION_DEFS) {
          if (cond.filters.some((f) => loc.focus.has(f))) {
            cityConditionPages.push({
              url: `${BASE_URL}/rehab-in/${loc.country}/${loc.city}/${cond.slug}`,
              lastModified: new Date(),
              changeFrequency: "weekly" as const,
              priority: 0.65,
            });
          }
        }
      }
    }

    // Fetch all published blog post slugs
    const { data: posts } = await supabase
      .from("pages")
      .select("slug, published_at, updated_at")
      .eq("page_type", "blog")
      .eq("status", "published");

    if (posts) {
      blogPages = posts.map((post) => ({
        url: `${BASE_URL}/blog/${post.slug}`,
        lastModified: post.updated_at
          ? new Date(post.updated_at)
          : post.published_at
          ? new Date(post.published_at)
          : new Date(),
        changeFrequency: "monthly" as const,
        priority: 0.7,
      }));
    }
  } catch {
    // Supabase not configured — return static pages only
  }

  return [
    ...staticPages,
    ...rehabPages,
    ...countryPages,
    ...cityPages,
    ...cityConditionPages,
    ...cmsPages,
    ...centerPages,
    ...comparePages,
    ...blogPages,
  ];
}

import type { MetadataRoute } from "next";
import { createAdminClient } from "@/lib/supabase/admin";
import { countryToSlug } from "@/lib/utils";

const BASE_URL = (process.env.NEXT_PUBLIC_APP_URL || "https://rehab-atlas.com").trim();

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

  // Rehab condition pages
  const conditionSlugs = [
    "alcohol-addiction",
    "drug-addiction",
    "opioid-addiction",
    "dual-diagnosis",
    "mental-health",
    "gambling-addiction",
    "prescription-drug-abuse",
    "eating-disorders",
    "trauma-ptsd",
    "behavioral-addiction",
  ];

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

  try {
    const supabase = createAdminClient();

    // Fetch all published center slugs
    const { data: centers } = await supabase
      .from("centers")
      .select("slug, country, is_featured, editorial_overall, rating, updated_at")
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

  return [...staticPages, ...rehabPages, ...countryPages, ...cmsPages, ...centerPages, ...comparePages, ...blogPages];
}

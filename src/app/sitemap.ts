import type { MetadataRoute } from "next";
import { createClient } from "@/lib/supabase/server";

const BASE_URL =
  process.env.NEXT_PUBLIC_APP_URL || "https://rehab-atlas.vercel.app";

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

  // Country landing pages
  const countrySlugs = [
    "thailand",
    "canada",
    "india",
    "bali",
    "malaysia",
    "australia",
    "south-africa",
    "japan",
  ];
  const countryPages: MetadataRoute.Sitemap = [
    {
      url: `${BASE_URL}/rehab-in`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.8,
    },
    ...countrySlugs.map((slug) => ({
      url: `${BASE_URL}/rehab-in/${slug}`,
      lastModified: new Date(),
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
  ];

  // CMS pages
  const cmsPages: MetadataRoute.Sitemap = [
    { url: `${BASE_URL}/pages/privacy-policy`, lastModified: new Date(), changeFrequency: "yearly", priority: 0.4 },
    { url: `${BASE_URL}/pages/terms-of-use`, lastModified: new Date(), changeFrequency: "yearly", priority: 0.4 },
    { url: `${BASE_URL}/pages/disclaimer`, lastModified: new Date(), changeFrequency: "yearly", priority: 0.4 },
    { url: `${BASE_URL}/pages/hipaa`, lastModified: new Date(), changeFrequency: "yearly", priority: 0.4 },
  ];

  let centerPages: MetadataRoute.Sitemap = [];
  let blogPages: MetadataRoute.Sitemap = [];

  try {
    const supabase = await createClient();

    // Fetch all published center slugs
    const { data: centers } = await supabase
      .from("centers")
      .select("slug, updated_at")
      .eq("status", "published");

    if (centers) {
      centerPages = centers.map((center) => ({
        url: `${BASE_URL}/centers/${center.slug}`,
        lastModified: center.updated_at ? new Date(center.updated_at) : new Date(),
        changeFrequency: "weekly" as const,
        priority: 0.8,
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

  return [...staticPages, ...rehabPages, ...countryPages, ...cmsPages, ...centerPages, ...blogPages];
}

import { z } from "zod";

/**
 * Fields an admin may change on a `pages` row from /admin/content/[id].
 * Values mirror the DB check constraints (pages_status_check,
 * pages_page_type_check).
 */
export const pageUpdateSchema = z
  .object({
    title: z.string().trim().min(1).max(300),
    slug: z
      .string()
      .trim()
      .min(1)
      .max(200)
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "slug: lowercase letters, numbers and dashes"),
    content: z.string().max(200_000),
    page_type: z.enum(["static", "blog", "legal", "faq"]),
    status: z.enum(["draft", "approved", "published", "unpublished"]),
    meta_title: z.string().max(300).nullable(),
    meta_description: z.string().max(1000).nullable(),
    tags: z.array(z.string().trim().min(1).max(80)).max(30),
    published_at: z.string().datetime({ offset: true }).nullable(),
  })
  .partial()
  .strict();

export type PageUpdate = z.infer<typeof pageUpdateSchema>;

/**
 * Publishing without a date stamps "now" (same behaviour the editor had
 * when it wrote to Supabase directly).
 */
export function withPublishDate(
  update: PageUpdate,
  current: { published_at: string | null },
  now: Date = new Date()
): PageUpdate {
  if (update.status !== "published") return update;
  const publishedAt = update.published_at ?? current.published_at;
  return { ...update, published_at: publishedAt ?? now.toISOString() };
}

/** Public paths that render this page and must be revalidated after a change. */
export function pathsForPage(
  pageType: string | null | undefined,
  slug: string | null | undefined
): string[] {
  if (!slug) return [];
  if (pageType === "blog") return [`/blog/${slug}`, "/blog", "/"];
  return [`/pages/${slug}`];
}

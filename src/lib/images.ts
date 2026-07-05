/**
 * Image optimization allowlist helper.
 *
 * next.config.ts restricts the image optimizer to known hosts (Supabase
 * storage, Unsplash, Pexels) so the optimizer can't be used as an open proxy.
 * Center photos are normally in Supabase storage, but imported/unclaimed
 * listings can reference arbitrary external hosts — for those we render
 * next/image with `unoptimized` so they still display instead of throwing.
 */
export function canOptimizeImage(url: string | null | undefined): boolean {
  if (!url) return false;
  try {
    const host = new URL(url).hostname;
    return (
      host.endsWith(".supabase.co") ||
      host === "images.unsplash.com" ||
      host === "images.pexels.com"
    );
  } catch {
    return false;
  }
}

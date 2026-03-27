import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { ArrowRight, BookOpen } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Articles & Recovery Resources | Rehab-Atlas",
  description: "Expert articles on addiction, treatment methods, recovery strategies, and mental health. Evidence-based resources to guide your journey.",
};

function extractFeaturedImage(content: string | null): string | null {
  if (!content) return null;
  const match = content.match(/!\[featured\]\(([^)]+)\)/);
  return match ? match[1] : null;
}

function estimateReadTime(content: string | null): string {
  if (!content) return "3 min read";
  const words = content.split(/\s+/).length;
  const mins = Math.max(3, Math.ceil(words / 200));
  return `${mins} min read`;
}

export default async function BlogPage({
  searchParams,
}: {
  searchParams: Promise<{ tag?: string }>;
}) {
  const params = await searchParams;
  const activeTag = params.tag || null;
  const supabase = await createClient();

  let query = supabase
    .from("pages")
    .select("slug, title, meta_description, published_at, content, tags")
    .eq("page_type", "blog")
    .eq("status", "published")
    .order("published_at", { ascending: false });

  if (activeTag) {
    query = query.contains("tags", [activeTag]);
  }

  const { data: posts } = await query;

  // Get all unique tags from published posts for the filter
  const { data: allPosts } = await supabase
    .from("pages")
    .select("tags")
    .eq("page_type", "blog")
    .eq("status", "published")
    .not("tags", "is", null);

  const allTags = new Map<string, number>();
  (allPosts || []).forEach((p) => {
    const tags = p.tags as string[] | null;
    if (tags) {
      tags.forEach((t) => allTags.set(t, (allTags.get(t) || 0) + 1));
    }
  });
  const sortedTags = Array.from(allTags.entries())
    .sort((a, b) => b[1] - a[1]);

  const featured = !activeTag ? posts?.[0] : null;
  const rest = !activeTag ? (posts?.slice(1) || []) : (posts || []);
  const featuredImage = featured ? extractFeaturedImage(featured.content) : null;

  return (
    <div className="bg-surface min-h-screen">
      {/* Hero with background image */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0">
          <img
            src="https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=1600&q=80&auto=format&fit=crop"
            alt=""
            className="w-full h-full object-cover object-center"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#45636b]/85 to-[#45636b]/60" />
        </div>
        <div className="relative container mx-auto px-4 sm:px-6 max-w-4xl py-16 md:py-24">
          <div className="flex items-center gap-2 mb-4">
            <BookOpen className="h-5 w-5 text-white/70" />
            <span className="text-xs uppercase tracking-widest text-white/70 font-medium">Articles &amp; Resources</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-serif font-semibold text-white leading-tight">
            Understanding Addiction <br className="hidden sm:block" />&amp; Recovery
          </h1>
          <p className="mt-4 text-sm md:text-base text-white/70 max-w-lg leading-relaxed">
            Evidence-based articles written by clinical specialists. Explore treatment methods, recovery strategies, and support resources.
          </p>
        </div>
      </section>

      <div className="container mx-auto px-4 sm:px-6 py-8 md:py-12 max-w-4xl">
        {/* Tag Filters */}
        {sortedTags.length > 0 && (
          <div className="mb-8">
            <div className="flex flex-wrap items-center gap-2">
              <Link
                href="/blog"
                className={`text-xs font-medium rounded-full px-3.5 py-1.5 transition-colors duration-200 ${
                  !activeTag
                    ? "bg-primary text-white"
                    : "bg-surface-container-lowest text-muted-foreground hover:bg-primary/10 hover:text-primary shadow-ambient"
                }`}
              >
                All Articles
              </Link>
              {sortedTags.map(([tag, count]) => (
                <Link
                  key={tag}
                  href={`/blog?tag=${encodeURIComponent(tag)}`}
                  className={`text-xs font-medium rounded-full px-3.5 py-1.5 transition-colors duration-200 ${
                    activeTag === tag
                      ? "bg-primary text-white"
                      : "bg-surface-container-lowest text-muted-foreground hover:bg-primary/10 hover:text-primary shadow-ambient"
                  }`}
                >
                  {tag} <span className="opacity-60">({count})</span>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Active filter indicator */}
        {activeTag && (
          <div className="mb-6 flex items-center gap-2">
            <p className="text-sm text-muted-foreground">
              Showing articles tagged <span className="font-medium text-foreground">&ldquo;{activeTag}&rdquo;</span>
            </p>
            <Link
              href="/blog"
              className="text-xs text-primary hover:underline"
            >
              Clear filter
            </Link>
          </div>
        )}

        {/* Featured Article (only on "All" view) */}
        {featured && (
          <Link href={`/blog/${featured.slug}`} className="block mb-8 md:mb-12 group">
            <div className="bg-surface-container-lowest rounded-2xl overflow-hidden shadow-ambient hover:shadow-ambient-lg transition-all duration-300">
              {/* Featured Image */}
              {featuredImage && (
                <div className="aspect-[21/9] relative overflow-hidden">
                  <img
                    src={featuredImage}
                    alt={featured.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
                  <span className="absolute top-4 left-4 text-[10px] uppercase tracking-wider bg-white/90 backdrop-blur-sm text-primary font-medium rounded-full px-3 py-1">
                    Featured Article
                  </span>
                </div>
              )}
              <div className="p-5 md:p-8">
                {!featuredImage && (
                  <span className="text-[10px] uppercase tracking-wider text-primary font-medium">Featured Article</span>
                )}
                <h2 className="text-headline-md md:text-headline-lg font-semibold text-foreground mt-1 group-hover:text-primary transition-colors duration-300">
                  {featured.title}
                </h2>
                {featured.meta_description && (
                  <p className="text-sm text-muted-foreground mt-3 leading-relaxed line-clamp-2 md:line-clamp-3">
                    {featured.meta_description}
                  </p>
                )}
                {/* Tags */}
                {(featured.tags as string[] | null)?.length ? (
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {(featured.tags as string[]).map((tag) => (
                      <span key={tag} className="text-[10px] font-medium rounded-full px-2.5 py-0.5 bg-primary/8 text-primary/80">
                        {tag}
                      </span>
                    ))}
                  </div>
                ) : null}
                <div className="flex flex-wrap items-center justify-between mt-5 gap-2">
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    {featured.published_at && (
                      <span>
                        {new Date(featured.published_at).toLocaleDateString("en-US", {
                          month: "long", day: "numeric", year: "numeric",
                        })}
                      </span>
                    )}
                    <span className="w-1 h-1 rounded-full bg-muted-foreground" />
                    <span>{estimateReadTime(featured.content)}</span>
                  </div>
                  <span className="flex items-center gap-1 text-sm text-primary font-medium">
                    Read article <ArrowRight className="h-3.5 w-3.5" />
                  </span>
                </div>
              </div>
            </div>
          </Link>
        )}

        {/* Articles Grid */}
        {rest.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 md:gap-6">
            {rest.map((post) => {
              const postImage = extractFeaturedImage(post.content);
              const postTags = post.tags as string[] | null;
              return (
                <Link
                  key={post.slug}
                  href={`/blog/${post.slug}`}
                  className="group bg-surface-container-lowest rounded-2xl overflow-hidden shadow-ambient hover:shadow-ambient-lg transition-all duration-300"
                >
                  {/* Card Image */}
                  {postImage && (
                    <div className="aspect-[16/9] relative overflow-hidden">
                      <img
                        src={postImage}
                        alt={post.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    </div>
                  )}
                  <div className="p-5">
                    <h3 className="text-base md:text-headline-sm font-semibold text-foreground group-hover:text-primary transition-colors duration-300 line-clamp-2">
                      {post.title}
                    </h3>
                    {post.meta_description && (
                      <p className="text-xs text-muted-foreground mt-2 leading-relaxed line-clamp-2">
                        {post.meta_description}
                      </p>
                    )}
                    {/* Tags */}
                    {postTags?.length ? (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {postTags.slice(0, 3).map((tag) => (
                          <span key={tag} className="text-[10px] font-medium rounded-full px-2 py-0.5 bg-primary/8 text-primary/80">
                            {tag}
                          </span>
                        ))}
                      </div>
                    ) : null}
                    <div className="flex items-center justify-between mt-4 pt-3">
                      <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                        {post.published_at && (
                          <span>
                            {new Date(post.published_at).toLocaleDateString("en-US", {
                              month: "short", day: "numeric", year: "numeric",
                            })}
                          </span>
                        )}
                        <span className="w-1 h-1 rounded-full bg-muted-foreground" />
                        <span>{estimateReadTime(post.content)}</span>
                      </div>
                      <span className="text-xs text-primary">Read &rarr;</span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        ) : !featured ? (
          <div className="text-center py-16 md:py-20">
            {activeTag ? (
              <>
                <p className="text-headline-md text-foreground">No articles found</p>
                <p className="text-sm text-muted-foreground mt-2">
                  No articles with the tag &ldquo;{activeTag}&rdquo; yet.
                </p>
                <Link href="/blog" className="text-sm text-primary hover:underline mt-4 inline-block">
                  View all articles
                </Link>
              </>
            ) : (
              <>
                <p className="text-headline-md text-foreground">Coming Soon</p>
                <p className="text-sm text-muted-foreground mt-2">
                  Our clinical team is preparing new articles. Check back soon.
                </p>
              </>
            )}
          </div>
        ) : null}

        {/* CTA */}
        <div className="mt-12 md:mt-16 text-center bg-surface-container-low rounded-2xl p-8 md:p-10 ghost-border">
          <h2 className="text-headline-sm md:text-headline-md font-semibold text-foreground">
            Need personalized guidance?
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Our specialists can help you find the right treatment path.
          </p>
          <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
            <Button className="rounded-full gradient-primary text-white hover:opacity-90 transition-opacity duration-300" asChild>
              <Link href="/assessment">Take Assessment</Link>
            </Button>
            <Button variant="outline" className="rounded-full ghost-border border-0" asChild>
              <Link href="/inquiry">Contact Us</Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

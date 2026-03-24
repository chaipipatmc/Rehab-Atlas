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

export default async function BlogPage() {
  const supabase = await createClient();

  const { data: posts } = await supabase
    .from("pages")
    .select("slug, title, meta_description, published_at, content")
    .eq("page_type", "blog")
    .eq("status", "published")
    .order("published_at", { ascending: false });

  const featured = posts?.[0];
  const rest = posts?.slice(1) || [];
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
        {/* Featured Article */}
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
            <p className="text-headline-md text-foreground">Coming Soon</p>
            <p className="text-sm text-muted-foreground mt-2">
              Our clinical team is preparing new articles. Check back soon.
            </p>
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

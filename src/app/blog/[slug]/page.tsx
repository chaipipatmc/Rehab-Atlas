import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight, BookOpen } from "lucide-react";
import ReactMarkdown from "react-markdown";
import type { Metadata } from "next";
import type { Components } from "react-markdown";
import { ArticleJsonLd, BreadcrumbJsonLd } from "@/components/shared/json-ld";

interface PageProps {
  params: Promise<{ slug: string }>;
}

function extractFeaturedImage(content: string | null): string | null {
  if (!content) return null;
  const match = content.match(/!\[featured\]\(([^)]+)\)/);
  return match ? match[1] : null;
}

function stripFeaturedImage(content: string | null): string {
  if (!content) return "";
  return content.replace(/!\[featured\]\([^)]+\)\n?\n?/, "");
}

function estimateReadTime(content: string | null): string {
  if (!content) return "3 min read";
  const words = content.split(/\s+/).length;
  const mins = Math.max(3, Math.ceil(words / 200));
  return `${mins} min read`;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const supabase = await createClient();
  const { data: post } = await supabase
    .from("pages")
    .select("title, meta_title, meta_description, content, published_at")
    .eq("slug", slug)
    .eq("page_type", "blog")
    .eq("status", "published")
    .single();

  if (!post) return { title: "Article Not Found" };

  const image = extractFeaturedImage(post.content);

  return {
    title: post.meta_title || post.title,
    description: post.meta_description || undefined,
    openGraph: {
      type: "article",
      ...(post.published_at ? { publishedTime: post.published_at } : {}),
      authors: ["Rehab-Atlas Editorial Team"],
      ...(image ? { images: [{ url: image }] } : {}),
    },
  };
}

// Custom markdown components for premium rendering
const blogMdComponents: Components = {
  h1: ({ children }) => (
    <h1 className="font-serif text-2xl md:text-3xl font-semibold text-foreground leading-snug mt-0 mb-6 pb-4 border-b border-[#e0e4e6]">
      {children}
    </h1>
  ),
  h2: ({ children }) => (
    <h2 className="font-serif text-xl md:text-2xl font-semibold text-foreground leading-snug mt-10 mb-4 pl-4 border-l-4 border-[#45636b]">
      {children}
    </h2>
  ),
  h3: ({ children }) => (
    <h3 className="font-serif text-lg md:text-xl font-semibold text-[#45636b] leading-snug mt-8 mb-3">
      {children}
    </h3>
  ),
  p: ({ children }) => (
    <p className="text-sm md:text-base text-[#5a6a70] leading-relaxed mb-4">
      {children}
    </p>
  ),
  ul: ({ children }) => (
    <ul className="list-disc pl-5 space-y-2 mb-5 text-sm md:text-base text-[#5a6a70]">
      {children}
    </ul>
  ),
  ol: ({ children }) => (
    <ol className="list-decimal pl-5 space-y-2 mb-5 text-sm md:text-base text-[#5a6a70]">
      {children}
    </ol>
  ),
  li: ({ children }) => (
    <li className="leading-relaxed">{children}</li>
  ),
  strong: ({ children }) => (
    <strong className="font-semibold text-foreground">{children}</strong>
  ),
  a: ({ href, children }) => (
    <a href={href} className="text-[#45636b] font-medium hover:underline underline-offset-4">
      {children}
    </a>
  ),
  blockquote: ({ children }) => (
    <blockquote className="border-l-4 border-[#45636b] bg-[#45636b]/5 rounded-r-xl py-3 px-5 my-6 not-italic text-foreground font-normal">
      {children}
    </blockquote>
  ),
  hr: () => <hr className="border-[#e0e4e6] my-10" />,
  img: ({ src, alt }) => (
    <img src={src} alt={alt || ""} className="rounded-xl shadow-md my-6 w-full" />
  ),
};

export default async function BlogPostPage({ params }: PageProps) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: post } = await supabase
    .from("pages")
    .select("*, author_center:centers(name, slug)")
    .eq("slug", slug)
    .eq("page_type", "blog")
    .eq("status", "published")
    .single();

  if (!post) notFound();

  const authorCenter = post.author_center as { name: string; slug: string } | null;
  const isPartnerArticle = post.author_type === "partner";

  const featuredImage = extractFeaturedImage(post.content);
  const cleanContent = stripFeaturedImage(post.content);

  // Fetch related articles
  const { data: related } = await supabase
    .from("pages")
    .select("slug, title, meta_description, content")
    .eq("page_type", "blog")
    .eq("status", "published")
    .neq("slug", slug)
    .order("published_at", { ascending: false })
    .limit(3);

  const BASE_URL =
    process.env.NEXT_PUBLIC_APP_URL || "https://rehab-atlas.vercel.app";

  return (
    <div className="bg-surface min-h-screen">
      <ArticleJsonLd
        title={post.title}
        description={post.meta_description ?? undefined}
        image={featuredImage ?? undefined}
        datePublished={post.published_at ?? undefined}
        author={
          isPartnerArticle && authorCenter
            ? authorCenter.name
            : "Rehab-Atlas Editorial Team"
        }
        url={`${BASE_URL}/blog/${post.slug}`}
      />
      <BreadcrumbJsonLd
        items={[
          { name: "Home", url: BASE_URL },
          { name: "Education", url: `${BASE_URL}/blog` },
          { name: post.title, url: `${BASE_URL}/blog/${post.slug}` },
        ]}
      />
      {/* Hero Image */}
      {featuredImage && (
        <div className="container mx-auto px-4 sm:px-6 max-w-3xl">
          <div className="relative w-full aspect-[2/1] max-h-[320px] rounded-2xl overflow-hidden">
            <img
              src={featuredImage}
              alt={post.title}
              className="w-full h-full object-cover object-center"
            />
          </div>
        </div>
      )}

      {/* Article Header */}
      <section className={`${featuredImage ? "mt-6" : "bg-surface-bright py-8"}`}>
        <div className="container mx-auto px-4 sm:px-6 max-w-3xl">
          <Link href="/blog" className="inline-flex items-center gap-1.5 text-xs text-primary hover:text-primary-dim transition-colors duration-300 mb-4 md:mb-6">
            <ArrowLeft className="h-3 w-3" />
            Back to Education
          </Link>

          <div className="flex items-center gap-2 mb-3 md:mb-4">
            <BookOpen className="h-4 w-4 text-primary" />
            <span className="text-[10px] uppercase tracking-widest text-primary font-medium">Education</span>
          </div>

          <h1 className="text-headline-lg md:text-display-md font-semibold text-foreground leading-tight">
            {post.title}
          </h1>

          {post.meta_description && (
            <p className="mt-3 md:mt-4 text-sm md:text-base text-muted-foreground leading-relaxed">
              {post.meta_description}
            </p>
          )}

          <div className="mt-4 md:mt-6 flex flex-wrap items-center gap-3 md:gap-4 text-xs text-muted-foreground">
            {post.published_at && (
              <span>
                {new Date(post.published_at).toLocaleDateString("en-US", {
                  month: "long", day: "numeric", year: "numeric",
                })}
              </span>
            )}
            <span className="w-1 h-1 rounded-full bg-muted-foreground" />
            <span>{estimateReadTime(post.content)}</span>
            <span className="w-1 h-1 rounded-full bg-muted-foreground" />
            {isPartnerArticle && authorCenter ? (
              <span>
                Written by{" "}
                <Link href={`/centers/${authorCenter.slug}`} className="text-primary hover:underline font-medium">
                  {authorCenter.name}
                </Link>
              </span>
            ) : (
              <span>Rehab-Atlas Editorial Team</span>
            )}
          </div>
        </div>
      </section>

      {/* Article Content */}
      <div className="container mx-auto px-4 sm:px-6 py-8 md:py-12 max-w-3xl">
        <article>
          <ReactMarkdown components={blogMdComponents}>{cleanContent}</ReactMarkdown>
        </article>

        {/* Author Box */}
        {isPartnerArticle && authorCenter ? (
          <div className="mt-10 md:mt-12 bg-surface-container-lowest rounded-2xl p-6 shadow-ambient">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-full bg-emerald-600 flex items-center justify-center text-white text-sm font-semibold flex-shrink-0">
                {authorCenter.name.charAt(0)}
              </div>
              <div className="flex-1">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Written by</p>
                <Link href={`/centers/${authorCenter.slug}`} className="text-base font-semibold text-foreground hover:text-primary transition-colors duration-300">
                  {authorCenter.name}
                </Link>
                {post.author_name && (
                  <p className="text-xs text-muted-foreground mt-0.5">By {post.author_name}</p>
                )}
                <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
                  This article was contributed by a verified center partner on Rehab-Atlas.
                  All partner content is reviewed by our editorial team for accuracy and quality.
                </p>
                <Link
                  href={`/centers/${authorCenter.slug}`}
                  className="inline-flex items-center gap-1 text-xs text-primary mt-3 hover:underline"
                >
                  View {authorCenter.name}&apos;s profile on Rehab-Atlas <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
            </div>
          </div>
        ) : (
          <div className="mt-10 md:mt-12 bg-surface-container-lowest rounded-2xl p-6 shadow-ambient">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-full gradient-primary flex items-center justify-center text-white text-sm font-semibold flex-shrink-0">
                RA
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Written by</p>
                <p className="text-base font-semibold text-foreground">Rehab-Atlas Editorial Team</p>
                <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
                  Our editorial team consists of clinical specialists, addiction counselors, and healthcare writers dedicated to providing accurate, evidence-based information.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Disclaimer */}
        <div className="mt-6 bg-surface-container-low rounded-xl p-4 ghost-border">
          <p className="text-[10px] text-muted-foreground leading-relaxed">
            <strong className="text-foreground">Disclaimer:</strong> This article is for educational purposes only and does not constitute medical advice. Always consult a qualified healthcare professional for diagnosis and treatment decisions.
          </p>
        </div>

        {/* CTA */}
        <div className="mt-8 md:mt-10 gradient-primary rounded-2xl p-6 md:p-8 text-center text-white">
          <h3 className="text-headline-sm md:text-headline-md font-semibold">Need help finding treatment?</h3>
          <p className="mt-2 text-xs md:text-sm text-white/70">Our specialists can guide you to the right center.</p>
          <div className="mt-4 md:mt-5 flex justify-center">
            <Button className="rounded-full bg-white text-foreground hover:bg-white/90" asChild>
              <Link href="/assessment">Take Assessment</Link>
            </Button>
          </div>
        </div>

        {/* Related Articles */}
        {related && related.length > 0 && (
          <div className="mt-12 md:mt-16">
            <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider mb-5 md:mb-6">
              Related Articles
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {related.map((r) => {
                const relImage = extractFeaturedImage(r.content);
                return (
                  <Link
                    key={r.slug}
                    href={`/blog/${r.slug}`}
                    className="group bg-surface-container-lowest rounded-xl overflow-hidden shadow-ambient hover:shadow-ambient-lg transition-all duration-300"
                  >
                    {relImage && (
                      <div className="aspect-[16/9] overflow-hidden">
                        <img src={relImage} alt={r.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                      </div>
                    )}
                    <div className="p-4">
                      <h3 className="text-sm font-medium text-foreground group-hover:text-primary transition-colors duration-300 line-clamp-2">
                        {r.title}
                      </h3>
                      <span className="inline-flex items-center gap-1 text-xs text-primary mt-2">
                        Read <ArrowRight className="h-3 w-3" />
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

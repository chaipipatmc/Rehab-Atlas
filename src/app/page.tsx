import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Shield, Users, Compass, ArrowRight, BookOpen } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { FeaturedCarousel } from "@/components/centers/featured-carousel";
import { HeroSearch } from "@/components/centers/hero-search";
import { OrganizationJsonLd } from "@/components/shared/json-ld";

// Curated Unsplash photos that match "Digital Sanctuary" aesthetic
// All free for commercial use, no attribution required
const HERO_IMAGES = {
  // Group sitting together outdoors in a lush European forest clearing — nature therapy
  hero: "https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=1920&q=80&auto=format&fit=crop",
  // Outdoor group wellness session surrounded by tall trees and soft light
  heroAlt: "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=1920&q=80&auto=format&fit=crop",
  // Peaceful ocean coastline — serenity
  quote: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&q=80&auto=format&fit=crop",
  // Misty mountain forest path — journey metaphor
  ctaBg: "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=1920&q=80&auto=format&fit=crop",
  // Luxury treatment room / spa detail
  unsure: "https://images.unsplash.com/photo-1600334089648-b0d9d3028eb2?w=800&q=80&auto=format&fit=crop",
};

export default async function HomePage() {
  // Fetch featured centers with photos
  let featuredCenters: Array<{
    id: string; name: string; slug: string; city: string | null;
    state_province: string | null; country: string; short_description: string | null;
    verified_profile: boolean;
    photos: Array<{ url: string; alt_text: string | null }>;
  }> = [];
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("centers")
      .select("id, name, slug, city, state_province, country, short_description, verified_profile, photos:center_photos(url, alt_text)")
      .eq("status", "published")
      .eq("is_featured", true)
      .order("editorial_overall", { ascending: false, nullsFirst: false })
      .limit(10);
    // Only show centers that have at least 1 photo
    if (data) featuredCenters = (data as typeof featuredCenters).filter(c => c.photos && c.photos.length > 0);
  } catch {
    // Supabase not configured yet
  }

  // Fetch latest blog articles
  let latestArticles: Array<{ slug: string; title: string; meta_description: string | null; published_at: string; content: string | null; tags: string[] | null }> = [];
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("pages")
      .select("slug, title, meta_description, published_at, content, tags")
      .eq("page_type", "blog")
      .eq("status", "published")
      .order("published_at", { ascending: false })
      .limit(6);
    if (data) latestArticles = data as typeof latestArticles;
  } catch {
    // Supabase not configured yet
  }
  return (
    <>
      <OrganizationJsonLd />
      {/* Hero Section — with atmospheric background */}
      <section className="relative min-h-[70vh] md:min-h-[85vh] flex items-center overflow-hidden">
        {/* Background image */}
        <div className="absolute inset-0">
          <Image
            src={HERO_IMAGES.hero}
            alt="Luxury wellness retreat"
            fill
            sizes="100vw"
            priority
            className="object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-white/90 via-white/70 to-white/30" />
        </div>

        <div className="relative container mx-auto px-4 sm:px-6 py-12 md:py-20">
          <div className="max-w-xl">
            <h1 className="text-display-md md:text-display-lg font-semibold text-foreground">
              A Quiet Path{" "}
              <br />
              <em className="font-editorial italic text-primary">to Recovery</em>
            </h1>
            <p className="mt-6 text-base text-muted-foreground max-w-lg leading-relaxed">
              Navigate the complexities of healing with absolute discretion.
              We curate the world&apos;s most distinguished recovery centers,
              acting as your personal advocate in the journey back to yourself.
            </p>

            {/* Search Bar — links to /centers with filters */}
            <HeroSearch />
          </div>
        </div>
      </section>

      {/* Featured Centers */}
      <section className="py-12 md:py-20 bg-surface-bright">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8 md:mb-10">
            <div>
              <h2 className="text-headline-lg font-semibold text-foreground">
                Featured Centers
              </h2>
              <p className="mt-2 text-sm text-muted-foreground max-w-md">
                Exceptional facilities hand-selected for their clinical excellence and
                uncompromising privacy standards.
              </p>
            </div>
            <Link href="/centers" className="hidden md:flex items-center gap-1 text-sm text-primary hover:text-primary-dim transition-colors duration-300">
              View all centers
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <FeaturedCarousel centers={featuredCenters} />

          {/* Mobile view all link */}
          <div className="mt-6 md:hidden text-center">
            <Link href="/centers" className="text-sm text-primary hover:text-primary-dim transition-colors duration-300">
              View all centers &rarr;
            </Link>
          </div>
        </div>
      </section>

      {/* Unsure Where to Begin CTA — with background image */}
      <section className="relative py-20 overflow-hidden">
        <div className="absolute inset-0">
          <Image
            src={HERO_IMAGES.unsure}
            alt="Peaceful treatment setting"
            className="w-full h-full object-cover"
            fill
            sizes="100vw"
          />
          <div className="absolute inset-0 bg-white/85 backdrop-blur-sm" />
        </div>
        <div className="relative container mx-auto px-6">
          <div className="max-w-xl mx-auto text-center bg-white/60 backdrop-blur-md rounded-2xl p-10 shadow-ambient">
            <h2 className="text-headline-md font-semibold text-foreground">
              Unsure where to begin?
            </h2>
            <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
              Our assessment provides comprehensive guidance, evaluating your specific needs
              to find the right path forward.
            </p>
            <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
              <Button className="rounded-full px-6 bg-white text-foreground hover:bg-white/90 transition-opacity duration-300 shadow-md" asChild>
                <Link href="/assessment">Consult a specialist</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Why Rehab-Atlas? — with photo on right */}
      <section className="py-12 md:py-20 bg-surface-bright">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 md:gap-16 items-start">
            <div>
              <h2 className="text-headline-lg font-semibold text-foreground">
                Why Rehab-Atlas?
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                The Architecture of Trust.
              </p>

              <div className="mt-10 space-y-8">
                {[
                  {
                    icon: Shield,
                    title: "Absolute Privacy",
                    description:
                      "Your story is yours and no one else's. We act as a firewall between you and the industry, ensuring your inquiry remains private.",
                  },
                  {
                    icon: Compass,
                    title: "Expert Advocacy",
                    description:
                      "Our specialists have studied every facility in our network. We know the staff, the clinical modalities, and the environment.",
                  },
                  {
                    icon: Users,
                    title: "Independent Guidance",
                    description:
                      "We work for you, not the centers. No direct contact with facilities until you are ready to make a choice.",
                  },
                ].map((item) => (
                  <div key={item.title} className="flex gap-4">
                    <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <item.icon className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-foreground">{item.title}</h3>
                      <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
                        {item.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Photo + Quote card stack */}
            <div className="space-y-6">
              {/* Atmospheric photo */}
              <div className="rounded-2xl overflow-hidden aspect-[4/3] relative">
                <Image
                  src={HERO_IMAGES.quote}
                  alt="Peaceful coastline — serenity and recovery"
                  className="w-full h-full object-cover"
                  fill
                  sizes="(max-width: 768px) 100vw, 50vw"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
              </div>
              {/* Quote card */}
              <div className="bg-surface-container-low rounded-2xl p-8 ghost-border">
                <p className="font-editorial italic text-lg text-foreground leading-relaxed">
                  &ldquo;Guiding you to the right center, with care.&rdquo;
                </p>
                <p className="mt-4 text-xs uppercase tracking-wider text-muted-foreground">
                  The Rehab-Atlas Promise
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Latest Articles */}
      {latestArticles.length > 0 && (
        <section className="py-16 md:py-24 bg-surface">
          <div className="container mx-auto px-4 sm:px-6 max-w-5xl">
            <div className="flex items-center justify-between mb-8">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <BookOpen className="h-5 w-5 text-primary" />
                  <span className="text-xs uppercase tracking-widest text-primary font-medium">Articles &amp; Resources</span>
                </div>
                <h2 className="text-headline-md md:text-headline-lg font-semibold text-foreground">
                  Understanding Addiction &amp; Recovery
                </h2>
              </div>
              <Button variant="outline" className="rounded-full ghost-border border-0 hidden sm:flex" asChild>
                <Link href="/blog">
                  View all <ArrowRight className="ml-1 h-3.5 w-3.5" />
                </Link>
              </Button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {latestArticles.map((post) => {
                const imageMatch = post.content?.match(/!\[featured\]\(([^)]+)\)/);
                const image = imageMatch ? imageMatch[1] : null;
                const words = post.content?.split(/\s+/).length || 0;
                const readTime = Math.max(3, Math.ceil(words / 200));
                return (
                  <Link
                    key={post.slug}
                    href={`/blog/${post.slug}`}
                    className="group bg-surface-container-lowest rounded-2xl overflow-hidden shadow-ambient hover:shadow-ambient-lg transition-all duration-300"
                  >
                    {image && (
                      <div className="aspect-[16/9] relative overflow-hidden">
                        <img src={image} alt={post.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                      </div>
                    )}
                    <div className="p-5">
                      <h3 className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors duration-300 line-clamp-2">
                        {post.title}
                      </h3>
                      {post.meta_description && (
                        <p className="text-xs text-muted-foreground mt-2 leading-relaxed line-clamp-2">{post.meta_description}</p>
                      )}
                      {post.tags?.length ? (
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {post.tags.slice(0, 2).map((tag) => (
                            <span key={tag} className="text-[10px] font-medium rounded-full px-2 py-0.5 bg-primary/8 text-primary/80">{tag}</span>
                          ))}
                        </div>
                      ) : null}
                      <div className="flex items-center justify-between mt-4 pt-3">
                        <span className="text-[10px] text-muted-foreground">
                          {post.published_at ? new Date(post.published_at).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : ""}
                          {" · "}{readTime} min read
                        </span>
                        <span className="text-xs text-primary">Read &rarr;</span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
            <div className="mt-6 text-center sm:hidden">
              <Button variant="outline" className="rounded-full ghost-border border-0" asChild>
                <Link href="/blog">View all articles <ArrowRight className="ml-1 h-3.5 w-3.5" /></Link>
              </Button>
            </div>
          </div>
        </section>
      )}

      {/* Bottom CTA — with full-width background image */}
      <section className="relative py-16 md:py-28 overflow-hidden">
        <div className="absolute inset-0">
          <Image
            src={HERO_IMAGES.ctaBg}
            alt="Forest pathway — the journey forward"
            className="w-full h-full object-cover"
            fill
            sizes="100vw"
          />
          <div className="absolute inset-0 bg-black/50" />
        </div>
        <div className="relative container mx-auto px-6 text-center">
          <p className="text-xs uppercase tracking-widest text-white/60 mb-4">
            Take the First Step
          </p>
          <h2 className="text-headline-lg md:text-display-md font-semibold text-white max-w-2xl mx-auto">
            The path to healing is quiet. Let us help you find it.
          </h2>
          <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
            <Button className="rounded-full px-8 h-12 bg-white text-foreground hover:bg-white/90 transition-opacity duration-300" asChild>
              <Link href="/assessment">Consult a specialist</Link>
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}

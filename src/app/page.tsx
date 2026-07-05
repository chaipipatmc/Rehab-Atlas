import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Shield, Users, Compass, ArrowRight, BookOpen, ClipboardList, Stethoscope, MailCheck, Lock } from "lucide-react";
import { createPublicClient } from "@/lib/supabase/server";
import { FeaturedCarousel } from "@/components/centers/featured-carousel";
import { HeroSearch } from "@/components/centers/hero-search";
import { OrganizationJsonLd } from "@/components/shared/json-ld";
import { canOptimizeImage } from "@/lib/images";

// ISR: rebuild at most every 10 minutes. Home content depends on latest blog
// articles + featured centers, both of which change at most a few times per
// day, so 10 min freshness is plenty and saves a Supabase round-trip per visit.
export const revalidate = 600;

// Minimum number of photographed centers required to show the Featured Centers
// carousel. Below this, the section is hidden to avoid sparse/empty cards that
// undermine trust before partner photo backfill is complete.
const FEATURED_MIN_COUNT = 6;

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
  // Fetch featured centers with photos (only render section if enough exist)
  let featuredCenters: Array<{
    id: string; name: string; slug: string; city: string | null;
    state_province: string | null; country: string; short_description: string | null;
    verified_profile: boolean;
    photos: Array<{ url: string; alt_text: string | null }>;
  }> = [];

  // Counts for the trust strip. We surface real numbers (published centers +
  // distinct countries) so the homepage doesn't lean on vague badges.
  let publishedCount = 0;
  let countryCount = 0;
  try {
    const supabase = createPublicClient();
    const { data } = await supabase
      .from("centers")
      .select("id, name, slug, city, state_province, country, short_description, verified_profile, is_unclaimed, photos:center_photos(url, alt_text)")
      .eq("status", "published")
      .limit(20);
    if (data) featuredCenters = (data as typeof featuredCenters).filter(c => c.photos && c.photos.length > 0);

    const { count: totalPublished } = await supabase
      .from("centers")
      .select("id", { count: "exact", head: true })
      .eq("status", "published");
    publishedCount = totalPublished || 0;

    const { data: countryRows } = await supabase
      .from("centers")
      .select("country")
      .eq("status", "published");
    countryCount = countryRows ? new Set(countryRows.map((r) => r.country).filter(Boolean)).size : 0;
  } catch {
    // Supabase not configured yet
  }

  // Fetch latest blog articles
  let latestArticles: Array<{ slug: string; title: string; meta_description: string | null; published_at: string; featured_image_url: string | null; word_count: number | null; tags: string[] | null }> = [];
  try {
    const supabase = createPublicClient();
    const { data } = await supabase
      .from("pages")
      .select("slug, title, meta_description, published_at, featured_image_url, word_count, tags")
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
      {/* Hero Section — single primary CTA: Start Confidential Assessment */}
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
          <div className="absolute inset-0 bg-gradient-to-r from-white/92 via-white/75 to-white/30" />
        </div>

        <div className="relative container mx-auto px-4 sm:px-6 py-12 md:py-20">
          <div className="max-w-xl">
            <h1 className="text-display-md md:text-display-lg font-semibold text-foreground leading-tight">
              Find the Right Rehab Center —{" "}
              <em className="font-editorial italic text-primary">Confidentially</em>
            </h1>
            <p className="mt-6 text-base text-muted-foreground max-w-lg leading-relaxed">
              Answer a few private questions and we&apos;ll match you with vetted treatment
              centers based on your situation — for yourself or a loved one. Independent,
              specialist-reviewed, and yours to control.
            </p>

            <div className="mt-8 md:mt-10 flex flex-col sm:flex-row gap-3">
              <Button
                className="rounded-full px-7 h-12 gradient-primary text-white hover:opacity-90 transition-opacity duration-300 shadow-md"
                asChild
              >
                <Link href="/assessment">
                  Start Confidential Assessment
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button
                variant="outline"
                className="rounded-full px-7 h-12 bg-white/80 backdrop-blur-sm border-0 ghost-border hover:bg-white transition-colors duration-300"
                asChild
              >
                <Link href="/centers">Browse verified centers</Link>
              </Button>
            </div>

            {/* Quick search — country + treatment typeahead straight into the directory */}
            <HeroSearch />

            {/* Privacy reassurance — the single most important line on this page */}
            <p className="mt-5 text-xs text-muted-foreground/90 max-w-md leading-relaxed">
              <Lock className="inline h-3.5 w-3.5 mr-1.5 -mt-0.5 text-primary" />
              Private &middot; independent &middot; no center will contact you without your consent.
            </p>
          </div>
        </div>
      </section>

      {/* Trust strip — concrete numbers anchor harder than abstract labels */}
      {publishedCount > 0 && (
        <section className="border-y border-[#e5e8ea] bg-surface-bright">
          <div className="container mx-auto px-4 sm:px-6 py-6 md:py-8">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-4 text-center">
              <div>
                <p className="text-2xl md:text-3xl font-semibold font-serif text-primary">{publishedCount}</p>
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground mt-1">Verified Centers</p>
              </div>
              <div>
                <p className="text-2xl md:text-3xl font-semibold font-serif text-primary">{countryCount || "—"}</p>
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground mt-1">Countries</p>
              </div>
              <div>
                <p className="text-2xl md:text-3xl font-semibold font-serif text-primary">2&ndash;4h</p>
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground mt-1">Typical Response Time</p>
              </div>
              <div>
                <p className="text-2xl md:text-3xl font-semibold font-serif text-primary">100%</p>
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground mt-1">Independent &mdash; We Own No Facility</p>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* How It Works — removes the "what happens after I submit?" blocker */}
      <section className="py-16 md:py-24 bg-surface">
        <div className="container mx-auto px-4 sm:px-6 max-w-5xl">
          <div className="text-center mb-12 md:mb-14">
            <span className="text-xs uppercase tracking-widest text-primary font-medium">How It Works</span>
            <h2 className="mt-2 text-headline-lg font-semibold text-foreground">
              A quieter way to find the right care
            </h2>
            <p className="mt-3 text-sm text-muted-foreground max-w-xl mx-auto leading-relaxed">
              Three steps. No cold calls. You stay in control of every conversation.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
            {[
              {
                icon: ClipboardList,
                step: "01",
                title: "Tell us what's happening",
                desc: "A private 3–5 minute assessment covers the situation, condition, urgency, location, budget, and the level of care that fits.",
              },
              {
                icon: Stethoscope,
                step: "02",
                title: "We review clinical fit",
                desc: "Our specialists evaluate which centers in our network actually match — by care level, specialization, environment, and language.",
              },
              {
                icon: MailCheck,
                step: "03",
                title: "You receive a private shortlist",
                desc: "We send a hand-picked match list. You decide if, when, and how to make contact. No center hears from us without your consent.",
              },
            ].map((s) => (
              <div key={s.step} className="bg-surface-container-lowest rounded-2xl p-6 md:p-7 shadow-ambient">
                <div className="flex items-center justify-between mb-5">
                  <div className="w-11 h-11 rounded-full bg-primary/10 flex items-center justify-center">
                    <s.icon className="h-5 w-5 text-primary" />
                  </div>
                  <span className="font-editorial italic text-2xl text-primary/30">{s.step}</span>
                </div>
                <h3 className="font-serif text-lg font-semibold text-foreground">{s.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>

          <div className="mt-10 md:mt-12 text-center">
            <Button className="rounded-full px-7 h-12 gradient-primary text-white hover:opacity-90 transition-opacity duration-300" asChild>
              <Link href="/assessment">
                Start Confidential Assessment
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <p className="mt-3 text-xs text-muted-foreground">Takes 3–5 minutes &middot; your answers stay private</p>
          </div>
        </div>
      </section>

      {/* Why Rehab-Atlas? */}
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

      {/* Assessment Preview — what the form actually covers, before they commit */}
      <section className="relative py-16 md:py-24 overflow-hidden">
        <div className="absolute inset-0">
          <Image
            src={HERO_IMAGES.unsure}
            alt="Peaceful treatment setting"
            className="w-full h-full object-cover"
            fill
            sizes="100vw"
          />
          <div className="absolute inset-0 bg-white/88 backdrop-blur-sm" />
        </div>
        <div className="relative container mx-auto px-4 sm:px-6 max-w-3xl">
          <div className="bg-white/80 backdrop-blur-md rounded-2xl p-8 md:p-10 shadow-ambient">
            <div className="text-center">
              <h2 className="text-headline-md font-semibold text-foreground">
                What the assessment covers
              </h2>
              <p className="mt-3 text-sm text-muted-foreground max-w-xl mx-auto leading-relaxed">
                A short, private set of questions designed to surface the right centers — not to sell you on any of them.
              </p>
            </div>

            <ul className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3 text-sm">
              {[
                "Who needs help — you or a loved one",
                "Primary concern (substance, mental health, dual diagnosis, trauma…)",
                "Severity and co-occurring conditions",
                "Urgency and whether medical detox is needed",
                "Preferred country and treatment setting",
                "Budget range and insurance situation",
                "Privacy importance and family involvement",
                "Where to send your private shortlist",
              ].map((item) => (
                <li key={item} className="flex items-start gap-2 text-foreground/85">
                  <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>

            <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center items-center">
              <Button className="rounded-full px-7 h-12 gradient-primary text-white hover:opacity-90 transition-opacity duration-300" asChild>
                <Link href="/assessment">
                  Start Confidential Assessment
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
            <p className="mt-3 text-xs text-muted-foreground text-center">
              <Lock className="inline h-3 w-3 mr-1 -mt-0.5 text-primary" />
              Encrypted submission &middot; we don&apos;t sell your data &middot; you choose what happens next.
            </p>
          </div>
        </div>
      </section>

      {/* Featured Centers — placed after guidance so visitors aren't comparing centers before they know what fits */}
      {featuredCenters.length >= FEATURED_MIN_COUNT && (
        <section className="py-12 md:py-20 bg-surface-bright">
          <div className="container mx-auto px-4 sm:px-6">
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8 md:mb-10">
              <div>
                <h2 className="text-headline-lg font-semibold text-foreground">
                  Featured Centers
                </h2>
                <p className="mt-2 text-sm text-muted-foreground max-w-md">
                  Vetted facilities in our network. Specializations, settings, and care levels vary — the assessment surfaces which actually fit you.
                </p>
              </div>
              <Link href="/centers" className="hidden md:flex items-center gap-1 text-sm text-primary hover:text-primary-dim transition-colors duration-300">
                View all centers
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            <FeaturedCarousel centers={featuredCenters} />

            <div className="mt-6 md:hidden text-center">
              <Link href="/centers" className="text-sm text-primary hover:text-primary-dim transition-colors duration-300">
                View all centers &rarr;
              </Link>
            </div>
          </div>
        </section>
      )}

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
                const image = post.featured_image_url;
                const readTime = Math.max(3, Math.ceil((post.word_count ?? 600) / 200));
                return (
                  <Link
                    key={post.slug}
                    href={`/blog/${post.slug}`}
                    className="group bg-surface-container-lowest rounded-2xl overflow-hidden shadow-ambient hover:shadow-ambient-lg transition-all duration-300"
                  >
                    {image && (
                      <div className="aspect-[16/9] relative overflow-hidden">
                        <Image
                          src={image}
                          alt={post.title}
                          fill
                          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                          unoptimized={!canOptimizeImage(image)}
                          className="object-cover group-hover:scale-105 transition-transform duration-500"
                        />
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

      {/* Bottom CTA — final assessment push */}
      <section className="relative py-16 md:py-28 overflow-hidden">
        <div className="absolute inset-0">
          <Image
            src={HERO_IMAGES.ctaBg}
            alt="Forest pathway — the journey forward"
            className="w-full h-full object-cover"
            fill
            sizes="100vw"
          />
          <div className="absolute inset-0 bg-black/55" />
        </div>
        <div className="relative container mx-auto px-6 text-center">
          <p className="text-xs uppercase tracking-widest text-white/60 mb-4">
            Not sure where to begin?
          </p>
          <h2 className="text-headline-lg md:text-display-md font-semibold text-white max-w-2xl mx-auto">
            Start here. We&apos;ll help you find the right place — quietly.
          </h2>
          <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Button className="rounded-full px-8 h-12 bg-white text-foreground hover:bg-white/90 transition-opacity duration-300" asChild>
              <Link href="/assessment">
                Start Confidential Assessment
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
          <p className="mt-4 text-xs text-white/60">
            Private &middot; independent &middot; no center contact without your consent
          </p>
        </div>
      </section>
    </>
  );
}

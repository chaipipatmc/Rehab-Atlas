import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import ReactMarkdown from "react-markdown";
import { ArrowLeft, Scale, FileText, ShieldCheck, AlertCircle, BookOpen, Calendar } from "lucide-react";
import type { Metadata } from "next";
import type { Components } from "react-markdown";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const supabase = await createClient();
  const { data: page } = await supabase
    .from("pages")
    .select("title, meta_title, meta_description")
    .eq("slug", slug)
    .eq("status", "published")
    .single();

  if (!page) return { title: "Page Not Found" };
  return {
    title: page.meta_title || page.title,
    description: page.meta_description || undefined,
  };
}

const PAGE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  "privacy-policy": ShieldCheck,
  "terms-of-use": Scale,
  "disclaimer": AlertCircle,
  "hipaa": ShieldCheck,
  "contact": BookOpen,
};

const PAGE_BADGES: Record<string, string> = {
  "privacy-policy": "Privacy & Data",
  "terms-of-use": "Legal",
  "disclaimer": "Medical Notice",
  "hipaa": "Compliance",
  "contact": "Get in Touch",
};

// Custom markdown components for premium rendering
const mdComponents: Components = {
  h1: ({ children }) => (
    <h1 className="font-serif text-2xl md:text-3xl font-semibold text-foreground leading-snug mt-0 mb-6 pb-4 border-b border-[#e0e4e6]">
      {children}
    </h1>
  ),
  h2: ({ children }) => (
    <h2 className="font-serif text-xl md:text-2xl font-semibold text-foreground leading-snug mt-10 mb-5 pl-4 border-l-4 border-[#45636b]">
      {children}
    </h2>
  ),
  h3: ({ children }) => (
    <h3 className="font-serif text-base md:text-lg font-semibold text-[#45636b] leading-snug mt-7 mb-3">
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
  em: ({ children }) => (
    <em className="text-[#7a8a90] text-xs uppercase tracking-wider not-italic">{children}</em>
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
  code: ({ children }) => (
    <code className="bg-[#f0f3f4] rounded px-1.5 py-0.5 text-xs">{children}</code>
  ),
};

export default async function CMSPage({ params }: PageProps) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: page } = await supabase
    .from("pages")
    .select("*")
    .eq("slug", slug)
    .eq("status", "published")
    .single();

  if (!page) notFound();

  const isLegal = page.page_type === "legal";
  const Icon = PAGE_ICONS[slug] ?? FileText;
  const badge = PAGE_BADGES[slug] ?? (isLegal ? "Legal" : "Information");

  // Strip the first H1 from content since we show title in hero
  const content = (page.content || "").replace(/^#\s+.+\n+/, "");

  return (
    <div className="bg-[#f8f9fa] min-h-screen">
      {/* Hero Header */}
      <section
        className="relative overflow-hidden"
        style={{
          background: "linear-gradient(135deg, #f4f6f7 0%, #e8ecee 40%, #d4e4e8 100%)",
        }}
      >
        <div
          aria-hidden
          className="absolute -top-24 -right-24 w-96 h-96 rounded-full opacity-20"
          style={{ background: "radial-gradient(circle, #45636b 0%, transparent 70%)" }}
        />
        <div
          aria-hidden
          className="absolute -bottom-16 -left-16 w-64 h-64 rounded-full opacity-10"
          style={{ background: "radial-gradient(circle, #45636b 0%, transparent 70%)" }}
        />

        <div className="relative container mx-auto px-4 sm:px-6 py-12 md:py-16 max-w-4xl">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs text-[#45636b] hover:text-[#2d4248] transition-colors duration-300 mb-6 group"
          >
            <ArrowLeft className="h-3 w-3 group-hover:-translate-x-0.5 transition-transform" />
            Back to Home
          </Link>

          <div className="flex items-start gap-5">
            <div className="hidden sm:flex w-14 h-14 rounded-2xl bg-white shadow-md items-center justify-center flex-shrink-0 mt-1">
              <Icon className="h-6 w-6 text-[#45636b]" />
            </div>

            <div className="flex-1">
              <div className="inline-flex items-center gap-2 mb-3">
                <span className="text-[10px] uppercase tracking-widest text-[#45636b] font-medium px-2.5 py-1 rounded-full bg-[#45636b]/10">
                  {badge}
                </span>
              </div>
              <h1 className="font-serif text-2xl md:text-4xl font-semibold text-foreground leading-tight">
                {page.title}
              </h1>
              {page.meta_description && (
                <p className="mt-3 text-sm text-[#7a8a90] leading-relaxed max-w-2xl">
                  {page.meta_description}
                </p>
              )}
              {page.updated_at && (
                <div className="mt-4 flex items-center gap-1.5 text-xs text-[#9aa5a9]">
                  <Calendar className="h-3 w-3" />
                  Last updated: {new Date(page.updated_at).toLocaleDateString("en-US", { month: "long", year: "numeric" })}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Content Card */}
      <div className="container mx-auto px-4 sm:px-6 py-8 md:py-12 max-w-4xl">
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          {/* Top accent bar */}
          <div className="h-1 bg-gradient-to-r from-[#45636b] to-[#6a9aa5]" />

          <div className="px-6 sm:px-8 md:px-12 py-8 md:py-14">
            <article>
              <ReactMarkdown components={mdComponents}>{content}</ReactMarkdown>
            </article>
          </div>

          {/* Footer cross-links */}
          {isLegal && (
            <div className="border-t border-[#e8ecee] bg-[#f8f9fa] px-6 sm:px-8 md:px-12 py-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <p className="text-xs text-[#9aa5a9]">
                Rehab-Atlas &mdash; A Digital Sanctuary for Recovery
              </p>
              <div className="flex items-center gap-4">
                {slug !== "privacy-policy" && (
                  <Link href="/pages/privacy-policy" className="text-xs text-[#45636b] hover:underline underline-offset-4">
                    Privacy Policy
                  </Link>
                )}
                {slug !== "terms-of-use" && (
                  <Link href="/pages/terms-of-use" className="text-xs text-[#45636b] hover:underline underline-offset-4">
                    Terms of Service
                  </Link>
                )}
                {slug !== "disclaimer" && (
                  <Link href="/pages/disclaimer" className="text-xs text-[#45636b] hover:underline underline-offset-4">
                    Medical Disclaimer
                  </Link>
                )}
                {slug !== "hipaa" && (
                  <Link href="/pages/hipaa" className="text-xs text-[#45636b] hover:underline underline-offset-4">
                    HIPAA Compliance
                  </Link>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

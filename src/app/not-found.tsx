import Link from "next/link";
import type { Metadata } from "next";
import { Button } from "@/components/ui/button";
import { Search, HeartPulse, BookOpen, ArrowRight } from "lucide-react";

export const metadata: Metadata = {
  title: "Page Not Found",
  robots: { index: false },
};

export default function NotFound() {
  return (
    <div className="bg-surface min-h-[70vh] flex items-center">
      <div className="container mx-auto px-4 sm:px-6 py-16 text-center max-w-2xl">
        <p className="text-xs uppercase tracking-widest text-primary font-medium mb-4">
          404 — Page not found
        </p>
        <h1 className="text-3xl md:text-4xl font-serif font-semibold text-foreground leading-tight">
          This page isn&apos;t here — but the help you&apos;re looking for is
        </h1>
        <p className="mt-4 text-sm md:text-base text-muted-foreground leading-relaxed">
          The link may have moved or expired. Everything on Rehab-Atlas is still
          a click away, and every inquiry stays confidential.
        </p>

        <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
          <Button
            className="rounded-full px-7 gradient-primary text-white hover:opacity-90 transition-opacity duration-300"
            asChild
          >
            <Link href="/assessment">Start Confidential Assessment</Link>
          </Button>
          <Button variant="outline" className="rounded-full px-7 ghost-border border-0" asChild>
            <Link href="/centers">Browse All Centers</Link>
          </Button>
        </div>

        <div className="mt-12 grid grid-cols-1 sm:grid-cols-3 gap-4 text-left">
          <Link
            href="/centers"
            className="group p-5 rounded-2xl bg-surface-container-lowest shadow-ambient hover:shadow-ambient-lg transition-all duration-300"
          >
            <Search className="h-4 w-4 text-primary mb-2" />
            <p className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">
              Center Directory
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Verified rehab centers worldwide
            </p>
          </Link>
          <Link
            href="/rehab"
            className="group p-5 rounded-2xl bg-surface-container-lowest shadow-ambient hover:shadow-ambient-lg transition-all duration-300"
          >
            <HeartPulse className="h-4 w-4 text-primary mb-2" />
            <p className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">
              Treatment Areas
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Alcohol, drugs, mental health &amp; more
            </p>
          </Link>
          <Link
            href="/blog"
            className="group p-5 rounded-2xl bg-surface-container-lowest shadow-ambient hover:shadow-ambient-lg transition-all duration-300"
          >
            <BookOpen className="h-4 w-4 text-primary mb-2" />
            <p className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">
              Recovery Guides
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Research-backed articles for families
            </p>
          </Link>
        </div>

        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm text-primary font-medium hover:underline mt-10"
        >
          Back to home <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </div>
  );
}

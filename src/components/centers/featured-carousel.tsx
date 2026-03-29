"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Shield, ArrowRight, ChevronLeft, ChevronRight, Info } from "lucide-react";
import { Button } from "@/components/ui/button";

interface FeaturedCenter {
  id: string;
  name: string;
  slug: string;
  city: string | null;
  state_province: string | null;
  country: string;
  short_description: string | null;
  verified_profile: boolean;
  is_unclaimed?: boolean | null;
  photos: Array<{ url: string; alt_text: string | null }>;
}

interface FeaturedCarouselProps {
  centers: FeaturedCenter[];
}

export function FeaturedCarousel({ centers }: FeaturedCarouselProps) {
  const [currentSet, setCurrentSet] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Each set shows 2 centers (1 large + 1 small)
  const setsCount = Math.ceil(centers.length / 2);

  // Auto-rotate every 20 seconds
  useEffect(() => {
    if (setsCount <= 1) return;
    const interval = setInterval(() => {
      setIsTransitioning(true);
      setTimeout(() => {
        setCurrentSet((prev) => (prev + 1) % setsCount);
        setIsTransitioning(false);
      }, 300);
    }, 20000);
    return () => clearInterval(interval);
  }, [setsCount]);

  function goTo(index: number) {
    if (index === currentSet) return;
    setIsTransitioning(true);
    setTimeout(() => {
      setCurrentSet(index);
      setIsTransitioning(false);
    }, 300);
  }

  function goNext() {
    goTo((currentSet + 1) % setsCount);
  }

  function goPrev() {
    goTo((currentSet - 1 + setsCount) % setsCount);
  }

  const mainCenter = centers[currentSet * 2];
  const sideCenter = centers[currentSet * 2 + 1];

  if (!mainCenter) return null;

  return (
    <div>
      <div className={`grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6 transition-opacity duration-300 ${isTransitioning ? "opacity-0" : "opacity-100"}`}>
        {/* Large featured card */}
        <Link
          href={`/centers/${mainCenter.slug}`}
          className="lg:col-span-2 relative rounded-2xl overflow-hidden aspect-[16/10] bg-surface-container group"
        >
          {mainCenter.photos?.[0] && (
            <img
              src={mainCenter.photos[0].url}
              alt={mainCenter.name}
              className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
          <div className="absolute top-4 left-4">
            {mainCenter.verified_profile && !mainCenter.is_unclaimed ? (
              <span className="inline-flex items-center gap-1.5 bg-white/20 backdrop-blur-sm text-white text-xs rounded-full px-3 py-1">
                <Shield className="h-3 w-3" />
                Verified Center
              </span>
            ) : mainCenter.is_unclaimed ? (
              <span className="inline-flex items-center gap-1.5 bg-amber-500/20 backdrop-blur-sm text-white text-xs rounded-full px-3 py-1">
                <Info className="h-3 w-3" />
                Public listing
              </span>
            ) : null}
          </div>
          <div className="absolute bottom-4 md:bottom-6 left-4 md:left-6 right-4 md:right-6 text-white">
            <h3 className="text-headline-sm md:text-headline-md font-semibold">{mainCenter.name}</h3>
            <p className="mt-1 text-xs md:text-sm text-white/80">
              {[mainCenter.city, mainCenter.state_province, mainCenter.country].filter(Boolean).join(", ")}
            </p>
            {mainCenter.short_description && (
              <p className="mt-1 md:mt-2 text-[10px] md:text-xs text-white/60 line-clamp-1">{mainCenter.short_description}</p>
            )}
          </div>
        </Link>

        {/* Side column */}
        <div className="flex flex-col gap-4 md:gap-6">
          {sideCenter ? (
            <Link
              href={`/centers/${sideCenter.slug}`}
              className="relative rounded-2xl overflow-hidden aspect-[4/3] bg-surface-container group"
            >
              {sideCenter.photos?.[0] && (
                <img
                  src={sideCenter.photos[0].url}
                  alt={sideCenter.name}
                  className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
              <div className="absolute bottom-3 md:bottom-4 left-3 md:left-4 right-3 md:right-4 text-white">
                <h3 className="text-base md:text-headline-sm font-semibold">{sideCenter.name}</h3>
                <p className="mt-0.5 md:mt-1 text-[10px] md:text-xs text-white/70">
                  {[sideCenter.city, sideCenter.state_province].filter(Boolean).join(", ")}
                </p>
              </div>
            </Link>
          ) : (
            <div className="relative rounded-2xl overflow-hidden aspect-[4/3] bg-surface-container" />
          )}
          <div className="rounded-2xl bg-surface-container-low p-4 md:p-5 ghost-border">
            {/* Preview thumbnails of next centers */}
            <div className="grid grid-cols-2 gap-2 mb-3">
              {centers
                .filter((_, i) => i !== currentSet * 2 && i !== currentSet * 2 + 1)
                .slice(0, 2)
                .map((c) => (
                  <Link key={c.id} href={`/centers/${c.slug}`} className="relative aspect-[4/3] rounded-lg overflow-hidden bg-surface-container group">
                    {c.photos?.[0] && (
                      <img src={c.photos[0].url} alt={c.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                    <p className="absolute bottom-1.5 left-2 right-1 text-[9px] text-white font-medium truncate">{c.name}</p>
                  </Link>
                ))}
            </div>
            <Button variant="outline" className="w-full rounded-full ghost-border border-0 text-xs" asChild>
              <Link href="/centers">
                Browse All Centers
                <ArrowRight className="ml-1 h-3 w-3" />
              </Link>
            </Button>
          </div>
        </div>
      </div>

      {/* Navigation dots + arrows */}
      {setsCount > 1 && (
        <div className="flex items-center justify-center gap-4 mt-6">
          <button
            onClick={goPrev}
            className="w-8 h-8 rounded-full bg-surface-container-low flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-surface-container transition-colors duration-300"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>

          <div className="flex items-center gap-2">
            {Array.from({ length: setsCount }).map((_, i) => (
              <button
                key={i}
                onClick={() => goTo(i)}
                className={`rounded-full transition-all duration-300 ${
                  i === currentSet
                    ? "w-6 h-2 bg-primary"
                    : "w-2 h-2 bg-surface-container-high hover:bg-primary/30"
                }`}
              />
            ))}
          </div>

          <button
            onClick={goNext}
            className="w-8 h-8 rounded-full bg-surface-container-low flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-surface-container transition-colors duration-300"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}

"use client";

import { useState, useEffect, useCallback } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";

interface Photo {
  id: string;
  url: string;
  alt_text: string | null;
}

interface PhotoGalleryProps {
  photos: Photo[];
  centerName: string;
}

export function PhotoGallery({ photos, centerName }: PhotoGalleryProps) {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);

  const openLightbox = useCallback((index: number) => {
    setCurrentIndex(index);
    setLightboxOpen(true);
  }, []);

  const closeLightbox = useCallback(() => {
    setLightboxOpen(false);
  }, []);

  const goNext = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % photos.length);
  }, [photos.length]);

  const goPrev = useCallback(() => {
    setCurrentIndex((prev) => (prev - 1 + photos.length) % photos.length);
  }, [photos.length]);

  useEffect(() => {
    if (!lightboxOpen) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") closeLightbox();
      if (e.key === "ArrowRight") goNext();
      if (e.key === "ArrowLeft") goPrev();
    }

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [lightboxOpen, closeLightbox, goNext, goPrev]);

  return (
    <>
      {/* Grid */}
      <div className="container mx-auto px-4 sm:px-6 mb-8 md:mb-10">
        {/* Mobile: stacked hero + horizontal scroll */}
        <div className="md:hidden space-y-2">
          {/* Main hero photo — full width, tall */}
          <button
            type="button"
            onClick={() => openLightbox(0)}
            className="w-full aspect-[16/10] rounded-2xl bg-surface-container overflow-hidden relative cursor-pointer"
          >
            <img
              src={photos[0].url}
              alt={photos[0].alt_text || centerName}
              className="absolute inset-0 w-full h-full object-cover"
            />
          </button>
          {/* Secondary: horizontal scroll row */}
          {photos.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 snap-x snap-mandatory">
              {photos.slice(1).map((photo, i) => (
                <button
                  type="button"
                  key={photo.id}
                  onClick={() => openLightbox(i + 1)}
                  className="flex-shrink-0 w-40 h-28 rounded-xl bg-surface-container overflow-hidden relative cursor-pointer snap-start"
                >
                  <img
                    src={photo.url}
                    alt={photo.alt_text || `${centerName} photo ${i + 2}`}
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                  {i === photos.length - 2 && photos.length > 5 && (
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                      <span className="text-white text-xs font-medium">View all {photos.length}</span>
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Desktop: grid layout */}
        <div className="hidden md:grid grid-cols-4 gap-3 h-80">
          <button
            type="button"
            onClick={() => openLightbox(0)}
            className="col-span-2 row-span-2 rounded-2xl bg-surface-container overflow-hidden relative cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <img
              src={photos[0].url}
              alt={photos[0].alt_text || centerName}
              className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 hover:scale-[1.02]"
            />
          </button>
          {photos.slice(1, 5).map((photo, i) => (
            <button
              type="button"
              key={photo.id}
              onClick={() => openLightbox(i + 1)}
              className="rounded-2xl bg-surface-container overflow-hidden relative cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <img
                src={photo.url}
                alt={photo.alt_text || `${centerName} photo ${i + 2}`}
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 hover:scale-[1.02]"
              />
              {i === 3 && photos.length > 5 && (
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center transition-colors duration-300 hover:bg-black/30">
                  <span className="text-white text-sm font-medium">+{photos.length - 5} more</span>
                </div>
              )}
            </button>
          ))}
          {photos.length < 5 &&
            Array.from({ length: 4 - (photos.length - 1) }).map((_, i) => (
              <div key={`empty-${i}`} className="rounded-2xl bg-surface-container overflow-hidden" />
            ))}
        </div>
      </div>

      {/* Lightbox Modal */}
      {lightboxOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          role="dialog"
          aria-modal="true"
          aria-label="Photo lightbox"
        >
          {/* Dark overlay */}
          <div
            className="absolute inset-0 bg-black/90 transition-opacity duration-300"
            onClick={closeLightbox}
          />

          {/* Close button */}
          <button
            type="button"
            onClick={closeLightbox}
            className="absolute top-4 right-4 z-10 w-10 h-10 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-white/20 transition-colors duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
            aria-label="Close lightbox"
          >
            <X className="h-5 w-5" />
          </button>

          {/* Photo counter */}
          <div className="absolute top-5 left-1/2 -translate-x-1/2 z-10 text-white/80 text-sm font-medium tracking-wide">
            {currentIndex + 1} / {photos.length}
          </div>

          {/* Previous button */}
          {photos.length > 1 && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); goPrev(); }}
              className="absolute left-3 md:left-6 z-10 w-10 h-10 md:w-12 md:h-12 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-white/20 transition-colors duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
              aria-label="Previous photo"
            >
              <ChevronLeft className="h-5 w-5 md:h-6 md:w-6" />
            </button>
          )}

          {/* Current photo */}
          <div className="relative z-10 max-w-[90vw] max-h-[85vh] flex items-center justify-center">
            <img
              src={photos[currentIndex].url}
              alt={photos[currentIndex].alt_text || `${centerName} photo ${currentIndex + 1}`}
              className="max-w-full max-h-[85vh] object-contain rounded-xl shadow-2xl transition-opacity duration-300"
            />
          </div>

          {/* Next button */}
          {photos.length > 1 && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); goNext(); }}
              className="absolute right-3 md:right-6 z-10 w-10 h-10 md:w-12 md:h-12 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-white/20 transition-colors duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
              aria-label="Next photo"
            >
              <ChevronRight className="h-5 w-5 md:h-6 md:w-6" />
            </button>
          )}
        </div>
      )}
    </>
  );
}

"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { CenterCard } from "@/components/centers/center-card";
import { ArrowRight, GitCompareArrows } from "lucide-react";
import type { Center, CenterPhoto } from "@/types/center";

interface CompareSelectorProps {
  centers: (Center & { photos?: CenterPhoto[] })[];
}

export function CompareSelector({ centers }: CompareSelectorProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set());

  function toggleCenter(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else if (next.size < 3) {
        next.add(id);
      }
      return next;
    });
  }

  const compareUrl =
    selected.size >= 2
      ? `/compare?ids=${Array.from(selected).join(",")}`
      : null;

  return (
    <div>
      {/* Compare Bar */}
      {selected.size > 0 && (
        <div className="sticky top-16 z-30 mb-6">
          <div className="bg-surface-container-lowest/95 backdrop-blur-md rounded-2xl shadow-ambient p-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-sm text-foreground">
              <GitCompareArrows className="h-4 w-4 text-primary" />
              <span>
                <strong>{selected.size}</strong> of 3 selected
              </span>
              {selected.size < 2 && (
                <span className="text-xs text-muted-foreground">
                  (select at least 2)
                </span>
              )}
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSelected(new Set())}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors duration-300"
              >
                Clear
              </button>
              {compareUrl ? (
                <Button
                  className="rounded-full gradient-primary text-white hover:opacity-90 text-xs"
                  size="sm"
                  asChild
                >
                  <Link href={compareUrl}>
                    Compare Selected
                    <ArrowRight className="ml-1.5 h-3 w-3" />
                  </Link>
                </Button>
              ) : (
                <Button
                  className="rounded-full text-xs opacity-50 cursor-not-allowed"
                  size="sm"
                  disabled
                >
                  Compare Selected
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Center Grid with Checkboxes */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {centers.map((center) => {
          const isSelected = selected.has(center.id);
          const isDisabled = !isSelected && selected.size >= 3;

          return (
            <div key={center.id} className="relative">
              {/* Checkbox overlay */}
              <button
                onClick={() => !isDisabled && toggleCenter(center.id)}
                className={`absolute top-3 right-3 z-10 h-6 w-6 rounded-full flex items-center justify-center transition-all duration-300 ${
                  isSelected
                    ? "bg-primary text-white shadow-md"
                    : isDisabled
                      ? "bg-surface-container text-muted-foreground/40 cursor-not-allowed"
                      : "bg-white/90 backdrop-blur-sm text-muted-foreground hover:bg-primary/10 hover:text-primary shadow-sm"
                }`}
                aria-label={
                  isSelected
                    ? `Remove ${center.name} from comparison`
                    : `Add ${center.name} to comparison`
                }
                disabled={isDisabled}
              >
                {isSelected ? (
                  <svg
                    className="h-3.5 w-3.5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={3}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                ) : (
                  <span className="text-xs font-medium">+</span>
                )}
              </button>

              {/* Selection ring */}
              <div
                className={`rounded-2xl transition-all duration-300 ${
                  isSelected
                    ? "ring-2 ring-primary ring-offset-2 ring-offset-surface"
                    : ""
                }`}
              >
                <CenterCard center={center} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

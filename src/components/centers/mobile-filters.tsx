"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { SlidersHorizontal } from "lucide-react";
import { CenterFilters, type CenterFiltersProps } from "./center-filters";

/**
 * Mobile-only filter drawer. On small screens the full filter sidebar used to
 * stack above the results, pushing centers below ~11 selects. This collapses
 * it behind a "Filters" button with an active-count badge.
 */
export function MobileFilters(props: CenterFiltersProps) {
  const [open, setOpen] = useState(false);
  const searchParams = useSearchParams();
  const activeCount = [...searchParams.keys()].filter(
    (key) => key !== "page" && key !== "sort"
  ).length;

  return (
    <div className="lg:hidden">
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger className="inline-flex items-center gap-2 rounded-full bg-surface-container-lowest shadow-ambient px-5 py-2.5 text-sm font-medium text-foreground hover:bg-surface-container transition-colors duration-300">
          <SlidersHorizontal className="h-4 w-4 text-primary" />
          Filters
          {activeCount > 0 && (
            <span className="inline-flex items-center justify-center min-w-5 h-5 rounded-full gradient-primary text-white text-[11px] font-semibold px-1.5">
              {activeCount}
            </span>
          )}
        </SheetTrigger>
        <SheetContent side="left" className="w-[320px] sm:w-96 bg-surface p-0 overflow-y-auto">
          <SheetTitle className="sr-only">Filter centers</SheetTitle>
          <div className="p-4">
            <CenterFilters {...props} />
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

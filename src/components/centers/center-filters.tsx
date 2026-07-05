"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Search, X } from "lucide-react";

// Human labels for active-filter chips
const FILTER_LABELS: Record<string, string> = {
  search: "Search",
  country: "Country",
  treatment_focus: "Focus",
  condition: "Condition",
  setting_type: "Setting",
  insurance: "Insurance",
  who_we_treat: "Who we treat",
  treatment_methods: "Therapy",
  languages: "Language",
  amenities: "Amenity",
  approaches: "Approach",
  activities: "Activity",
  accommodations: "Accommodation",
  has_detox: "Detox",
};

function prettyValue(key: string, value: string): string {
  if (key === "has_detox") return "Yes";
  return value.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

interface FilterOption {
  value: string;
  label: string;
}

export interface CenterFiltersProps {
  countries: string[];
  treatmentFocusOptions: FilterOption[];
  conditionOptions: FilterOption[];
  settingTypeOptions: FilterOption[];
  insuranceOptions: FilterOption[];
  whoWeTreatOptions: FilterOption[];
  treatmentMethodOptions: FilterOption[];
  languageOptions: FilterOption[];
  amenityOptions: FilterOption[];
}

export function CenterFilters({
  countries,
  treatmentFocusOptions,
  conditionOptions,
  settingTypeOptions,
  insuranceOptions,
  whoWeTreatOptions,
  treatmentMethodOptions,
  languageOptions,
  amenityOptions,
}: CenterFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const updateFilter = useCallback(
    (key: string, value: string | null) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value && value !== "all") {
        params.set(key, value);
      } else {
        params.delete(key);
      }
      params.delete("page");
      router.push(`/centers?${params.toString()}`);
    },
    [router, searchParams]
  );

  // Debounced search — the timer must live across renders or every keystroke
  // triggers a navigation.
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleSearchChange = useCallback(
    (value: string) => {
      if (searchTimer.current) clearTimeout(searchTimer.current);
      searchTimer.current = setTimeout(() => {
        updateFilter("search", value || null);
      }, 400);
    },
    [updateFilter]
  );
  useEffect(() => {
    return () => {
      if (searchTimer.current) clearTimeout(searchTimer.current);
    };
  }, []);

  const clearFilters = () => {
    router.push("/centers");
  };

  // Active filters (excluding paging/sorting) → removable chips
  const activeFilters = [...searchParams.entries()].filter(
    ([key]) => key !== "page" && key !== "sort"
  );
  const hasFilters = activeFilters.length > 0;

  return (
    <div className="bg-surface-container-lowest rounded-2xl p-6 shadow-ambient space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider">Refine Search</h3>
        {hasFilters && (
          <button
            onClick={clearFilters}
            className="text-xs text-primary hover:text-primary-dim transition-colors duration-300"
          >
            Clear All
          </button>
        )}
      </div>

      {/* Active filter chips — see + remove individual filters */}
      {hasFilters && (
        <div className="flex flex-wrap gap-1.5">
          {activeFilters.map(([key, value]) => (
            <button
              key={key}
              onClick={() => updateFilter(key, null)}
              className="inline-flex items-center gap-1 rounded-full bg-primary/10 text-primary text-[11px] font-medium px-2.5 py-1 hover:bg-primary/20 transition-colors duration-300"
              aria-label={`Remove filter ${FILTER_LABELS[key] || key}`}
            >
              <span>
                {(FILTER_LABELS[key] || key)}: {prettyValue(key, value)}
              </span>
              <X className="h-3 w-3" />
            </button>
          ))}
        </div>
      )}

      {/* Search */}
      <div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search centers..."
            defaultValue={searchParams.get("search") || ""}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="pl-9 bg-surface-container-low border-0 rounded-xl text-sm ghost-border focus:ring-1 focus:ring-primary/30"
          />
        </div>
      </div>

      {/* Country */}
      <div>
        <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Country</Label>
        <Select
          value={searchParams.get("country") || "all"}
          onValueChange={(v) => updateFilter("country", v)}
        >
          <SelectTrigger className="mt-2 bg-surface-container-low border-0 rounded-xl ghost-border">
            <SelectValue placeholder="All countries" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Countries</SelectItem>
            {countries.map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Treatment Focus */}
      {treatmentFocusOptions.length > 0 && (
        <div>
          <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Treatment Focus</Label>
          <Select
            value={searchParams.get("treatment_focus") || "all"}
            onValueChange={(v) => updateFilter("treatment_focus", v)}
          >
            <SelectTrigger className="mt-2 bg-surface-container-low border-0 rounded-xl ghost-border">
              <SelectValue placeholder="All types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {treatmentFocusOptions.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Conditions */}
      {conditionOptions.length > 0 && (
        <div>
          <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Condition</Label>
          <Select
            value={searchParams.get("condition") || "all"}
            onValueChange={(v) => updateFilter("condition", v)}
          >
            <SelectTrigger className="mt-2 bg-surface-container-low border-0 rounded-xl ghost-border">
              <SelectValue placeholder="All conditions" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Conditions</SelectItem>
              {conditionOptions.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Who We Treat */}
      {whoWeTreatOptions.length > 0 && (
        <div>
          <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Who We Treat</Label>
          <Select
            value={searchParams.get("who_we_treat") || "all"}
            onValueChange={(v) => updateFilter("who_we_treat", v)}
          >
            <SelectTrigger className="mt-2 bg-surface-container-low border-0 rounded-xl ghost-border">
              <SelectValue placeholder="All demographics" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Demographics</SelectItem>
              {whoWeTreatOptions.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Therapies (Treatment Methods) */}
      {treatmentMethodOptions.length > 0 && (
        <div>
          <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Therapies</Label>
          <Select
            value={searchParams.get("treatment_methods") || "all"}
            onValueChange={(v) => updateFilter("treatment_methods", v)}
          >
            <SelectTrigger className="mt-2 bg-surface-container-low border-0 rounded-xl ghost-border">
              <SelectValue placeholder="All therapies" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Therapies</SelectItem>
              {treatmentMethodOptions.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Languages */}
      {languageOptions.length > 0 && (
        <div>
          <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Languages</Label>
          <Select
            value={searchParams.get("languages") || "all"}
            onValueChange={(v) => updateFilter("languages", v)}
          >
            <SelectTrigger className="mt-2 bg-surface-container-low border-0 rounded-xl ghost-border">
              <SelectValue placeholder="All languages" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Languages</SelectItem>
              {languageOptions.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Setting Type */}
      {settingTypeOptions.length > 0 && (
        <div>
          <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Setting Type</Label>
          <Select
            value={searchParams.get("setting_type") || "all"}
            onValueChange={(v) => updateFilter("setting_type", v)}
          >
            <SelectTrigger className="mt-2 bg-surface-container-low border-0 rounded-xl ghost-border">
              <SelectValue placeholder="All settings" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Settings</SelectItem>
              {settingTypeOptions.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Amenities */}
      {amenityOptions.length > 0 && (
        <div>
          <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Amenities</Label>
          <Select
            value={searchParams.get("amenities") || "all"}
            onValueChange={(v) => updateFilter("amenities", v)}
          >
            <SelectTrigger className="mt-2 bg-surface-container-low border-0 rounded-xl ghost-border">
              <SelectValue placeholder="All amenities" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Amenities</SelectItem>
              {amenityOptions.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Insurance */}
      {insuranceOptions.length > 0 && (
        <div>
          <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Insurance Provider</Label>
          <Select
            value={searchParams.get("insurance") || "all"}
            onValueChange={(v) => updateFilter("insurance", v)}
          >
            <SelectTrigger className="mt-2 bg-surface-container-low border-0 rounded-xl ghost-border">
              <SelectValue placeholder="All insurance" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Insurance</SelectItem>
              {insuranceOptions.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Detox Toggle */}
      <div className="flex items-center justify-between py-2">
        <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Has Detox</Label>
        <Switch
          checked={searchParams.get("has_detox") === "true"}
          onCheckedChange={(checked) =>
            updateFilter("has_detox", checked ? "true" : null)
          }
        />
      </div>

      {/* Filters apply instantly on change — no submit button needed */}
      <p className="text-[11px] text-muted-foreground text-center">
        Filters apply automatically
      </p>
    </div>
  );
}

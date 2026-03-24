"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";
import { Button } from "@/components/ui/button";
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
import {
  TREATMENT_FOCUS_OPTIONS,
  SETTING_TYPE_OPTIONS,
  INSURANCE_OPTIONS,
} from "@/lib/constants";
import { Search } from "lucide-react";

interface CenterFiltersProps {
  countries: string[];
}

export function CenterFilters({ countries }: CenterFiltersProps) {
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

  const clearFilters = () => {
    router.push("/centers");
  };

  const hasFilters = searchParams.toString().length > 0;

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

      {/* Search */}
      <div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search centers..."
            defaultValue={searchParams.get("search") || ""}
            onChange={(e) => {
              const timeout = setTimeout(() => {
                updateFilter("search", e.target.value || null);
              }, 300);
              return () => clearTimeout(timeout);
            }}
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
            {TREATMENT_FOCUS_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Setting Type */}
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
            {SETTING_TYPE_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Insurance */}
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
            {INSURANCE_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

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

      {/* Apply Filters Button */}
      <Button className="w-full rounded-full gradient-primary text-white hover:opacity-90 transition-opacity duration-300">
        Apply Filters
      </Button>
    </div>
  );
}

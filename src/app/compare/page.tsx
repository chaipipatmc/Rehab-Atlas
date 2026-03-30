import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  MapPin,
  Star,
  Shield,
  ArrowRight,
  Check,
  X,
  Languages,
  Clock,
  ArrowLeft,
} from "lucide-react";
import type { Metadata } from "next";
import type { Center, CenterPhoto } from "@/types/center";

export const metadata: Metadata = {
  title: "Compare Centers — Rehab-Atlas",
  description:
    "Compare rehab centers side by side to find the best fit for your recovery journey.",
};

interface PageProps {
  searchParams: Promise<{ ids?: string }>;
}

function formatList(items: string[] | null | undefined): string {
  if (!items || items.length === 0) return "—";
  return items.map((s) => s.replace(/_/g, " ")).join(", ");
}

function formatPrice(center: Center): string {
  if (center.price_min) {
    const min = `$${center.price_min.toLocaleString()}`;
    const max = center.price_max
      ? ` – $${center.price_max.toLocaleString()}`
      : "+";
    return min + max;
  }
  if (center.pricing_text) return center.pricing_text;
  return "Contact for pricing";
}

type CenterWithPhotos = Center & { photos?: CenterPhoto[] };

// Check if a value differs across centers for highlighting
function hasVariation(
  centers: CenterWithPhotos[],
  getValue: (c: CenterWithPhotos) => string
): boolean {
  const values = centers.map(getValue);
  return new Set(values).size > 1;
}

export default async function ComparePage({ searchParams }: PageProps) {
  const { ids } = await searchParams;

  if (!ids) {
    return (
      <div className="bg-surface min-h-screen">
        <div className="container mx-auto px-4 sm:px-6 py-12 max-w-4xl text-center">
          <h1 className="text-headline-lg font-semibold text-foreground mb-4">
            Compare Centers
          </h1>
          <p className="text-sm text-muted-foreground mb-8">
            Select 2-3 centers from your saved list or the directory to compare
            them side by side.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button
              className="rounded-full gradient-primary text-white hover:opacity-90"
              asChild
            >
              <Link href="/account/saved">
                Go to Saved Centers
                <ArrowRight className="ml-2 h-3.5 w-3.5" />
              </Link>
            </Button>
            <Button
              variant="outline"
              className="rounded-full ghost-border border-0 hover:bg-surface-container"
              asChild
            >
              <Link href="/centers">Browse Directory</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const idList = ids
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean)
    .slice(0, 3);

  if (idList.length < 2) {
    return (
      <div className="bg-surface min-h-screen">
        <div className="container mx-auto px-4 sm:px-6 py-12 max-w-4xl text-center">
          <h1 className="text-headline-lg font-semibold text-foreground mb-4">
            Compare Centers
          </h1>
          <p className="text-sm text-muted-foreground mb-8">
            Please select at least 2 centers to compare.
          </p>
          <Button
            className="rounded-full gradient-primary text-white hover:opacity-90"
            asChild
          >
            <Link href="/account/saved">
              Go to Saved Centers
              <ArrowRight className="ml-2 h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  const supabase = await createClient();

  const { data } = await supabase
    .from("centers")
    .select("*, photos:center_photos(id, url, alt_text, sort_order)")
    .in("id", idList)
    .eq("status", "published")
    .order("sort_order", { referencedTable: "center_photos" })
    .limit(1, { referencedTable: "center_photos" });

  if (!data || data.length < 2) {
    notFound();
  }

  // Preserve the order from URL params
  const centerMap = new Map(data.map((c) => [c.id, c]));
  const centers = idList
    .map((id) => centerMap.get(id))
    .filter(Boolean) as CenterWithPhotos[];

  if (centers.length < 2) {
    notFound();
  }

  // Define comparison rows
  const rows: {
    label: string;
    getValue: (c: CenterWithPhotos) => string;
    type?: "boolean" | "list" | "rating";
  }[] = [
    {
      label: "Location",
      getValue: (c) =>
        [c.city, c.state_province, c.country].filter(Boolean).join(", ") ||
        "—",
    },
    {
      label: "Setting Type",
      getValue: (c) => c.setting_type?.replace(/_/g, " ") || "—",
    },
    {
      label: "Treatment Focus",
      getValue: (c) => formatList(c.treatment_focus),
      type: "list",
    },
    {
      label: "Conditions",
      getValue: (c) => formatList(c.conditions),
      type: "list",
    },
    {
      label: "Treatment Methods",
      getValue: (c) => formatList(c.treatment_methods),
      type: "list",
    },
    {
      label: "Services",
      getValue: (c) => formatList(c.services),
      type: "list",
    },
    {
      label: "Languages",
      getValue: (c) => formatList(c.languages),
      type: "list",
    },
    {
      label: "Program Length",
      getValue: (c) => c.program_length || "—",
    },
    {
      label: "Pricing",
      getValue: (c) => formatPrice(c),
    },
    {
      label: "Medical Detox",
      getValue: (c) => (c.has_detox ? "Yes" : "No"),
      type: "boolean",
    },
    {
      label: "Accreditation",
      getValue: (c) => formatList(c.accreditation),
      type: "list",
    },
    {
      label: "Rating",
      getValue: (c) =>
        c.editorial_overall
          ? `${c.editorial_overall}/10`
          : c.rating
            ? `${Number(c.rating).toFixed(1)}`
            : "—",
      type: "rating",
    },
  ];

  const colWidth = centers.length === 2 ? "w-1/2" : "w-1/3";

  return (
    <div className="bg-surface min-h-screen">
      <div className="container mx-auto px-4 sm:px-6 py-8 md:py-12 max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/account/saved"
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors duration-300 mb-4"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Saved Centers
          </Link>
          <h1 className="text-headline-lg font-semibold text-foreground">
            Compare Centers
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Side-by-side comparison of {centers.length} centers.
          </p>
        </div>

        {/* Sticky Header with Center Names + Photos */}
        <div className="bg-surface-container-lowest rounded-2xl shadow-ambient overflow-hidden">
          {/* Center headers */}
          <div className="flex border-b border-surface-container">
            {centers.map((center) => {
              const photo = center.photos?.[0];
              return (
                <div
                  key={center.id}
                  className={`${colWidth} p-5 sm:p-6 flex flex-col items-center text-center`}
                >
                  {/* Photo */}
                  <div className="relative w-full aspect-[16/10] bg-surface-container rounded-xl overflow-hidden mb-4">
                    {photo ? (
                      <img
                        src={photo.url}
                        alt={photo.alt_text || center.name}
                        className="absolute inset-0 w-full h-full object-cover"
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
                        <Shield className="h-8 w-8" />
                      </div>
                    )}
                    {center.verified_profile && (
                      <div className="absolute top-2 left-2">
                        <span className="inline-flex items-center gap-1 bg-white/90 backdrop-blur-sm text-[10px] text-foreground rounded-full px-2 py-0.5">
                          <Shield className="h-2.5 w-2.5 text-primary" />
                          Verified
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Name */}
                  <Link
                    href={`/centers/${center.slug}`}
                    className="font-editorial text-base sm:text-lg font-semibold text-foreground hover:text-primary transition-colors duration-300 line-clamp-2"
                  >
                    {center.name}
                  </Link>

                  {/* Location */}
                  <p className="flex items-center gap-1 text-xs text-muted-foreground mt-1.5">
                    <MapPin className="h-3 w-3 flex-shrink-0" />
                    {[center.city, center.country].filter(Boolean).join(", ")}
                  </p>

                  {/* Rating */}
                  {center.rating && (
                    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground mt-1.5">
                      <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                      {Number(center.rating).toFixed(1)}
                    </span>
                  )}

                  {/* CTA Buttons */}
                  <div className="flex flex-col gap-2 mt-4 w-full">
                    <Button
                      className="rounded-full gradient-primary text-white hover:opacity-90 text-xs w-full"
                      size="sm"
                      asChild
                    >
                      <Link href={`/inquiry?center=${center.id}`}>
                        Send Inquiry
                      </Link>
                    </Button>
                    <Button
                      variant="outline"
                      className="rounded-full ghost-border border-0 hover:bg-surface-container text-xs w-full"
                      size="sm"
                      asChild
                    >
                      <Link href={`/centers/${center.slug}`}>
                        View Profile
                      </Link>
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Comparison Rows */}
          <div className="divide-y divide-surface-container">
            {rows.map((row) => {
              const varied = hasVariation(centers, row.getValue);
              return (
                <div key={row.label} className="flex">
                  {/* Row label — shown on each cell for mobile responsiveness */}
                  {centers.map((center, i) => {
                    const value = row.getValue(center);
                    const isPositiveBoolean =
                      row.type === "boolean" && value === "Yes";
                    const isNegativeBoolean =
                      row.type === "boolean" && value === "No";

                    return (
                      <div
                        key={center.id}
                        className={`${colWidth} p-4 sm:p-5 ${
                          i > 0 ? "border-l border-surface-container" : ""
                        }`}
                      >
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5">
                          {row.label}
                        </p>
                        <div
                          className={`text-sm leading-relaxed ${
                            varied
                              ? "text-foreground font-medium"
                              : "text-muted-foreground"
                          }`}
                        >
                          {row.type === "boolean" ? (
                            <span
                              className={`inline-flex items-center gap-1.5 ${
                                isPositiveBoolean
                                  ? "text-emerald-600"
                                  : isNegativeBoolean
                                    ? "text-muted-foreground"
                                    : ""
                              }`}
                            >
                              {isPositiveBoolean ? (
                                <Check className="h-4 w-4" />
                              ) : (
                                <X className="h-4 w-4" />
                              )}
                              {value}
                            </span>
                          ) : row.type === "list" ? (
                            <div className="flex flex-wrap gap-1.5">
                              {value === "—" ? (
                                <span className="text-muted-foreground">—</span>
                              ) : (
                                value.split(", ").map((item) => {
                                  // Highlight unique items across centers
                                  const otherCenters = centers.filter(
                                    (_, j) => j !== i
                                  );
                                  const isUnique = !otherCenters.some((oc) =>
                                    row
                                      .getValue(oc)
                                      .toLowerCase()
                                      .includes(item.toLowerCase())
                                  );
                                  return (
                                    <span
                                      key={item}
                                      className={`text-[11px] rounded-full px-2.5 py-0.5 ${
                                        isUnique
                                          ? "bg-primary/10 text-primary font-medium"
                                          : "bg-surface-container-high text-muted-foreground"
                                      }`}
                                    >
                                      {item}
                                    </span>
                                  );
                                })
                              )}
                            </div>
                          ) : row.type === "rating" ? (
                            <span className="inline-flex items-center gap-1">
                              {value !== "—" && (
                                <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                              )}
                              {value}
                            </span>
                          ) : (
                            <span>{value}</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>

          {/* Bottom CTA row */}
          <div className="flex border-t border-surface-container bg-surface-container-low/50">
            {centers.map((center) => (
              <div
                key={center.id}
                className={`${colWidth} p-5 text-center`}
              >
                <Button
                  className="rounded-full gradient-primary text-white hover:opacity-90 text-xs"
                  size="sm"
                  asChild
                >
                  <Link href={`/inquiry?center=${center.id}`}>
                    Submit Inquiry
                    <ArrowRight className="ml-1.5 h-3 w-3" />
                  </Link>
                </Button>
              </div>
            ))}
          </div>
        </div>

        {/* Disclaimer */}
        <p className="text-[10px] text-muted-foreground text-center mt-6">
          All inquiries are handled confidentially through Rehab-Atlas. We do
          not share your information without your consent.
        </p>
      </div>
    </div>
  );
}

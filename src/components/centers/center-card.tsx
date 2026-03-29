import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { MapPin, Star, Shield, Info } from "lucide-react";
import type { Center, CenterPhoto } from "@/types/center";
import { TrackingLink } from "./tracking-link";

interface CenterCardProps {
  center: Center & { photos?: CenterPhoto[] };
}

export function CenterCard({ center }: CenterCardProps) {
  const location = [center.city, center.state_province, center.country]
    .filter(Boolean)
    .join(", ");

  return (
    <div className="group rounded-2xl bg-surface-container-lowest overflow-hidden shadow-ambient hover:shadow-ambient-lg transition-all duration-300">
      {/* Image */}
      <div className="relative aspect-[4/3] bg-surface-container overflow-hidden">
        {center.photos && center.photos[0] && (
          <img
            src={center.photos[0].url}
            alt={center.photos[0].alt_text || center.name}
            className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        <div className="absolute top-3 left-3">
          {center.verified_profile && !(center as unknown as Record<string, unknown>).is_unclaimed ? (
            <span className="inline-flex items-center gap-1 bg-white/90 backdrop-blur-sm text-xs text-foreground rounded-full px-2.5 py-1">
              <Shield className="h-3 w-3 text-primary" />
              Verified
            </span>
          ) : (center as unknown as Record<string, unknown>).is_unclaimed ? (
            <span className="inline-flex items-center gap-1 bg-amber-50/90 backdrop-blur-sm text-xs text-amber-700 rounded-full px-2.5 py-1">
              <Info className="h-3 w-3" />
              Public listing
            </span>
          ) : null}
        </div>
        {center.rating && (
          <div className="absolute top-3 right-3">
            <span className="inline-flex items-center gap-1 bg-white/90 backdrop-blur-sm text-xs font-medium text-foreground rounded-full px-2.5 py-1">
              <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
              {Number(center.rating).toFixed(1)}
            </span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-5">
        <TrackingLink href={`/centers/${center.slug}`} centerId={center.id} event="card_click">
          <h3 className="font-editorial text-lg font-semibold text-foreground group-hover:text-primary transition-colors duration-300 line-clamp-1">
            {center.name}
          </h3>
        </TrackingLink>

        {location && (
          <p className="flex items-center gap-1 text-xs text-muted-foreground mt-1.5">
            <MapPin className="h-3 w-3 flex-shrink-0" />
            <span className="truncate">{location}</span>
          </p>
        )}

        {center.short_description && (
          <p className="text-xs text-muted-foreground mt-3 line-clamp-2 leading-relaxed">
            {center.short_description}
          </p>
        )}

        {/* Tags */}
        <div className="flex flex-wrap gap-1.5 mt-3">
          {center.treatment_focus.slice(0, 2).map((focus) => (
            <span
              key={focus}
              className="text-[10px] uppercase tracking-wider bg-surface-container-high text-muted-foreground rounded-full px-2.5 py-0.5"
            >
              {focus.replace(/_/g, " ")}
            </span>
          ))}
          {center.setting_type && (
            <span className="text-[10px] uppercase tracking-wider bg-surface-container-high text-muted-foreground rounded-full px-2.5 py-0.5">
              {center.setting_type}
            </span>
          )}
        </div>

        {/* Price + CTA */}
        <div className="flex items-center justify-between mt-4 pt-4">
          <div>
            {center.price_min ? (
              <p className="text-sm font-medium text-foreground">
                ${center.price_min.toLocaleString()}
                {center.price_max && (
                  <span className="text-muted-foreground font-normal">
                    {" "}&ndash; ${center.price_max.toLocaleString()}
                  </span>
                )}
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">Contact for pricing</p>
            )}
          </div>
          <Button
            variant="outline"
            size="sm"
            className="rounded-full ghost-border border-0 text-xs hover:bg-surface-container transition-colors duration-300"
            asChild
          >
            <TrackingLink href={`/centers/${center.slug}`} centerId={center.id} event="card_click">View Profile</TrackingLink>
          </Button>
        </div>

        {/* Inquiry link */}
        <p className="text-[10px] text-muted-foreground mt-2 text-right">
          Send Inquiry via Rehab-Atlas
        </p>
      </div>
    </div>
  );
}

"use client";

import Link from "next/link";
import { trackCenterEvent } from "@/components/shared/view-tracker";

interface TrackingLinkProps {
  href: string;
  centerId: string;
  event: "card_click" | "inquiry_click";
  children: React.ReactNode;
  className?: string;
}

/**
 * A Link that fires a tracking event on click.
 * Non-blocking — tracking runs in background.
 */
export function TrackingLink({ href, centerId, event, children, className }: TrackingLinkProps) {
  return (
    <Link
      href={href}
      className={className}
      onClick={() => trackCenterEvent(centerId, event)}
    >
      {children}
    </Link>
  );
}

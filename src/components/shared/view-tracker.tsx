"use client";

import { useEffect, useRef } from "react";

interface ViewTrackerProps {
  centerId: string;
  event: "profile_view" | "card_click" | "inquiry_click";
}

/**
 * Invisible component that fires a single tracking beacon on mount.
 * Non-blocking — uses keepalive fetch so it doesn't delay page rendering.
 */
export function ViewTracker({ centerId, event }: ViewTrackerProps) {
  const fired = useRef(false);

  useEffect(() => {
    // Fire only once per mount
    if (fired.current) return;
    fired.current = true;

    const payload = JSON.stringify({ center_id: centerId, event });
    try {
      fetch("/api/track", {
        method: "POST",
        body: payload,
        headers: { "Content-Type": "application/json" },
        keepalive: true,
      });
    } catch {
      // Silent — tracking should never break the page
    }
  }, [centerId, event]);

  return null;
}

/**
 * Fire a tracking event imperatively (for click handlers).
 * Non-blocking, fire-and-forget.
 */
export function trackCenterEvent(centerId: string, event: "profile_view" | "card_click" | "inquiry_click") {
  try {
    fetch("/api/track", {
      method: "POST",
      body: JSON.stringify({ center_id: centerId, event }),
      headers: { "Content-Type": "application/json" },
      keepalive: true,
    });
  } catch {
    // Silent
  }
}

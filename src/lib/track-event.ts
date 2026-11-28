import type { TrackedEvent } from "@/lib/pageview";

/**
 * Send one aggregate funnel event (client only). `keepalive` lets the request
 * finish when the click navigates away. Never throws; tracking must not
 * affect the page.
 */
export function trackEvent(event: TrackedEvent): void {
  try {
    if (typeof window === "undefined") return;
    if (navigator.webdriver) return;
    fetch("/api/pageview", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event, path: window.location.pathname }),
      keepalive: true,
    }).catch(() => {});
  } catch {
    // ignore
  }
}

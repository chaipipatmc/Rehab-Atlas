"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { trackEvent } from "@/lib/track-event";

const SESSION_KEY = "rehabatlas_session_id";
const ENTRY_REFERRER_KEY = "rehabatlas_entry_referrer";

function getOrCreateSessionId(): string {
  let sid = sessionStorage.getItem(SESSION_KEY);
  if (!sid) {
    sid = crypto.randomUUID();
    sessionStorage.setItem(SESSION_KEY, sid);
    // Capture the entry referrer once per session — same-origin referrers on
    // SPA navigation would otherwise overwrite real external attribution.
    const entry = document.referrer || "";
    if (!entry || !entry.startsWith(window.location.origin)) {
      sessionStorage.setItem(ENTRY_REFERRER_KEY, entry);
    }
  }
  return sid;
}

function isExcludedPath(pathname: string): boolean {
  return pathname.startsWith("/admin") || pathname.startsWith("/partner") || pathname.startsWith("/auth");
}

/** True when a click target is a link to the assessment (any CTA, any page). */
function isAssessmentLink(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false;
  const anchor = target.closest("a[href]");
  if (!anchor) return false;
  try {
    const url = new URL((anchor as HTMLAnchorElement).href, window.location.href);
    return url.origin === window.location.origin && url.pathname === "/assessment";
  } catch {
    return false;
  }
}

export function PageTracker() {
  const pathname = usePathname();

  // One document-level listener covers every "Start assessment" CTA (header,
  // hero, blog, center pages) without touching each component.
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const here = window.location.pathname;
      if (here === "/assessment" || isExcludedPath(here)) return;
      if (isAssessmentLink(e.target)) trackEvent("cta_assessment_click");
    };
    document.addEventListener("click", onClick, { capture: true });
    return () => document.removeEventListener("click", onClick, { capture: true });
  }, []);

  useEffect(() => {
    if (isExcludedPath(pathname)) return;
    if (navigator.webdriver) return;

    const sessionId = getOrCreateSessionId();
    const entryReferrer = sessionStorage.getItem(ENTRY_REFERRER_KEY) || "";

    fetch("/api/pageview", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        path: pathname,
        session_id: sessionId,
        referrer: entryReferrer,
      }),
    }).catch(() => {});
  }, [pathname]);

  return null;
}

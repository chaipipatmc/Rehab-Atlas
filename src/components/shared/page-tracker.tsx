"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

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

export function PageTracker() {
  const pathname = usePathname();

  useEffect(() => {
    if (pathname.startsWith("/admin") || pathname.startsWith("/partner") || pathname.startsWith("/auth")) return;

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

"use client";

import { useEffect, useState } from "react";
import Script from "next/script";
import { usePathname } from "next/navigation";

const GA_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || "";
const META_PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID || "";

// Cookie consent key
const CONSENT_KEY = "rehabatlas_analytics_consent";

function getConsent(): boolean | null {
  if (typeof window === "undefined") return null;
  const v = localStorage.getItem(CONSENT_KEY);
  if (v === "true") return true;
  if (v === "false") return false;
  return null;
}

// ── Google Analytics page view ──
function gtagPageView(url: string) {
  if (typeof window !== "undefined" && window.gtag) {
    window.gtag("config", GA_ID, { page_path: url });
  }
}

// ── Meta Pixel page view ──
function fbqPageView() {
  if (typeof window !== "undefined" && window.fbq) {
    window.fbq("track", "PageView");
  }
}

// ── Track custom events ──
export function trackEvent(name: string, params?: Record<string, unknown>) {
  if (typeof window !== "undefined") {
    if (window.gtag) window.gtag("event", name, params);
    if (window.fbq) window.fbq("trackCustom", name, params);
  }
}

// ── Track conversions ──
export function trackInquiry(centerId?: string) {
  trackEvent("inquiry_submitted", { center_id: centerId });
  if (typeof window !== "undefined" && window.fbq) {
    window.fbq("track", "Lead", { content_name: centerId || "general" });
  }
}

export function trackAssessmentComplete() {
  trackEvent("assessment_completed");
  if (typeof window !== "undefined" && window.fbq) {
    window.fbq("track", "CompleteRegistration");
  }
}

// ── Analytics Scripts ──
export function Analytics() {
  const pathname = usePathname();
  const [consent, setConsent] = useState<boolean | null>(null);

  useEffect(() => {
    setConsent(getConsent());
  }, []);

  // Track page views on route change
  useEffect(() => {
    if (consent !== true) return;
    gtagPageView(pathname);
    fbqPageView();
  }, [pathname, consent]);

  if (consent !== true) return null;
  if (!GA_ID && !META_PIXEL_ID) return null;

  return (
    <>
      {/* Google Analytics */}
      {GA_ID && (
        <>
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
            strategy="afterInteractive"
          />
          <Script id="gtag-init" strategy="afterInteractive">
            {`
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', '${GA_ID}', { page_path: window.location.pathname });
            `}
          </Script>
        </>
      )}

      {/* Meta Pixel */}
      {META_PIXEL_ID && (
        <Script id="meta-pixel" strategy="afterInteractive">
          {`
            !function(f,b,e,v,n,t,s)
            {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
            n.callMethod.apply(n,arguments):n.queue.push(arguments)};
            if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
            n.queue=[];t=b.createElement(e);t.async=!0;
            t.src=v;s=b.getElementsByTagName(e)[0];
            s.parentNode.insertBefore(t,s)}(window, document,'script',
            'https://connect.facebook.net/en_US/fbevents.js');
            fbq('init', '${META_PIXEL_ID}');
            fbq('track', 'PageView');
          `}
        </Script>
      )}
    </>
  );
}

// ── Cookie Consent Banner ──
export function CookieConsent() {
  const [consent, setConsent] = useState<boolean | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const stored = getConsent();
    setConsent(stored);
    if (stored === null) setVisible(true);
  }, []);

  function accept() {
    localStorage.setItem(CONSENT_KEY, "true");
    setConsent(true);
    setVisible(false);
  }

  function decline() {
    localStorage.setItem(CONSENT_KEY, "false");
    setConsent(false);
    setVisible(false);
  }

  if (!visible || consent !== null) return null;

  return (
    <div className="fixed bottom-0 inset-x-0 z-50 p-4">
      <div className="max-w-lg mx-auto bg-white rounded-2xl shadow-2xl border border-surface-container-high p-5">
        <p className="text-sm text-foreground font-medium">We value your privacy</p>
        <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
          We use cookies and analytics to improve your experience, understand site usage, and support our mission of connecting people with the right care. No personal health data is shared with advertisers.
        </p>
        <div className="flex items-center gap-2 mt-4">
          <button
            onClick={accept}
            className="flex-1 px-4 py-2 rounded-full bg-[#45636b] text-white text-xs font-medium hover:bg-[#3a545b] transition-colors"
          >
            Accept
          </button>
          <button
            onClick={decline}
            className="flex-1 px-4 py-2 rounded-full bg-surface-container text-muted-foreground text-xs font-medium hover:bg-surface-container-high transition-colors"
          >
            Decline
          </button>
        </div>
        <p className="text-[10px] text-muted-foreground mt-2 text-center">
          <a href="/pages/privacy-policy" className="text-primary hover:underline">Privacy Policy</a>
        </p>
      </div>
    </div>
  );
}

// Type declarations for window globals
declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    fbq?: (...args: unknown[]) => void;
    dataLayer?: unknown[];
  }
}

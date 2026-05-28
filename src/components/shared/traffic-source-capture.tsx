"use client";

import { useEffect } from "react";
import { captureTrafficSource } from "@/lib/traffic-source";

/**
 * Fire-and-forget client component that captures traffic source (UTMs +
 * referrer + landing path) on the visitor's first hit and stashes it in
 * sessionStorage. The assessment page then reads it back at submit time so
 * conversions can be attributed to the channel that brought the visitor in.
 */
export function TrafficSourceCapture() {
  useEffect(() => {
    captureTrafficSource();
  }, []);
  return null;
}

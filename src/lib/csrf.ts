import { NextResponse } from "next/server";

/**
 * Validate Origin/Referer header to prevent CSRF attacks.
 * Returns null if valid, or a 403 NextResponse if invalid.
 */
export function validateOrigin(request: Request): NextResponse | null {
  const origin = request.headers.get("origin");
  const referer = request.headers.get("referer");
  const host = request.headers.get("host");

  // In development, allow localhost
  if (process.env.NODE_ENV === "development") return null;

  // At least one of origin or referer must be present
  if (!origin && !referer) {
    return NextResponse.json(
      { error: "Forbidden" },
      { status: 403 }
    );
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  const allowedOrigins = new Set<string>();

  if (appUrl) {
    try {
      allowedOrigins.add(new URL(appUrl).origin);
    } catch { /* ignore invalid URL */ }
  }

  if (host) {
    allowedOrigins.add(`https://${host}`);
    allowedOrigins.add(`http://${host}`);
  }

  // Check origin header
  if (origin && !allowedOrigins.has(origin)) {
    return NextResponse.json(
      { error: "Forbidden" },
      { status: 403 }
    );
  }

  // If no origin, check referer
  if (!origin && referer) {
    try {
      const refererOrigin = new URL(referer).origin;
      if (!allowedOrigins.has(refererOrigin)) {
        return NextResponse.json(
          { error: "Forbidden" },
          { status: 403 }
        );
      }
    } catch {
      return NextResponse.json(
        { error: "Forbidden" },
        { status: 403 }
      );
    }
  }

  return null;
}

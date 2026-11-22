/**
 * Signed assessment session cookie (`<sessionId>.<sig16>`), HMAC-SHA256.
 * One implementation for the assessment API, results page and inquiry page,
 * verified in constant time.
 */

import { createHmac } from "crypto";
import { safeEqual } from "@/lib/secrets";

function signatureFor(sessionId: string, hmacKey: string): string {
  return createHmac("sha256", hmacKey).update(sessionId).digest("hex").slice(0, 16);
}

/** Cookie value for a session id. */
export function signAssessmentSession(sessionId: string, hmacKey: string): string {
  return `${sessionId}.${signatureFor(sessionId, hmacKey)}`;
}

/** The session id when the cookie signature is valid, otherwise null. */
export function verifyAssessmentSession(cookieValue: string, hmacKey: string): string | null {
  const [sessionId, sig] = cookieValue.split(".");
  return safeEqual(sig ?? "", signatureFor(sessionId, hmacKey)) ? sessionId : null;
}

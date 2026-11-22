/**
 * Shared-secret helpers — the single place where env secrets are read for
 * comparison and where secrets are compared.
 *
 * Enforced by lint (rehab/timing-safe-secret-compare): never compare a secret,
 * signature or digest with === / !==; call safeEqual() instead.
 */

import { timingSafeEqual } from "crypto";

/**
 * Read a shared secret from env, trimmed of surrounding whitespace/newlines
 * (values pasted via `pbcopy` etc. often carry a trailing "\n").
 * Empty after trim = not configured = null (callers fail closed).
 */
export function readSecretEnv(name: string): string | null {
  const v = (process.env[name] ?? "").trim();
  return v.length > 0 ? v : null;
}

/** Constant-time string comparison (false on length mismatch). */
export function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

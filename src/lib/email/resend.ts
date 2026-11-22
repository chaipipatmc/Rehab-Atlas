import { Resend } from "resend";

/**
 * Non-secret stand-in used only when RESEND_API_KEY is unset (e.g. local
 * `next build`): the Resend constructor throws without a key, and sends made
 * with this value are rejected by Resend, so mail fails closed.
 */
const MISSING_KEY_PLACEHOLDER = "re_placeholder_missing_key";

/**
 * The only place a Resend client is constructed (lint: no `new Resend()`
 * elsewhere). Keeps the key handling — and its missing-key behaviour — in one spot.
 */
export function createResendClient(): Resend {
  return new Resend(process.env.RESEND_API_KEY || MISSING_KEY_PLACEHOLDER);
}

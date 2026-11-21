/**
 * Outreach Policy Guards
 *
 * Central place for the rules every outbound partner email must pass:
 *   1. Excluded centers (related parties, e.g. The Hills Rehab) never enter
 *      the outreach pipeline and can never be emailed.
 *   2. Every outreach email carries an opt-out line; a reply containing
 *      "unsubscribe" marks the pipeline as opted out.
 *   3. The daily send cap (site_settings.outreach_daily_email_limit) is checked
 *      before EVERY email. If the count or the limit cannot be read, sending
 *      stops (fail-closed).
 *   4. Nothing here sends on its own — all agent-generated emails are queued
 *      as agent_tasks and only go out after an admin approves them.
 */

import { createAdminClient } from "@/lib/supabase/admin";
import { logAgentAction } from "@/lib/agents/base";
import { sendEmail, getDailySendCount, type SendEmailResult } from "./gmail";

// ── 1. Exclusion list ──────────────────────────────────────────────────────
//
// Edit this list to keep a center out of outreach. Matching is
// case-insensitive. Extra entries can also be added at runtime (no deploy)
// via site_settings key `outreach_excluded_centers` — a comma-separated list
// of name fragments, slugs or domains.

export const OUTREACH_EXCLUSIONS = {
  /** Substrings matched against the normalized center name. */
  nameContains: ["the hills rehab", "the hills chiang mai"],
  /** Exact center slugs or slug prefixes. */
  slugPrefixes: ["the-hills-rehab", "the-hills-chiang-mai"],
  /** Email / website domains (subdomains included). */
  domains: ["thehillsrehabchiangmai.com"],
  /** Why these are excluded — stored on the pipeline when we skip them. */
  reason: "related-party (owner-affiliated center) — excluded from outreach",
};

const RUNTIME_EXCLUSIONS_KEY = "outreach_excluded_centers";

export interface ExclusionCandidate {
  name?: string | null;
  slug?: string | null;
  email?: string | null;
  inquiry_email?: string | null;
  website_url?: string | null;
}

function normalize(s: string | null | undefined): string {
  return (s || "").toLowerCase().replace(/\s+/g, " ").trim();
}

function domainOf(value: string | null | undefined): string {
  const v = normalize(value);
  if (!v) return "";
  if (v.includes("@")) return v.split("@").pop() || "";
  try {
    return new URL(v.startsWith("http") ? v : `https://${v}`).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

function domainMatches(domain: string, blocked: string): boolean {
  return !!domain && (domain === blocked || domain.endsWith(`.${blocked}`));
}

async function getRuntimeExclusions(): Promise<string[]> {
  try {
    const admin = createAdminClient();
    const { data } = await admin
      .from("site_settings")
      .select("value")
      .eq("key", RUNTIME_EXCLUSIONS_KEY)
      .maybeSingle();
    const raw = (data?.value as string) || "";
    return raw
      .split(",")
      .map((p) => normalize(p))
      .filter(Boolean);
  } catch {
    return [];
  }
}

/**
 * Returns a reason string if the center/recipient is excluded, else null.
 */
export async function getExclusionReason(c: ExclusionCandidate): Promise<string | null> {
  const name = normalize(c.name);
  const slug = normalize(c.slug);
  const domains = [c.email, c.inquiry_email, c.website_url].map(domainOf).filter(Boolean);

  if (OUTREACH_EXCLUSIONS.nameContains.some((n) => name.includes(n))) return OUTREACH_EXCLUSIONS.reason;
  if (OUTREACH_EXCLUSIONS.slugPrefixes.some((p) => slug.startsWith(p))) return OUTREACH_EXCLUSIONS.reason;
  if (domains.some((d) => OUTREACH_EXCLUSIONS.domains.some((b) => domainMatches(d, b)))) {
    return OUTREACH_EXCLUSIONS.reason;
  }

  const runtime = await getRuntimeExclusions();
  for (const term of runtime) {
    if (
      (name && name.includes(term)) ||
      (slug && slug.startsWith(term)) ||
      domains.some((d) => domainMatches(d, term))
    ) {
      return `excluded via site_settings.${RUNTIME_EXCLUSIONS_KEY} ("${term}")`;
    }
  }
  return null;
}

/**
 * Look up a center and return an exclusion reason (or null).
 * Fails closed: if the center cannot be read, it is treated as excluded.
 */
export async function getCenterExclusionReason(centerId: string): Promise<string | null> {
  const admin = createAdminClient();
  const { data: center, error } = await admin
    .from("centers")
    .select("name, slug, email, inquiry_email, website_url")
    .eq("id", centerId)
    .maybeSingle();
  if (error || !center) return "center lookup failed (fail-closed)";
  return getExclusionReason(center as ExclusionCandidate);
}

/**
 * Park an excluded pipeline entry so no agent picks it up again.
 */
export async function markPipelineExcluded(pipelineId: string, reason: string): Promise<void> {
  const admin = createAdminClient();
  await admin
    .from("outreach_pipeline")
    .update({
      stage: "declined",
      next_follow_up_at: null,
      notes: `${EXCLUDED_MARKER} ${reason}`,
    })
    .eq("id", pipelineId);
  await logAgentAction({
    agent_type: "outreach_orchestrator",
    action: "pipeline_excluded",
    details: { pipeline_id: pipelineId, reason },
  });
}

// ── 2. Opt-out ─────────────────────────────────────────────────────────────

/** Marker written to outreach_pipeline.notes when a center opts out. */
export const OPTED_OUT_MARKER = "[opted_out]";
export const EXCLUDED_MARKER = "[excluded]";

export const UNSUBSCRIBE_LINE =
  "If you'd prefer not to hear from us again, just reply 'unsubscribe' and we'll stop emailing you.";

/** Append the opt-out line once (idempotent). */
export function withUnsubscribeFooter(body: string): string {
  if (/reply\s+['"‘’“”]?unsubscribe/i.test(body)) return body;
  return `${body.trimEnd()}\n\n--\n${UNSUBSCRIBE_LINE}`;
}

/**
 * Strip quoted history from a reply so our own footer text in the quoted
 * original does not trigger a false opt-out.
 */
export function stripQuotedReply(body: string): string {
  const cutPatterns = [
    /^On .+wrote:\s*$/im,
    /^-{2,}\s*Original Message\s*-{2,}/im,
    /^From:\s.+$/im,
    /^_{5,}\s*$/m,
  ];
  let text = body || "";
  for (const p of cutPatterns) {
    const m = text.match(p);
    if (m && m.index !== undefined) text = text.slice(0, m.index);
  }
  return text
    .split(/\r?\n/)
    .filter((line) => !line.trim().startsWith(">"))
    .join("\n")
    .replace(UNSUBSCRIBE_LINE, "");
}

const OPT_OUT_PATTERN =
  /\b(unsubscribe|opt[\s-]?out|remove me|take me off|stop (emailing|contacting|sending)|do not (contact|email)|don'?t (contact|email))\b/i;

export function isOptOutReply(body: string): boolean {
  return OPT_OUT_PATTERN.test(stripQuotedReply(body));
}

export function isOptedOutNotes(notes: string | null | undefined): boolean {
  return !!notes && (notes.includes(OPTED_OUT_MARKER) || notes.includes(EXCLUDED_MARKER));
}

// ── 3. Daily cap (fail-closed) ─────────────────────────────────────────────

export const DEFAULT_DAILY_EMAIL_LIMIT = 10;

/** Returns the configured limit, or null if it cannot be read/parsed. */
export async function getOutreachDailyLimit(): Promise<number | null> {
  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("site_settings")
      .select("value")
      .eq("key", "outreach_daily_email_limit")
      .maybeSingle();
    if (error) return null;
    if (!data || data.value === null || data.value === undefined || data.value === "") {
      return DEFAULT_DAILY_EMAIL_LIMIT;
    }
    const n = parseInt(String(data.value), 10);
    return Number.isFinite(n) && n >= 0 ? n : null;
  } catch {
    return null;
  }
}

/**
 * Outbound outreach emails logged today (UTC) in outreach_emails.
 * Returns null on query error.
 */
async function getLoggedSendCountToday(): Promise<number | null> {
  try {
    const admin = createAdminClient();
    const start = new Date();
    start.setUTCHours(0, 0, 0, 0);
    const { count, error } = await admin
      .from("outreach_emails")
      .select("id", { count: "exact", head: true })
      .eq("direction", "outbound")
      .gte("sent_at", start.toISOString());
    if (error || count === null) return null;
    return count;
  } catch {
    return null;
  }
}

export type SendCheck =
  | { ok: true; sentToday: number; limit: number }
  | { ok: false; reason: string };

/** Check the daily cap. Any read failure blocks sending. */
export async function checkDailyCap(): Promise<SendCheck> {
  const limit = await getOutreachDailyLimit();
  if (limit === null) return { ok: false, reason: "daily limit could not be read (fail-closed)" };

  const [gmailCount, loggedCount] = await Promise.all([getDailySendCount(), getLoggedSendCountToday()]);
  if (gmailCount === null) return { ok: false, reason: "Gmail send count unavailable (fail-closed)" };
  if (loggedCount === null) return { ok: false, reason: "outreach_emails count unavailable (fail-closed)" };

  const sentToday = Math.max(gmailCount, loggedCount);
  if (sentToday >= limit) {
    return { ok: false, reason: `daily limit reached (${sentToday}/${limit})` };
  }
  return { ok: true, sentToday, limit };
}

// ── 4. Guarded send ────────────────────────────────────────────────────────

export class OutreachBlockedError extends Error {
  /**
   * "global"    → no email can go out right now (daily cap reached or the
   *               cap could not be verified). Callers should stop the batch.
   * "recipient" → only this recipient/pipeline is blocked (excluded, opted out).
   */
  constructor(
    public readonly reason: string,
    public readonly scope: "global" | "recipient" = "recipient"
  ) {
    super(`Outreach email blocked: ${reason}`);
    this.name = "OutreachBlockedError";
  }
}

/**
 * The ONLY way outreach code should send an email to a center.
 * Call it only from an admin-approval path. Throws OutreachBlockedError when
 * a policy check fails; nothing is sent in that case.
 */
export async function sendOutreachEmail(params: {
  to: string;
  subject: string;
  bodyText: string;
  threadId?: string;
  pipelineId?: string;
}): Promise<SendEmailResult | null> {
  const to = (params.to.match(/<([^>]+)>/)?.[1] || params.to).trim();
  if (!to) throw new OutreachBlockedError("missing recipient");

  // Exclusion by recipient domain
  const excluded = await getExclusionReason({ email: to });
  if (excluded) throw new OutreachBlockedError(excluded);

  // Opt-out / excluded pipeline
  if (params.pipelineId) {
    const admin = createAdminClient();
    const { data: pipeline, error } = await admin
      .from("outreach_pipeline")
      .select("notes, center_id")
      .eq("id", params.pipelineId)
      .maybeSingle();
    if (error) throw new OutreachBlockedError("pipeline lookup failed (fail-closed)");
    if (pipeline && isOptedOutNotes(pipeline.notes as string | null)) {
      throw new OutreachBlockedError("center opted out / excluded");
    }
    if (pipeline?.center_id) {
      const centerExcluded = await getCenterExclusionReason(pipeline.center_id as string);
      if (centerExcluded) throw new OutreachBlockedError(centerExcluded);
    }
  }

  // Daily cap — checked for every single email
  const cap = await checkDailyCap();
  if (!cap.ok) {
    await logAgentAction({
      agent_type: "outreach_orchestrator",
      action: "send_blocked",
      details: { reason: cap.reason, pipeline_id: params.pipelineId || null },
    });
    throw new OutreachBlockedError(cap.reason, "global");
  }

  return sendEmail({
    to,
    subject: params.subject,
    bodyText: withUnsubscribeFooter(params.bodyText),
    threadId: params.threadId,
  });
}

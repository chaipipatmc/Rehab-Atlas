/**
 * Pure decision logic for an analysed inbound outreach reply.
 * Kept free of Supabase / Claude imports so it can be unit-tested.
 *
 * Rule (board 2026-11-23): the AI may only move a center to "terms_agreed"
 * when the reply explicitly accepts our terms / agreement. Wanting to join,
 * asking to update a profile, or a friendly reply is NOT acceptance.
 * Acceptance needs both the model's flag AND a verbatim quote from the
 * reply that we can find in the reply text — otherwise it is ignored.
 */

import { z } from "zod";

export const responseAnalysisSchema = z.object({
  sentiment: z.enum(["positive", "neutral", "negative", "question"]),
  summary: z.string(),
  key_points: z.array(z.string()),
  /** Interested in being listed / joining (NOT acceptance of terms). */
  wants_to_join: z.boolean(),
  /** True only if the reply explicitly accepts our terms or agreement. */
  explicitly_accepted_terms: z.boolean(),
  /** Exact sentence copied from the reply that shows that acceptance. */
  terms_acceptance_quote: z.string().nullable(),
  has_questions: z.boolean(),
  counter_offer_rate: z.number().nullable(),
  suggested_reply: z.string().nullable(),
});

export type ResponseAnalysis = z.infer<typeof responseAnalysisSchema>;

/** Stages the response handler keeps reading replies for. */
export const REPLY_WATCH_STAGES = [
  "outreach_sent",
  "followed_up",
  "responded",
  "negotiating",
  "terms_agreed",
] as const;

const MIN_QUOTE_LENGTH = 8;

function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Explicit acceptance = model flag + a quote that really appears in the
 * reply body. A flag without evidence (or with an invented quote) is ignored.
 */
export function isExplicitTermsAcceptance(
  analysis: Pick<ResponseAnalysis, "explicitly_accepted_terms" | "terms_acceptance_quote"> | null,
  replyBody: string,
): boolean {
  if (!analysis?.explicitly_accepted_terms) return false;
  const quote = normalize(analysis.terms_acceptance_quote ?? "");
  if (quote.length < MIN_QUOTE_LENGTH) return false;
  return normalize(replyBody).includes(quote);
}

export interface ReplyOutcome {
  nextStage: "terms_agreed" | "declined" | "negotiating" | "responded";
  declined: boolean;
  termsAccepted: boolean;
  /** Queue a drafted reply for admin approval. */
  draftReply: boolean;
  /** Queue an admin task to invite the contact as a partner. */
  partnerInvite: boolean;
}

export function decideReplyOutcome(
  analysis: ResponseAnalysis | null,
  ctx: { replyBody: string; currentStage: string; hasPartnerAccount: boolean },
): ReplyOutcome {
  const termsAccepted = isExplicitTermsAcceptance(analysis, ctx.replyBody);
  const sentiment = analysis?.sentiment ?? "neutral";
  const hasQuestions = analysis?.has_questions === true;
  const wantsToJoin = analysis?.wants_to_join === true;
  const alreadyAgreed = ctx.currentStage === "terms_agreed";

  const declined = sentiment === "negative" && !hasQuestions && !wantsToJoin && !termsAccepted;

  let nextStage: ReplyOutcome["nextStage"];
  if (declined) nextStage = "declined";
  else if (termsAccepted || alreadyAgreed) nextStage = "terms_agreed"; // never downgrade an agreement
  else if (hasQuestions) nextStage = "negotiating";
  else nextStage = "responded";

  const draftReply =
    !declined &&
    (hasQuestions || ((termsAccepted || wantsToJoin) && Boolean(analysis?.suggested_reply)));

  // Invite only on a real, new agreement and only if no partner account exists yet.
  const partnerInvite = termsAccepted && !alreadyAgreed && !ctx.hasPartnerAccount;

  return { nextStage, declined, termsAccepted, draftReply, partnerInvite };
}

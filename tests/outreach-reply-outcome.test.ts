/**
 * Outreach reply → stage (board 2026-11-23): the AI may only set
 * "terms_agreed" when the reply explicitly accepts the terms. Wanting to join
 * or asking for profile changes is not acceptance, and no partner invite task
 * is created for it (or when the center already has a partner account).
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ResponseAnalysis } from "@/lib/agents/outreach/reply-outcome";

type Row = Record<string, unknown>;
const db: {
  pipeline: Row;
  partnerCount: number;
  pipelineUpdates: Row[];
} = { pipeline: {}, partnerCount: 0, pipelineUpdates: [] };

function query(table: string) {
  const q = {
    select: () => q,
    insert: async () => ({ data: null, error: null }),
    update: (values: Row) => {
      if (table === "outreach_pipeline") db.pipelineUpdates.push(values);
      return q;
    },
    eq: () => q,
    in: () => q,
    or: () => q,
    single: async () => {
      if (table === "outreach_pipeline") return { data: db.pipeline, error: null };
      if (table === "centers") return { data: { name: "Example Recovery" }, error: null };
      return { data: null, error: null };
    },
    then: (resolve: (v: unknown) => void) =>
      resolve(
        table === "profiles"
          ? { count: db.partnerCount, error: null }
          : { data: null, error: null }
      ),
  };
  return q;
}

const REPLY = {
  id: "msg-1",
  from: "Admissions <admissions@example-recovery.org>",
  subject: "Re: Join Rehab-Atlas",
  body: "",
  date: "2026-11-23T10:00:00Z",
};

vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => ({ from: query }) }));
vi.mock("@/lib/agents/base", () => ({
  createAgentTask: vi.fn(async () => ({ id: "task-1" })),
  logAgentAction: vi.fn(async () => {}),
}));
vi.mock("@/lib/agents/claude", () => ({ analyzeWithClaude: vi.fn(async () => null) }));
vi.mock("@/lib/agents/outreach/persona", () => ({
  resolvePersona: vi.fn(async () => "The Rehab-Atlas Team"),
}));
vi.mock("@/lib/agents/outreach/gmail", () => ({
  getLatestInboundReply: vi.fn(async () => REPLY),
  sendEmail: vi.fn(async () => {
    throw new Error("must not send");
  }),
  getDailySendCount: vi.fn(async () => 0),
}));

const base = await import("@/lib/agents/base");
const claude = await import("@/lib/agents/claude");
const gmail = await import("@/lib/agents/outreach/gmail");
const { processThreadReply } = await import("@/lib/agents/outreach/response-handler");
const { decideReplyOutcome, isExplicitTermsAcceptance, REPLY_WATCH_STAGES } = await import(
  "@/lib/agents/outreach/reply-outcome"
);
const createAgentTask = vi.mocked(base.createAgentTask);
const analyzeWithClaude = vi.mocked(claude.analyzeWithClaude);

function analysis(overrides: Partial<ResponseAnalysis>): ResponseAnalysis {
  return {
    sentiment: "positive",
    summary: "Reply",
    key_points: [],
    wants_to_join: false,
    explicitly_accepted_terms: false,
    terms_acceptance_quote: null,
    has_questions: false,
    counter_offer_rate: null,
    suggested_reply: null,
    ...overrides,
  };
}

const JOIN_WITH_QUESTIONS =
  "Thanks for reaching out. Could you change our listing name to Example Recovery Lisbon? " +
  "We also run a second center — can we add it to the platform too?";
const ACCEPTS_TERMS =
  "Thank you for the details. We accept the terms and agree to the partnership agreement. Please go ahead.";

async function run(body: string, result: ResponseAnalysis, stage = "outreach_sent") {
  REPLY.body = body;
  db.pipeline = {
    id: "p-1",
    center_id: "c-1",
    stage,
    outreach_thread_id: "t-1",
    outreach_sent_at: "2026-11-20T00:00:00Z",
    responded_at: null,
    created_at: "2026-11-19T00:00:00Z",
    notes: null,
  };
  analyzeWithClaude.mockResolvedValueOnce(result);
  await processThreadReply("t-1");
  return {
    stage: db.pipelineUpdates.at(-1)?.stage,
    inviteTasks: createAgentTask.mock.calls.filter(([t]) => t.entity_type === "outreach_partner_invite"),
    draftTasks: createAgentTask.mock.calls.filter(([t]) => t.entity_type === "outreach_pipeline"),
  };
}

beforeEach(() => {
  db.partnerCount = 0;
  db.pipelineUpdates = [];
  createAgentTask.mockClear();
  analyzeWithClaude.mockReset();
});

describe("response handler stage decision", () => {
  it("join + questions, no terms → negotiating, no invite task (even if the model claims agreement)", async () => {
    const r = await run(
      JOIN_WITH_QUESTIONS,
      analysis({
        wants_to_join: true,
        has_questions: true,
        // Model over-reaches: flag set but nothing in the reply accepts terms.
        explicitly_accepted_terms: true,
        terms_acceptance_quote: "We accept the terms",
        suggested_reply: "Thanks — we will update the name and add your second center.",
      })
    );
    expect(r.stage).toBe("negotiating");
    expect(r.inviteTasks).toHaveLength(0);
    expect(r.draftTasks).toHaveLength(1);
    expect(vi.mocked(gmail.sendEmail)).not.toHaveBeenCalled();
  });

  it("join without questions or terms → responded, no invite task", async () => {
    const r = await run(
      "Sounds good, happy to be listed.",
      analysis({ wants_to_join: true })
    );
    expect(r.stage).toBe("responded");
    expect(r.inviteTasks).toHaveLength(0);
  });

  it("explicit acceptance of terms → terms_agreed + invite task when no partner account", async () => {
    const r = await run(
      ACCEPTS_TERMS,
      analysis({
        wants_to_join: true,
        explicitly_accepted_terms: true,
        terms_acceptance_quote: "We accept the terms and agree to the partnership agreement.",
      })
    );
    expect(r.stage).toBe("terms_agreed");
    expect(r.inviteTasks).toHaveLength(1);
  });

  it("explicit acceptance but partner account already exists → terms_agreed, no invite task", async () => {
    db.partnerCount = 1;
    const r = await run(
      ACCEPTS_TERMS,
      analysis({
        explicitly_accepted_terms: true,
        terms_acceptance_quote: "we accept the terms",
      })
    );
    expect(r.stage).toBe("terms_agreed");
    expect(r.inviteTasks).toHaveLength(0);
  });

  it("a later question after terms_agreed keeps the stage and creates no new invite", async () => {
    const r = await run(
      "Quick question: how do we upload photos?",
      analysis({ sentiment: "question", has_questions: true }),
      "terms_agreed"
    );
    expect(r.stage).toBe("terms_agreed");
    expect(r.inviteTasks).toHaveLength(0);
  });

  it("never writes commission fields to the pipeline", async () => {
    await run(
      ACCEPTS_TERMS,
      analysis({ explicitly_accepted_terms: true, terms_acceptance_quote: "We accept the terms", counter_offer_rate: 12 })
    );
    for (const update of db.pipelineUpdates) {
      expect(Object.keys(update).some((k) => k.includes("commission"))).toBe(false);
    }
  });
});

describe("reply-outcome helpers", () => {
  it("requires the acceptance quote to appear in the reply", () => {
    const flagged = { explicitly_accepted_terms: true, terms_acceptance_quote: "We accept the terms" };
    expect(isExplicitTermsAcceptance(flagged, "Please rename our profile.")).toBe(false);
    expect(isExplicitTermsAcceptance(flagged, "Hi,\n\nwe   accept the terms. Thanks")).toBe(true);
    expect(isExplicitTermsAcceptance({ ...flagged, terms_acceptance_quote: "ok" }, "ok")).toBe(false);
    expect(isExplicitTermsAcceptance({ ...flagged, explicitly_accepted_terms: false }, ACCEPTS_TERMS)).toBe(false);
    expect(isExplicitTermsAcceptance(null, ACCEPTS_TERMS)).toBe(false);
  });

  it("falls back to responded when analysis is unavailable", () => {
    const o = decideReplyOutcome(null, { replyBody: ACCEPTS_TERMS, currentStage: "outreach_sent", hasPartnerAccount: false });
    expect(o).toMatchObject({ nextStage: "responded", termsAccepted: false, partnerInvite: false });
  });

  it("keeps reading replies for centers at terms_agreed", () => {
    expect(REPLY_WATCH_STAGES).toContain("terms_agreed");
  });
});

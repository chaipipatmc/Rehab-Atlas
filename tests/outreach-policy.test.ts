/**
 * Outreach guard rails (board decision D6 + related-party rule):
 * nothing reaches the raw Gmail sender unless the recipient is not excluded
 * (The Hills), has not opted out, and the daily cap can be read and is not hit.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

type Row = Record<string, unknown> | null;
const db: {
  settings: Record<string, string>;
  pipeline: Row;
  center: Row;
  loggedCount: number | null;
} = { settings: {}, pipeline: null, center: null, loggedCount: 0 };

function query(table: string) {
  const eqs: Record<string, unknown> = {};
  const q = {
    select: () => q,
    update: () => q,
    gte: () => q,
    eq: (k: string, v: unknown) => {
      eqs[k] = v;
      return q;
    },
    maybeSingle: async () => {
      if (table === "site_settings") {
        const key = String(eqs.key);
        return { data: key in db.settings ? { value: db.settings[key] } : null, error: null };
      }
      if (table === "outreach_pipeline") return { data: db.pipeline, error: null };
      if (table === "centers") return { data: db.center, error: null };
      return { data: null, error: null };
    },
    then: (resolve: (v: unknown) => void) =>
      resolve(
        table === "outreach_emails"
          ? db.loggedCount === null
            ? { count: null, error: { message: "boom" } }
            : { count: db.loggedCount, error: null }
          : { data: null, error: null }
      ),
  };
  return q;
}

vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => ({ from: query }) }));
vi.mock("@/lib/agents/base", () => ({ logAgentAction: vi.fn(async () => {}) }));
vi.mock("@/lib/agents/outreach/gmail", () => ({
  sendEmail: vi.fn(async () => ({ messageId: "m-1", threadId: "t-1" })),
  getDailySendCount: vi.fn(async () => 0),
}));

const gmail = await import("@/lib/agents/outreach/gmail");
const policy = await import("@/lib/agents/outreach/policy");
const sendEmail = vi.mocked(gmail.sendEmail);
const getDailySendCount = vi.mocked(gmail.getDailySendCount);

const OK_EMAIL = { to: "Admissions <hello@example-recovery.org>", subject: "Hello", bodyText: "Body" };

beforeEach(() => {
  db.settings = { outreach_daily_email_limit: "10" };
  db.pipeline = null;
  db.center = null;
  db.loggedCount = 0;
  sendEmail.mockClear();
  getDailySendCount.mockReset();
  getDailySendCount.mockResolvedValue(0);
});

describe("exclusions (The Hills is never contacted)", () => {
  it.each([
    { name: "The Hills Rehab Chiang Mai" },
    { slug: "the-hills-rehab-chiang-mai" },
    { website_url: "https://www.thehillsrehabchiangmai.com/en/" },
    { email: "info@thehillsrehabchiangmai.com" },
    { inquiry_email: "admissions@mail.thehillsrehabchiangmai.com" },
  ])("excludes %o", async (candidate) => {
    expect(await policy.getExclusionReason(candidate)).toMatch(/related-party/);
  });

  it("does not exclude an unrelated center", async () => {
    expect(
      await policy.getExclusionReason({ name: "Solace Asia", website_url: "https://solaceasia.org" })
    ).toBeNull();
  });

  it("honours runtime exclusions from site_settings", async () => {
    db.settings.outreach_excluded_centers = "solace asia, example-recovery.org";
    expect(await policy.getExclusionReason({ name: "Solace Asia" })).toMatch(/site_settings/);
    expect(await policy.getExclusionReason({ email: "x@example-recovery.org" })).toMatch(/site_settings/);
  });
});

describe("sendOutreachEmail guard", () => {
  it("blocks an excluded recipient before anything is sent", async () => {
    await expect(
      policy.sendOutreachEmail({ ...OK_EMAIL, to: "info@thehillsrehabchiangmai.com" })
    ).rejects.toBeInstanceOf(policy.OutreachBlockedError);
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it("blocks a pipeline whose center is excluded", async () => {
    db.pipeline = { notes: null, center_id: "c-hills" };
    db.center = { name: "The Hills Rehab", slug: "the-hills-rehab", email: null, inquiry_email: null, website_url: null };
    await expect(policy.sendOutreachEmail({ ...OK_EMAIL, pipelineId: "p-1" })).rejects.toBeInstanceOf(
      policy.OutreachBlockedError
    );
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it("blocks an opted-out pipeline", async () => {
    db.pipeline = { notes: `${policy.OPTED_OUT_MARKER} replied unsubscribe`, center_id: null };
    await expect(policy.sendOutreachEmail({ ...OK_EMAIL, pipelineId: "p-1" })).rejects.toThrow(/opted out/);
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it("stops the whole batch when the daily cap is reached", async () => {
    db.settings.outreach_daily_email_limit = "2";
    getDailySendCount.mockResolvedValue(2);
    const err = await policy.sendOutreachEmail(OK_EMAIL).catch((e) => e);
    expect(err).toBeInstanceOf(policy.OutreachBlockedError);
    expect(err.scope).toBe("global");
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it("counts the larger of Gmail and the outreach_emails log", async () => {
    db.settings.outreach_daily_email_limit = "3";
    db.loggedCount = 3;
    await expect(policy.sendOutreachEmail(OK_EMAIL)).rejects.toThrow(/daily limit reached/);
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it.each([
    ["Gmail count unavailable", () => getDailySendCount.mockResolvedValue(null)],
    ["outreach_emails count unavailable", () => (db.loggedCount = null)],
    ["limit unparseable", () => (db.settings.outreach_daily_email_limit = "abc")],
  ])("fails closed when %s", async (_label, arrange) => {
    arrange();
    const err = await policy.sendOutreachEmail(OK_EMAIL).catch((e) => e);
    expect(err).toBeInstanceOf(policy.OutreachBlockedError);
    expect(err.scope).toBe("global");
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it("sends exactly once, to the bare address, with the unsubscribe footer", async () => {
    await policy.sendOutreachEmail({ ...OK_EMAIL, threadId: "th-1" });
    expect(sendEmail).toHaveBeenCalledTimes(1);
    const arg = sendEmail.mock.calls[0][0];
    expect(arg.to).toBe("hello@example-recovery.org");
    expect(arg.threadId).toBe("th-1");
    expect(arg.bodyText).toContain(policy.UNSUBSCRIBE_LINE);
  });

  it("uses the default cap (10) when the setting is missing", async () => {
    delete db.settings.outreach_daily_email_limit;
    getDailySendCount.mockResolvedValue(policy.DEFAULT_DAILY_EMAIL_LIMIT);
    await expect(policy.sendOutreachEmail(OK_EMAIL)).rejects.toThrow(/daily limit reached \(10\/10\)/);
  });
});

describe("opt-out detection", () => {
  it("detects unsubscribe in the reply but not in our quoted footer", () => {
    expect(policy.isOptOutReply("Please remove me from your list")).toBe(true);
    const quoted = `Thanks, sounds good!\n\nOn Mon, 1 Jan 2026 Rehab-Atlas wrote:\n> ${policy.UNSUBSCRIBE_LINE}`;
    expect(policy.isOptOutReply(quoted)).toBe(false);
  });

  it("adds the footer once", () => {
    const once = policy.withUnsubscribeFooter("Hello");
    expect(policy.withUnsubscribeFooter(once)).toBe(once);
  });
});

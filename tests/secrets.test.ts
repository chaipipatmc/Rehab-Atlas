import { afterEach, describe, expect, it, vi } from "vitest";
import { readSecretEnv, safeEqual } from "@/lib/secrets";

// base.ts reads AGENT_WEBHOOK_SECRET at import time → import fresh per test.
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => ({}) }));

const SECRET = "0123456789abcdef0123456789abcdef";

function req(headers: Record<string, string>): Request {
  return new Request("https://example.test/api/agents/x", { method: "POST", headers });
}

describe("readSecretEnv", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("trims pasted newlines and whitespace", () => {
    vi.stubEnv("TEST_SECRET_X", `  ${SECRET}\n`);
    expect(readSecretEnv("TEST_SECRET_X")).toBe(SECRET);
  });

  it("treats empty / whitespace-only as not configured", () => {
    vi.stubEnv("TEST_SECRET_X", " \n");
    expect(readSecretEnv("TEST_SECRET_X")).toBeNull();
    expect(readSecretEnv("TEST_SECRET_UNSET_XYZ")).toBeNull();
  });
});

describe("safeEqual", () => {
  it("matches equal strings only", () => {
    expect(safeEqual(SECRET, SECRET)).toBe(true);
    expect(safeEqual(SECRET, SECRET.slice(0, -1) + "0")).toBe(false);
    expect(safeEqual(SECRET, SECRET + "\n")).toBe(false);
    expect(safeEqual("", SECRET)).toBe(false);
  });
});

describe("verifyCronSecret / verifyWebhookSecret", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("accepts a cron secret stored with a trailing newline", async () => {
    vi.stubEnv("CRON_SECRET", `${SECRET}\n`);
    const { verifyCronSecret } = await import("@/lib/agents/base");
    expect(verifyCronSecret(req({ authorization: `Bearer ${SECRET}` }))).toBe(true);
    expect(verifyCronSecret(req({ authorization: `Bearer wrong` }))).toBe(false);
    expect(verifyCronSecret(req({}))).toBe(false);
  });

  it("fails closed when CRON_SECRET is unset", async () => {
    vi.stubEnv("CRON_SECRET", "");
    const { verifyCronSecret } = await import("@/lib/agents/base");
    expect(verifyCronSecret(req({ authorization: "Bearer " }))).toBe(false);
  });

  it("accepts a webhook secret stored with a trailing newline", async () => {
    vi.stubEnv("AGENT_WEBHOOK_SECRET", `${SECRET}\n`);
    const { verifyWebhookSecret } = await import("@/lib/agents/base");
    expect(verifyWebhookSecret(req({ "x-webhook-secret": SECRET }))).toBe(true);
    expect(verifyWebhookSecret(req({ "x-webhook-secret": "nope" }))).toBe(false);
  });

  it("fails closed when AGENT_WEBHOOK_SECRET is unset (no hard-coded fallback)", async () => {
    vi.stubEnv("AGENT_WEBHOOK_SECRET", "");
    const { verifyWebhookSecret } = await import("@/lib/agents/base");
    expect(verifyWebhookSecret(req({ "x-webhook-secret": "" }))).toBe(false);
    expect(verifyWebhookSecret(req({ "x-webhook-secret": "anything" }))).toBe(false);
  });
});

describe("verifyPandaDocWebhook", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("verifies the HMAC with a trimmed key and rejects others", async () => {
    const { createHmac } = await import("crypto");
    vi.stubEnv("PANDADOC_WEBHOOK_KEY", `${SECRET}\n`);
    const { verifyPandaDocWebhook } = await import("@/lib/agents/outreach/esign");
    const payload = JSON.stringify({ event: "document_state_changed" });
    const good = createHmac("sha256", SECRET).update(payload).digest("hex");
    expect(verifyPandaDocWebhook(payload, good)).toBe(true);
    expect(verifyPandaDocWebhook(payload, "0".repeat(64))).toBe(false);
  });

  it("fails closed without a key", async () => {
    vi.stubEnv("PANDADOC_WEBHOOK_KEY", "");
    const { verifyPandaDocWebhook } = await import("@/lib/agents/outreach/esign");
    expect(verifyPandaDocWebhook("{}", "")).toBe(false);
  });
});

import { describe, expect, it } from "vitest";
import { signAssessmentSession, verifyAssessmentSession } from "@/lib/assessment-session";

const KEY = "test-hmac-key";

describe("assessment session cookie", () => {
  it("round-trips a session id", () => {
    const cookie = signAssessmentSession("abc-123", KEY);
    expect(cookie).toMatch(/^abc-123\.[0-9a-f]{16}$/);
    expect(verifyAssessmentSession(cookie, KEY)).toBe("abc-123");
  });

  it("rejects tampered, unsigned or foreign-key cookies", () => {
    const cookie = signAssessmentSession("abc-123", KEY);
    expect(verifyAssessmentSession(cookie.replace("abc", "abd"), KEY)).toBeNull();
    expect(verifyAssessmentSession("abc-123", KEY)).toBeNull();
    expect(verifyAssessmentSession("abc-123.", KEY)).toBeNull();
    expect(verifyAssessmentSession(cookie, "other-key")).toBeNull();
  });
});

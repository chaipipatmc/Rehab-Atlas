import { describe, expect, it } from "vitest";
import { sessionIdFromCookie, signAssessmentSession, verifyAssessmentSession } from "@/lib/assessment-session";

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

describe("sessionIdFromCookie (used by /api/leads)", () => {
  it("returns the bare id for a correctly signed cookie", () => {
    const cookie = signAssessmentSession("11111111-2222-3333-4444-555555555555", KEY);
    expect(sessionIdFromCookie(cookie, KEY)).toBe("11111111-2222-3333-4444-555555555555");
  });

  it("does not link forged, unsigned or missing cookies", () => {
    const forged = "11111111-2222-3333-4444-555555555555.0000000000000000";
    expect(sessionIdFromCookie(forged, KEY)).toBeNull();
    expect(sessionIdFromCookie("11111111-2222-3333-4444-555555555555", KEY)).toBeNull();
    expect(sessionIdFromCookie(undefined, KEY)).toBeNull();
    expect(sessionIdFromCookie("", KEY)).toBeNull();
  });

  it("does not link anything when the HMAC key is missing", () => {
    const cookie = signAssessmentSession("abc", KEY);
    expect(sessionIdFromCookie(cookie, undefined)).toBeNull();
  });
});
